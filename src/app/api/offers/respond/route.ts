// Réponse à une offre : le propriétaire accepte/refuse, l'acheteur annule.
//
// Body : { idToken, offerId, action: "accept" | "reject" | "cancel" }
//
// "accept" réserve le bloc en vente privée au prix de l'offre, pour
// l'acheteur uniquement, qui finalise ensuite le paiement (resale checkout).

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireUser, ApiError } from "@/lib/serverAuth";
import { OFFERS_COLLECTION, PIXELS_COLLECTION } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { idToken, offerId, action } = await req.json();
    const { uid } = await requireUser(idToken);

    if (!offerId || typeof offerId !== "string") {
      throw new ApiError("Offre invalide.", 400);
    }

    const db = getAdminDb();
    const offerRef = db.collection(OFFERS_COLLECTION).doc(offerId);
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists) throw new ApiError("Offre introuvable.", 404);

    const offer = offerSnap.data()!;
    if (offer.status !== "pending") throw new ApiError("Offre déjà traitée.", 409);

    const now = Date.now();

    if (action === "cancel") {
      if (offer.fromUid !== uid) throw new ApiError("Action non autorisée.", 403);
      await offerRef.update({ status: "cancelled", updatedAt: now });
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      if (offer.toUid !== uid) throw new ApiError("Action non autorisée.", 403);
      await offerRef.update({ status: "rejected", updatedAt: now });
      return NextResponse.json({ ok: true });
    }

    if (action === "accept") {
      if (offer.toUid !== uid) throw new ApiError("Action non autorisée.", 403);

      const blockRef = db.collection(PIXELS_COLLECTION).doc(offer.blockId);
      const blockSnap = await blockRef.get();
      if (!blockSnap.exists) throw new ApiError("Bloc introuvable.", 404);
      const block = blockSnap.data()!;
      if (block.ownerId !== uid) throw new ApiError("Vous n'êtes plus propriétaire.", 403);

      // Vente privée réservée à l'acheteur, au prix de l'offre.
      await blockRef.update({
        forSale: true,
        salePrice: offer.amount,
        reservedForUid: offer.fromUid,
        reservedForName: offer.fromName,
      });
      await offerRef.update({ status: "accepted", updatedAt: now });
      return NextResponse.json({ ok: true });
    }

    throw new ApiError("Action inconnue.", 400);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    if (status === 500) console.error("offers/respond error:", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
