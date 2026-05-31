// Mise en vente / retrait / changement de prix d'un bloc par son propriétaire.
//
// Body : { idToken, blockId, action: "list" | "unlist", price? }

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireUser, ApiError } from "@/lib/serverAuth";
import { FieldValue } from "firebase-admin/firestore";
import { MIN_SALE_PRICE_EUR, PIXELS_COLLECTION } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { idToken, blockId, action, price } = await req.json();
    const { uid } = await requireUser(idToken);

    if (!blockId || typeof blockId !== "string") {
      throw new ApiError("Bloc invalide.", 400);
    }

    const db = getAdminDb();
    const ref = db.collection(PIXELS_COLLECTION).doc(blockId);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError("Bloc introuvable.", 404);

    const block = snap.data()!;
    if (block.status !== "active") throw new ApiError("Bloc non disponible.", 409);
    if (block.ownerId !== uid) throw new ApiError("Vous n'êtes pas le propriétaire.", 403);

    if (action === "list") {
      const p = Number(price);
      if (!Number.isFinite(p) || p < MIN_SALE_PRICE_EUR) {
        throw new ApiError(`Prix minimum : ${MIN_SALE_PRICE_EUR} €.`, 400);
      }
      await ref.update({
        forSale: true,
        salePrice: Math.round(p * 100) / 100,
        // Une mise en vente publique annule une éventuelle réservation privée.
        reservedForUid: FieldValue.delete(),
        reservedForName: FieldValue.delete(),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "unlist") {
      await ref.update({
        forSale: false,
        salePrice: FieldValue.delete(),
        reservedForUid: FieldValue.delete(),
        reservedForName: FieldValue.delete(),
      });
      return NextResponse.json({ ok: true });
    }

    throw new ApiError("Action inconnue.", 400);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    if (status === 500) console.error("listing error:", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
