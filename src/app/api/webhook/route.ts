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
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { PIXELS_COLLECTION } from "@/lib/constants";
import { fulfillPurchase, fulfillResale } from "@/lib/fulfillment";

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
        const m = session.metadata ?? {};
        const amount = (session.amount_total ?? 0) / 100;
        if (m.type === "resale") {
          await fulfillResale({
            blockId: m.blockId || "",
            buyerUid: m.buyerUid || "",
            sellerUid: m.sellerUid || "",
            pixels: Number(m.pixels || 0),
            amount,
          });
        } else {
          await fulfillPurchase({
            blockId: m.blockId || "",
            uid: m.uid || "",
            pixels: Number(m.pixels || 0),
            amount,
          });
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
