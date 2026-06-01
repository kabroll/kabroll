// Logique de FINALISATION d'un achat / rachat, partagée entre :
//   - le webhook Stripe (paiement réel confirmé)
//   - le mode "paiement simulé" (tests sans Stripe)
//
// Ainsi, le flux de données (création de bloc, agrégats, transfert de
// propriété, clôture des offres) est strictement identique dans les deux cas.

import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  OFFERS_COLLECTION,
  PIXELS_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/constants";

interface PurchaseParams {
  blockId: string;
  uid: string;
  pixels: number;
  /** Montant payé, en euros. */
  amount: number;
}

interface PurchaseGroupParams {
  /** Tous les blocs d'un même achat (forme libre décomposée en rectangles). */
  blockIds: string[];
  uid: string;
  /** Total des pixels de l'achat. */
  pixels: number;
  /** Montant payé, en euros. */
  amount: number;
}

interface ResaleParams {
  blockId: string;
  buyerUid: string;
  sellerUid: string;
  pixels: number;
  amount: number;
}

/** Active un bloc "pending" après paiement + met à jour les agrégats. */
export async function fulfillPurchase(
  params: PurchaseParams,
  db: Firestore = getAdminDb(),
): Promise<void> {
  const { blockId, uid, pixels, amount } = params;
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

/**
 * Active tous les blocs d'un achat (un par rectangle) + un seul incrément
 * d'agrégat utilisateur (totalBlocks = nombre de rectangles).
 */
export async function fulfillPurchaseGroup(
  params: PurchaseGroupParams,
  db: Firestore = getAdminDb(),
): Promise<void> {
  const { blockIds, uid, pixels, amount } = params;
  if (!blockIds || blockIds.length === 0) return;

  const batch = db.batch();
  for (const id of blockIds) {
    batch.set(
      db.collection(PIXELS_COLLECTION).doc(id),
      { status: "active", paidAt: Date.now(), expiresAt: FieldValue.delete() },
      { merge: true },
    );
  }
  await batch.commit();

  if (uid) {
    await db.collection(USERS_COLLECTION).doc(uid).set(
      {
        totalPixels: FieldValue.increment(pixels),
        totalSpent: FieldValue.increment(amount),
        totalBlocks: FieldValue.increment(blockIds.length),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}

/** Transfère la propriété d'un bloc revendu + agrégats + clôture des offres. */
export async function fulfillResale(
  params: ResaleParams,
  db: Firestore = getAdminDb(),
): Promise<void> {
  const { blockId, buyerUid, sellerUid, pixels, amount } = params;
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
    const newStatus = data.fromUid === buyerUid ? "completed" : "rejected";
    batch.update(o.ref, { status: newStatus, updatedAt: Date.now() });
  });
  await batch.commit();
}

/** Rachat d'une création entière (plusieurs blocs partageant un saleGroupId). */
export async function fulfillResaleGroup(
  params: { blockIds: string[]; buyerUid: string; sellerUid: string; pixels: number; amount: number },
  db: Firestore = getAdminDb(),
): Promise<void> {
  const { blockIds, buyerUid, sellerUid, pixels, amount } = params;
  if (!blockIds.length || !buyerUid) return;

  let buyerName = "Anonyme";
  try {
    const u = await getAdminAuth().getUser(buyerUid);
    buyerName = u.displayName || u.email || "Anonyme";
  } catch {
    /* ignore */
  }

  // Transfère tous les blocs du groupe.
  const batch = db.batch();
  for (const id of blockIds) {
    batch.set(
      db.collection(PIXELS_COLLECTION).doc(id),
      {
        ownerId: buyerUid,
        ownerName: buyerName,
        forSale: false,
        salePrice: FieldValue.delete(),
        saleGroupId: FieldValue.delete(),
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
  }
  await batch.commit();

  await db.collection(USERS_COLLECTION).doc(buyerUid).set(
    {
      totalPixels: FieldValue.increment(pixels),
      totalSpent: FieldValue.increment(amount),
      totalBlocks: FieldValue.increment(blockIds.length),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  if (sellerUid) {
    await db.collection(USERS_COLLECTION).doc(sellerUid).set(
      {
        totalPixels: FieldValue.increment(-pixels),
        totalBlocks: FieldValue.increment(-blockIds.length),
        pendingPayout: FieldValue.increment(amount),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}
