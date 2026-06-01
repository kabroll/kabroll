// Crée une session Stripe Checkout pour l'achat d'un bloc de pixels.
//
// Étapes :
//  1. Vérifie le jeton Firebase de l'utilisateur (sécurité).
//  2. Valide la sélection (bornes, dimensions).
//  3. Vérifie qu'aucun bloc actif/réservé ne chevauche la zone.
//  4. Crée une réservation "pending" dans Firestore.
//  5. Crée la session Stripe et renvoie l'URL de paiement.

import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getAdminDb, getAdminAuth, isAdminConfigured } from "@/lib/firebaseAdmin";
import { rectsOverlap } from "@/lib/geometry";
import {
  GRID_SIZE,
  MAX_BLOCK_SIDE,
  MIN_BLOCK_SIDE,
  PIXELS_COLLECTION,
  PRICE_PER_PIXEL_CENTS,
  RESERVATION_TTL_MS,
  isClosed,
} from "@/lib/constants";
import { fulfillPurchaseGroup, fulfillResale, fulfillResaleGroup } from "@/lib/fulfillment";
import type { PixelBlock, Selection } from "@/lib/types";

// Mode test : si Stripe n'est pas configuré, on simule un paiement réussi
// (toutes les écritures Firestore sont effectuées, sans page de paiement).
const SIMULATE = !isStripeConfigured();

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

    // L'œuvre est figée après la date de clôture : plus aucun achat/rachat.
    if (isClosed()) {
      return NextResponse.json(
        { error: "L'œuvre est clôturée : le canvas est figé." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { idToken, rects, groupLabel, link, message, ownerName } = body;

    // 1) Auth
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getAdminDb();
    const now = Date.now();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    // ===== RACHAT (revente) ==================================================
    if (body.type === "resale") {
      const { blockId } = body;
      if (!blockId || typeof blockId !== "string") {
        return NextResponse.json({ error: "Bloc invalide." }, { status: 400 });
      }
      const ref = db.collection(PIXELS_COLLECTION).doc(blockId);
      const bSnap = await ref.get();
      if (!bSnap.exists) {
        return NextResponse.json({ error: "Bloc introuvable." }, { status: 404 });
      }
      const block = bSnap.data() as PixelBlock & {
        salePendingUid?: string;
        salePendingUntil?: number;
      };

      if (block.status !== "active" || !block.forSale || !block.salePrice) {
        return NextResponse.json({ error: "Ce bloc n'est pas à vendre." }, { status: 409 });
      }
      if (block.ownerId === uid) {
        return NextResponse.json({ error: "Vous possédez déjà ce bloc." }, { status: 400 });
      }
      // Vente privée : réservée à un acheteur précis (offre acceptée).
      if (block.reservedForUid && block.reservedForUid !== uid) {
        return NextResponse.json(
          { error: "Ce bloc est réservé à un autre acheteur." },
          { status: 403 },
        );
      }
      // Verrou anti double-rachat pendant un paiement en cours.
      if (
        block.salePendingUid &&
        block.salePendingUid !== uid &&
        block.salePendingUntil &&
        block.salePendingUntil > now
      ) {
        return NextResponse.json(
          { error: "Un rachat est déjà en cours sur ce bloc." },
          { status: 409 },
        );
      }

      // Le bloc fait-il partie d'une création vendue en entier ?
      const isGroup = Boolean(block.saleGroupId);
      let groupDocs = [{ id: blockId, ref, data: block }];
      if (isGroup) {
        const grp = await db
          .collection(PIXELS_COLLECTION)
          .where("saleGroupId", "==", block.saleGroupId)
          .get();
        groupDocs = grp.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() as typeof block }));
      }

      const resalePixels = groupDocs.reduce((acc, d) => acc + d.data.w * d.data.h, 0);
      const totalPrice = groupDocs.reduce((acc, d) => acc + (d.data.salePrice || 0), 0);
      const amountCents = Math.round(totalPrice * 100);

      // --- Mode test : on finalise le rachat immédiatement ---
      if (SIMULATE) {
        if (isGroup) {
          await fulfillResaleGroup({
            blockIds: groupDocs.map((d) => d.id),
            buyerUid: uid,
            sellerUid: block.ownerId || "",
            pixels: resalePixels,
            amount: totalPrice,
          });
        } else {
          await fulfillResale({
            blockId,
            buyerUid: uid,
            sellerUid: block.ownerId || "",
            pixels: resalePixels,
            amount: totalPrice,
          });
        }
        return NextResponse.json({ url: `${siteUrl}/success?simulated=1`, simulated: true });
      }

      const stripe = getStripe();
      const resaleSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amountCents,
              product_data: {
                name: isGroup
                  ? `Rachat d'une création unmillion.fr (${groupDocs.length} blocs)`
                  : `Rachat de pixels unmillion.fr (${block.w}×${block.h})`,
                description: `${resalePixels} pixels`,
              },
            },
          },
        ],
        metadata: {
          type: "resale",
          ...(isGroup
            ? { saleGroupId: String(block.saleGroupId) }
            : { blockId }),
          buyerUid: uid,
          sellerUid: block.ownerId || "",
          amountCents: String(amountCents),
          pixels: String(resalePixels),
        },
        success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cancel`,
      });

      const lockBatch = db.batch();
      for (const d of groupDocs) {
        lockBatch.update(d.ref, {
          salePendingUid: uid,
          salePendingUntil: now + RESERVATION_TTL_MS,
          salePendingSessionId: resaleSession.id,
        });
      }
      await lockBatch.commit();

      return NextResponse.json({ url: resaleSession.url });
    }

    // ===== ACHAT INITIAL =====================================================
    // 2) Validation des rectangles (1 ou plusieurs)
    if (!Array.isArray(rects) || rects.length === 0) {
      return NextResponse.json({ error: "Sélection vide." }, { status: 400 });
    }
    if (rects.length > 4096) {
      return NextResponse.json({ error: "Sélection trop fragmentée." }, { status: 400 });
    }
    // Chaque rect porte son propre fill/couleur/imageUrl.
    type RectIn = Selection & { fill: string; color?: string; imageUrl?: string };
    for (const r of rects as RectIn[]) {
      if (!isValidSelection(r)) {
        return NextResponse.json({ error: "Sélection invalide." }, { status: 400 });
      }
      if (
        r.x < 0 || r.y < 0 ||
        r.w < MIN_BLOCK_SIDE || r.h < MIN_BLOCK_SIDE ||
        r.w > MAX_BLOCK_SIDE || r.h > MAX_BLOCK_SIDE ||
        r.x + r.w > GRID_SIZE || r.y + r.h > GRID_SIZE
      ) {
        return NextResponse.json({ error: "Sélection hors limites." }, { status: 400 });
      }
      if (r.fill !== "color" && r.fill !== "image") {
        return NextResponse.json({ error: "Type de contenu invalide." }, { status: 400 });
      }
      if (r.fill === "image" && !r.imageUrl) {
        return NextResponse.json({ error: "Image manquante." }, { status: 400 });
      }
    }
    // Une image occupe un seul rectangle.
    const hasImage = (rects as RectIn[]).some((r) => r.fill === "image");
    if (hasImage && rects.length !== 1) {
      return NextResponse.json({ error: "Une image occupe un seul rectangle." }, { status: 400 });
    }

    // 3) Vérification des chevauchements (actifs + réservations non expirées)
    const snap = await db
      .collection(PIXELS_COLLECTION)
      .where("status", "in", ["active", "pending"])
      .get();

    const existing: PixelBlock[] = [];
    for (const doc of snap.docs) {
      const b = doc.data() as PixelBlock;
      if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
      existing.push(b);
    }
    for (const r of rects as RectIn[]) {
      if (existing.some((b) => rectsOverlap(r, b))) {
        return NextResponse.json(
          { error: "Une partie de la sélection est déjà occupée ou réservée." },
          { status: 409 },
        );
      }
    }

    const totalPixels = (rects as RectIn[]).reduce((acc, r) => acc + r.w * r.h, 0);
    const amountCents = totalPixels * PRICE_PER_PIXEL_CENTS;
    // Identifiant de groupe : relie tous les blocs d'un même achat (une création).
    const purchaseId = db.collection(PIXELS_COLLECTION).doc().id;

    // 4) Réservation "pending" — un bloc par rectangle, avec sa couleur.
    const blockIds: string[] = [];
    for (const r of rects as RectIn[]) {
      const blockRef = db.collection(PIXELS_COLLECTION).doc();
      const blockData: Record<string, unknown> = {
        x: r.x, y: r.y, w: r.w, h: r.h,
        fill: r.fill,
        ...(r.fill === "color" ? { color: r.color || "#111111" } : {}),
        ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        ...(link ? { link } : {}),
        ...(message ? { message } : {}),
        ...(groupLabel ? { groupLabel } : {}),
        ownerId: uid,
        ownerName: ownerName || "Anonyme",
        status: "pending",
        createdAt: now,
        expiresAt: now + RESERVATION_TTL_MS,
        purchaseId,
      };
      await blockRef.set(blockData);
      blockIds.push(blockRef.id);
    }

    // --- Mode test : on finalise l'achat immédiatement ---
    if (SIMULATE) {
      await fulfillPurchaseGroup({
        blockIds,
        uid,
        pixels: totalPixels,
        amount: amountCents / 100,
      });
      return NextResponse.json({ url: `${siteUrl}/success?simulated=1`, simulated: true });
    }

    // 5) Session Stripe Checkout
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: totalPixels,
          price_data: {
            currency: "eur",
            unit_amount: PRICE_PER_PIXEL_CENTS,
            product_data: {
              name: `Pixels unmillion.fr`,
              description: `${totalPixels} pixels · ${rects.length} zone${rects.length > 1 ? "s" : ""}`,
            },
          },
        },
      ],
      metadata: {
        purchaseId,
        uid,
        pixels: String(totalPixels),
        amountCents: String(amountCents),
      },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("create-checkout error:", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
