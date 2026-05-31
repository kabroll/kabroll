// Création d'une offre de rachat sur un bloc (par un acheteur potentiel).
//
// Body : { idToken, blockId, amount }

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireUser, ApiError } from "@/lib/serverAuth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import {
  MIN_SALE_PRICE_EUR,
  OFFERS_COLLECTION,
  PIXELS_COLLECTION,
} from "@/lib/constants";
import type { Offer } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { idToken, blockId, amount } = await req.json();
    const { uid } = await requireUser(idToken);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_SALE_PRICE_EUR) {
      throw new ApiError(`Montant minimum : ${MIN_SALE_PRICE_EUR} €.`, 400);
    }
    if (!blockId || typeof blockId !== "string") {
      throw new ApiError("Bloc invalide.", 400);
    }

    const db = getAdminDb();
    const ref = db.collection(PIXELS_COLLECTION).doc(blockId);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError("Bloc introuvable.", 404);

    const block = snap.data()!;
    if (block.status !== "active") throw new ApiError("Bloc non disponible.", 409);
    if (block.ownerId === uid) throw new ApiError("Vous possédez déjà ce bloc.", 400);

    // Nom de l'acheteur (depuis le compte Firebase).
    let fromName = "Anonyme";
    try {
      const u = await getAdminAuth().getUser(uid);
      fromName = u.displayName || u.email || "Anonyme";
    } catch {
      /* ignore */
    }

    const offer: Omit<Offer, "id"> = {
      blockId,
      fromUid: uid,
      fromName,
      toUid: block.ownerId,
      amount: Math.round(amt * 100) / 100,
      status: "pending",
      createdAt: Date.now(),
      blockSnapshot: { x: block.x, y: block.y, w: block.w, h: block.h },
    };

    const docRef = await db.collection(OFFERS_COLLECTION).add(offer);
    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    if (status === 500) console.error("offers error:", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
