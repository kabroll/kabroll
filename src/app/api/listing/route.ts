// Mise en vente / retrait d'un bloc OU d'un groupe (création entière).
//
// Body (bloc unique) : { idToken, blockId, action: "list"|"unlist", price? }
// Body (groupe)      : { idToken, purchaseId, scope: "group",
//                        action: "list"|"unlist", price? }
//
// Pour un groupe mis en vente : on répartit le prix total proportionnellement
// à l'aire de chaque bloc, et on marque tous les blocs avec saleGroupId =
// purchaseId. Le rachat d'un bloc du groupe entraînera l'achat de tout le
// groupe (géré dans create-checkout).

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireUser, ApiError } from "@/lib/serverAuth";
import { FieldValue } from "firebase-admin/firestore";
import { MIN_SALE_PRICE_EUR, PIXELS_COLLECTION } from "@/lib/constants";
import type { PixelBlock } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { idToken, blockId, purchaseId, scope, action, price } = await req.json();
    const { uid } = await requireUser(idToken);
    const db = getAdminDb();

    // ===== Opération sur un GROUPE =====
    if (scope === "group") {
      if (!purchaseId || typeof purchaseId !== "string") {
        throw new ApiError("Groupe invalide.", 400);
      }
      const grpSnap = await db
        .collection(PIXELS_COLLECTION)
        .where("purchaseId", "==", purchaseId)
        .get();
      if (grpSnap.empty) throw new ApiError("Groupe introuvable.", 404);

      const docs = grpSnap.docs;
      for (const d of docs) {
        const b = d.data() as PixelBlock;
        if (b.ownerId !== uid) throw new ApiError("Vous n'êtes pas le propriétaire.", 403);
        if (b.status !== "active") throw new ApiError("Groupe non disponible.", 409);
      }

      if (action === "list") {
        const p = Number(price);
        if (!Number.isFinite(p) || p < MIN_SALE_PRICE_EUR) {
          throw new ApiError(`Prix minimum : ${MIN_SALE_PRICE_EUR} €.`, 400);
        }
        const totalPixels = docs.reduce((acc, d) => {
          const b = d.data() as PixelBlock;
          return acc + b.w * b.h;
        }, 0);
        // Répartit le prix au prorata de l'aire (le dernier reçoit le reste).
        const batch = db.batch();
        let allocated = 0;
        docs.forEach((d, i) => {
          const b = d.data() as PixelBlock;
          const share =
            i === docs.length - 1
              ? Math.round((p - allocated) * 100) / 100
              : Math.round((p * (b.w * b.h)) / totalPixels * 100) / 100;
          allocated += share;
          batch.update(d.ref, {
            forSale: true,
            salePrice: share,
            saleGroupId: purchaseId,
            reservedForUid: FieldValue.delete(),
            reservedForName: FieldValue.delete(),
          });
        });
        await batch.commit();
        return NextResponse.json({ ok: true });
      }

      if (action === "unlist") {
        const batch = db.batch();
        docs.forEach((d) =>
          batch.update(d.ref, {
            forSale: false,
            salePrice: FieldValue.delete(),
            saleGroupId: FieldValue.delete(),
            reservedForUid: FieldValue.delete(),
            reservedForName: FieldValue.delete(),
          }),
        );
        await batch.commit();
        return NextResponse.json({ ok: true });
      }

      throw new ApiError("Action inconnue.", 400);
    }

    // ===== Opération sur un BLOC unique =====
    if (!blockId || typeof blockId !== "string") {
      throw new ApiError("Bloc invalide.", 400);
    }
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
        // Vente d'une pièce seule : on retire l'éventuel marquage de groupe.
        saleGroupId: FieldValue.delete(),
        reservedForUid: FieldValue.delete(),
        reservedForName: FieldValue.delete(),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "unlist") {
      await ref.update({
        forSale: false,
        salePrice: FieldValue.delete(),
        saleGroupId: FieldValue.delete(),
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
