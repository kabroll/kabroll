// Webhook Stripe : confirme (ou annule) les achats de pixels.
//
// À configurer dans le Dashboard Stripe :
//   Endpoint : https://VOTRE-DOMAINE/api/webhook
//   Événements : checkout.session.completed, checkout.session.expired
//
// En local : `stripe listen --forward-to localhost:3000/api/webhook`

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { PIXELS_COLLECTION, USERS_COLLECTION } from "@/lib/constants";

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

  // Stripe exige le corps BRUT pour vérifier la signature.
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
        const blockId = session.metadata?.blockId;
        const uid = session.metadata?.uid;
        const pixels = Number(session.metadata?.pixels || 0);
        const amount = (session.amount_total ?? 0) / 100;

        if (blockId) {
          // Active le bloc.
          await db.collection(PIXELS_COLLECTION).doc(blockId).set(
            {
              status: "active",
              paidAt: Date.now(),
              expiresAt: FieldValue.delete(),
            },
            { merge: true },
          );

          // Met à jour l'agrégat utilisateur (pour le classement / profil).
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
        break;
      }

      case "checkout.session.expired": {
        // Libère la réservation non payée.
        const session = event.data.object as Stripe.Checkout.Session;
        const blockId = session.metadata?.blockId;
        if (blockId) {
          const ref = db.collection(PIXELS_COLLECTION).doc(blockId);
          const doc = await ref.get();
          if (doc.exists && doc.data()?.status === "pending") {
            await ref.delete();
          }
        }
        break;
      }

      default:
        // Événements non gérés : on accuse simplement réception.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Erreur traitement webhook:", e);
    return NextResponse.json({ error: "Erreur serveur webhook." }, { status: 500 });
  }
}
