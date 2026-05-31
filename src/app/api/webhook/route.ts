// Webhook Stripe : confirme (ou annule) les achats et rachats de pixels.
//
// À configurer dans le Dashboard Stripe :
//   Endpoint : https://VOTRE-DOMAINE/api/webhook
//   Événements : checkout.session.completed, checkout.session.expired
//
// En local : `stripe listen --forward-to localhost:3000/api/webhook`
//
// NOTE PAIEMENT VENDEUR : pour reverser l'argent au vendeur lors d'un rachat,
// il faut activer Stripe Connect (comptes connectés + transfers). Ici, le
// transfert de PROPRIÉTÉ est géré ; le versement au vendeur est à brancher
// via Connect (voir README). Le montant est journalisé pour ce versement.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  OFFERS_COLLECTION,
  PIXELS_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    console.error("Signature webhook invalide:", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const db = getAdminDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "resale") {
          await handleResaleCompleted(db, session);
        } else {
          await handlePurchaseCompleted(db, session);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "resale") {
          // Libère le verrou de rachat.
          const blockId = session.metadata?.blockId;
          if (blockId) {
            await db.collection(PIXELS_COLLECTION).doc(blockId).set(
              {
                salePendingUid: FieldValue.delete(),
                salePendingUntil: FieldValue.delete(),
                salePendingSessionId: FieldValue.delete(),
              },
              { merge: true },
            );
          }
        } else {
          // Supprime la réservation d'achat initial non payée.
          const blockId = session.metadata?.blockId;
          if (blockId) {
            const ref = db.collection(PIXELS_COLLECTION).doc(blockId);
            const doc = await ref.get();
            if (doc.exists && doc.data()?.status === "pending") {
              await ref.delete();
            }
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Erreur traitement webhook:", e);
    return NextResponse.json({ error: "Erreur serveur webhook." }, { status: 500 });
  }
}

// --- Achat initial : active le bloc + agrégats ------------------------------
async function handlePurchaseCompleted(
  db: FirebaseFirestore.Firestore,
  session: Stripe.Checkout.Session,
) {
  const blockId = session.metadata?.blockId;
  const uid = session.metadata?.uid;
  const pixels = Number(session.metadata?.pixels || 0);
  const amount = (session.amount_total ?? 0) / 100;
  if (!blockId) return;

  await db.collection(PIXELS_COLLECTION).doc(blockId).set(
    { status: "active", paidAt: Date.now(), expiresAt: FieldValue.delete() },
    { merge: true },
  );

  if (uid) {
    await db.collection(USERS_COLLECTION).doc(uid).set(
      {
        totalPixels: FieldValue.increment(pixels),
        totalSpent: FieldValue.increment(amount),
        totalBlocks: FieldValue.increment(1),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}

// --- Rachat : transfert de propriété + agrégats + offres -------------------
async function handleResaleCompleted(
  db: FirebaseFirestore.Firestore,
  session: Stripe.Checkout.Session,
) {
  const blockId = session.metadata?.blockId;
  const buyerUid = session.metadata?.buyerUid;
  const sellerUid = session.metadata?.sellerUid;
  const pixels = Number(session.metadata?.pixels || 0);
  const amount = (session.amount_total ?? 0) / 100;
  if (!blockId || !buyerUid) return;

  // Nom de l'acheteur.
  let buyerName = "Anonyme";
  try {
    const u = await getAdminAuth().getUser(buyerUid);
    buyerName = u.displayName || u.email || "Anonyme";
  } catch {
    /* ignore */
  }

  const blockRef = db.collection(PIXELS_COLLECTION).doc(blockId);
  const snap = await blockRef.get();
  if (!snap.exists) return;
  const block = snap.data()!;

  // Idempotence : si déjà transféré à l'acheteur, on s'arrête.
  if (block.ownerId === buyerUid && !block.forSale) return;

  await blockRef.set(
    {
      ownerId: buyerUid,
      ownerName: buyerName,
      forSale: false,
      salePrice: FieldValue.delete(),
      reservedForUid: FieldValue.delete(),
      reservedForName: FieldValue.delete(),
      salePendingUid: FieldValue.delete(),
      salePendingUntil: FieldValue.delete(),
      salePendingSessionId: FieldValue.delete(),
      resaleCount: FieldValue.increment(1),
      lastSoldAt: Date.now(),
    },
    { merge: true },
  );

  // Agrégats : l'acheteur gagne les pixels et dépense ; le vendeur les perd.
  await db.collection(USERS_COLLECTION).doc(buyerUid).set(
    {
      totalPixels: FieldValue.increment(pixels),
      totalSpent: FieldValue.increment(amount),
      totalBlocks: FieldValue.increment(1),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  if (sellerUid) {
    await db.collection(USERS_COLLECTION).doc(sellerUid).set(
      {
        totalPixels: FieldValue.increment(-pixels),
        totalBlocks: FieldValue.increment(-1),
        // Montant à reverser au vendeur (à traiter via Stripe Connect).
        pendingPayout: FieldValue.increment(amount),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }

  // Clôture les offres liées à ce bloc.
  const offers = await db
    .collection(OFFERS_COLLECTION)
    .where("blockId", "==", blockId)
    .where("status", "in", ["pending", "accepted"])
    .get();
  const batch = db.batch();
  offers.forEach((o) => {
    const data = o.data();
    const newStatus =
      data.fromUid === buyerUid ? "completed" : "rejected";
    batch.update(o.ref, { status: newStatus, updatedAt: Date.now() });
  });
  await batch.commit();
}
