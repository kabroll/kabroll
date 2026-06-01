"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePixels } from "@/lib/usePixels";
import {
  PRICE_PER_PIXEL_EUR,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const { blocks, usingMock } = usePixels();

  const entries = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const b of blocks) {
      if (b.status !== "active") continue;
      const key = b.ownerId || b.ownerName || "anon";
      const cur = map.get(key) || {
        ownerId: b.ownerId || key,
        ownerName: b.ownerName || "Anonyme",
        totalPixels: 0,
        totalSpent: 0,
        blocks: 0,
      };
      cur.totalPixels += b.w * b.h;
      cur.totalSpent += b.w * b.h * PRICE_PER_PIXEL_EUR;
      cur.blocks += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.totalPixels - a.totalPixels);
  }, [blocks]);

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Classement</h1>
        <p className="text-[14px] text-black/45 mt-1">
          Les plus grands propriétaires de pixels du canvas.
        </p>
      </div>

      {usingMock && (
        <div className="mb-4 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Mode démo · classement basé sur des données factices.
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl border border-black/[0.06] overflow-hidden divide-y divide-black/[0.05]">
          {entries.map((e, i) => (
            <div
              key={e.ownerId}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-black/[0.015] transition-colors"
            >
              <div
                className={
                  "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 " +
                  (i === 0
                    ? "bg-amber-100 text-amber-700"
                    : i === 1
                      ? "bg-zinc-200 text-zinc-600"
                      : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-black/[0.04] text-black/40")
                }
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] truncate">{e.ownerName}</div>
                <div className="text-[12px] text-black/40">
                  {e.blocks} bloc{e.blocks > 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[14px]">
                  {formatNumber(e.totalPixels)} px
                </div>
                <div className="text-[12px] text-black/40">{formatEUR(e.totalSpent)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-black/10">
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-black/[0.04] flex items-center justify-center text-black/30">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V19a1 1 0 001 1h3v-5H3zm7-9.5V19a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1zm7 5V19a1 1 0 001 1h3v-8h-3a1 1 0 00-1 1z" />
        </svg>
      </div>
      <p className="text-black/40 text-[14px]">Aucun pixel vendu pour l&apos;instant.</p>
      <Link
        href="/?buy=1"
        className="inline-block mt-4 px-5 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-xl hover:bg-accent-700 transition-colors"
      >
        Soyez le premier
      </Link>
    </div>
  );
}
