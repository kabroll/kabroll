// Crée une session Stripe Checkout pour l'achat d'un bloc de pixels.
//
// Étapes :
//  1. Vérifie le jeton Firebase de l'utilisateur (sécurité).
//  2. Valide la sélection (bornes, dimensions).
//  3. Vérifie qu'aucun bloc actif/réservé ne chevauche la zone.
//  4. Crée une réservation "pending" dans Firestore.
//  5. Crée la session Stripe et renvoie l'URL de paiement.

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb, getAdminAuth, isAdminConfigured } from "@/lib/firebaseAdmin";
import { rectsOverlap } from "@/lib/geometry";
import {
  GRID_SIZE,
  MAX_BLOCK_SIDE,
  MIN_BLOCK_SIDE,
  PIXELS_COLLECTION,
  PRICE_PER_PIXEL_CENTS,
  RESERVATION_TTL_MS,
} from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidSelection(s: unknown): s is Selection {
  if (!s || typeof s !== "object") return false;
  const { x, y, w, h } = s as Record<string, unknown>;
  return [x, y, w, h].every((n) => typeof n === "number" && Number.isInteger(n));
}

export async function POST(req: Request) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: "Backend non configuré (Firebase Admin manquant)." },
        { status: 503 },
      );
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Backend non configuré (Stripe manquant)." },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { idToken, selection, fill, color, imageUrl, link, message, ownerName } = body;

    // 1) Auth
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2) Validation de la sélection
    if (!isValidSelection(selection)) {
      return NextResponse.json({ error: "Sélection invalide." }, { status: 400 });
    }
    const { x, y, w, h } = selection;
    if (
      x < 0 || y < 0 ||
      w < MIN_BLOCK_SIDE || h < MIN_BLOCK_SIDE ||
      w > MAX_BLOCK_SIDE || h > MAX_BLOCK_SIDE ||
      x + w > GRID_SIZE || y + h > GRID_SIZE
    ) {
      return NextResponse.json({ error: "Sélection hors limites." }, { status: 400 });
    }
    if (fill !== "color" && fill !== "image") {
      return NextResponse.json({ error: "Type de contenu invalide." }, { status: 400 });
    }
    if (fill === "image" && !imageUrl) {
      return NextResponse.json({ error: "Image manquante." }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Date.now();

    // 3) Vérification des chevauchements (actifs + réservations non expirées)
    const snap = await db
      .collection(PIXELS_COLLECTION)
      .where("status", "in", ["active", "pending"])
      .get();

    for (const doc of snap.docs) {
      const b = doc.data() as PixelBlock;
      if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
      if (rectsOverlap(selection, b)) {
        return NextResponse.json(
          { error: "Cette zone est déjà occupée ou réservée." },
          { status: 409 },
        );
      }
    }

    const pixels = w * h;
    const amountCents = pixels * PRICE_PER_PIXEL_CENTS;

    // 4) Réservation "pending"
    const blockRef = db.collection(PIXELS_COLLECTION).doc();
    const blockData: Omit<PixelBlock, "id"> = {
      x, y, w, h,
      fill,
      ...(fill === "color" ? { color: color || "#111111" } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(link ? { link } : {}),
      ...(message ? { message } : {}),
      ownerId: uid,
      ownerName: ownerName || "Anonyme",
      status: "pending",
      createdAt: now,
      expiresAt: now + RESERVATION_TTL_MS,
    };
    await blockRef.set(blockData);

    // 5) Session Stripe Checkout
    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: pixels,
          price_data: {
            currency: "eur",
            unit_amount: PRICE_PER_PIXEL_CENTS,
            product_data: {
              name: `Pixels unmillion.fr (${w}×${h})`,
              description: `Bloc de ${pixels} pixels en (${x}, ${y})`,
            },
          },
        },
      ],
      metadata: { blockId: blockRef.id, uid, pixels: String(pixels), amountCents: String(amountCents) },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel`,
    });

    // On mémorise l'id de session pour le nettoyage éventuel.
    await blockRef.update({ stripeSessionId: session.id });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("create-checkout error:", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
