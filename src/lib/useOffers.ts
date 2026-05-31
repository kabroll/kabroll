"use client";

// Hook temps réel des offres concernant l'utilisateur courant :
//  - reçues : offres sur mes blocs (toUid == moi)
//  - envoyées : mes offres (fromUid == moi)
// En l'absence de Firebase, retourne des listes vides.

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, type QuerySnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { OFFERS_COLLECTION } from "./constants";
import type { Offer } from "./types";

export function useOffers(uid: string | undefined) {
  const [received, setReceived] = useState<Offer[]>([]);
  const [sent, setSent] = useState<Offer[]>([]);

  useEffect(() => {
    if (!db || !uid) {
      setReceived([]);
      setSent([]);
      return;
    }

    const mapDocs = (snap: QuerySnapshot): Offer[] =>
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Offer, "id">) }));

    const unsubRecv = onSnapshot(
      query(
        collection(db, OFFERS_COLLECTION),
        where("toUid", "==", uid),
        where("status", "==", "pending"),
      ),
      (snap) => setReceived(mapDocs(snap)),
      (err) => console.error("offers received:", err),
    );

    const unsubSent = onSnapshot(
      query(collection(db, OFFERS_COLLECTION), where("fromUid", "==", uid)),
      (snap) => setSent(mapDocs(snap)),
      (err) => console.error("offers sent:", err),
    );

    return () => {
      unsubRecv();
      unsubSent();
    };
  }, [uid]);

  return { received, sent };
}
