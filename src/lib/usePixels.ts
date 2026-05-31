"use client";

// Hook temps réel : s'abonne aux blocs de pixels dans Firestore.
// En l'absence de configuration Firebase, retourne les données de démo.

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { PIXELS_COLLECTION } from "./constants";
import type { PixelBlock } from "./types";
import { MOCK_BLOCKS } from "./mockData";

export function usePixels() {
  const [blocks, setBlocks] = useState<PixelBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    if (!db) {
      setBlocks(MOCK_BLOCKS);
      setUsingMock(true);
      setLoading(false);
      return;
    }

    // On récupère les blocs actifs ET en attente (réservés) pour bloquer
    // les zones en cours de paiement.
    const q = query(
      collection(db, PIXELS_COLLECTION),
      where("status", "in", ["active", "pending"]),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: PixelBlock[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PixelBlock, "id">),
        }));
        setBlocks(next);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur Firestore pixels:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return { blocks, loading, usingMock };
}
