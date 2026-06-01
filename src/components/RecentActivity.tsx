"use client";

// Bandeau "preuve sociale" : affiche les dernières créations, avec le nom
// du propriétaire (email masqué), un point coloré, et l'ancienneté.
// Compact (une seule ligne qui tourne) pour ne pas gêner le canvas.

import { useEffect, useMemo, useState } from "react";
import type { PixelBlock } from "@/lib/types";
import { publicOwnerName, timeAgo } from "@/lib/display";

interface Entry {
  key: string;
  name: string;
  color: string;
  pixels: number;
  createdAt: number;
  label?: string;
}

export default function RecentActivity({ blocks }: { blocks: PixelBlock[] }) {
  // Agrège par création (purchaseId) et garde les plus récentes.
  const entries = useMemo<Entry[]>(() => {
    const map = new Map<string, Entry & { _maxC: number }>();
    for (const b of blocks) {
      if (b.status !== "active") continue;
      const key = b.purchaseId || b.id;
      const cur = map.get(key);
      const px = b.w * b.h;
      if (cur) {
        cur.pixels += px;
        if ((b.createdAt || 0) > cur._maxC) cur._maxC = b.createdAt || 0;
      } else {
        map.set(key, {
          key,
          name: publicOwnerName(b.ownerName),
          color: b.fill === "color" ? b.color || "#111" : "#9ca3af",
          pixels: px,
          createdAt: b.createdAt || 0,
          _maxC: b.createdAt || 0,
          label: b.groupLabel,
        });
      }
    }
    return Array.from(map.values())
      .map((e) => ({ ...e, createdAt: e._maxC }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12);
  }, [blocks]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (entries.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % entries.length), 3200);
    return () => clearInterval(t);
  }, [entries.length]);

  if (entries.length === 0) return null;
  const e = entries[idx % entries.length];

  return (
    <div className="bg-white/95 backdrop-blur border border-black/[0.06] rounded-full shadow-sm pl-2 pr-3 py-1.5 flex items-center gap-2 text-[12px] max-w-[78vw] sm:max-w-none animate-fade-in">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span
        key={e.key}
        className="flex items-center gap-1.5 min-w-0 animate-fade-in"
      >
        <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ backgroundColor: e.color }} />
        <span className="font-medium truncate">{e.name}</span>
        <span className="text-black/40 shrink-0 hidden xs:inline">
          a placé {e.label ? `“${e.label}”` : `${e.pixels} px`}
        </span>
        <span className="text-black/30 shrink-0">· {timeAgo(e.createdAt) || "récemment"}</span>
      </span>
    </div>
  );
}
