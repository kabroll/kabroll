"use client";

// Marketplace : tous les blocs proposés à la revente, avec tri et recherche.
// Cliquer sur un bloc recentre le canvas dessus et ouvre son détail.

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePixels } from "@/lib/usePixels";
import { formatEUR, formatNumber } from "@/lib/constants";
import type { PixelBlock } from "@/lib/types";

type Sort = "recent" | "price-asc" | "price-desc" | "size-desc";

export default function MarketplacePage() {
  const { blocks, loading, usingMock } = usePixels();
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");

  const forSale = useMemo(() => {
    let list = blocks.filter(
      (b) => b.status === "active" && b.forSale && b.salePrice != null && !b.reservedForUid,
    );
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.ownerName?.toLowerCase().includes(q) ||
          b.message?.toLowerCase().includes(q),
      );
    }
    const sorters: Record<Sort, (a: PixelBlock, b: PixelBlock) => number> = {
      recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      "price-asc": (a, b) => (a.salePrice || 0) - (b.salePrice || 0),
      "price-desc": (a, b) => (b.salePrice || 0) - (a.salePrice || 0),
      "size-desc": (a, b) => b.w * b.h - a.w * a.h,
    };
    return [...list].sort(sorters[sort]);
  }, [blocks, sort, query]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-[14px] text-black/45 mt-1">
          Les blocs de pixels proposés à la revente par leurs propriétaires.
        </p>
      </div>

      {usingMock && (
        <div className="mb-4 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Mode démo · annonces fictives.
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un vendeur, un message…"
            className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-black/[0.02] border border-black/[0.06] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-accent/40 transition-colors"
        >
          <option value="recent">Plus récents</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="size-desc">Plus grands</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/[0.06] p-3 animate-pulse">
              <div className="aspect-square rounded-xl bg-black/[0.06] mb-3" />
              <div className="h-3 bg-black/[0.06] rounded w-2/3 mb-2" />
              <div className="h-3 bg-black/[0.06] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : forSale.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {forSale.map((b) => (
            <Link
              key={b.id}
              href={`/?block=${b.id}&x=${b.x}&y=${b.y}&w=${b.w}&h=${b.h}`}
              className="group rounded-2xl border border-black/[0.06] p-3 hover:border-accent/30 hover:shadow-sm transition-all"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-black/[0.06] bg-zinc-100 mb-3">
                {b.fill === "image" && b.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: b.color || "#111" }} />
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{b.ownerName || "Anonyme"}</div>
                  <div className="text-[11px] text-black/40">
                    {b.w}×{b.h} · {formatNumber(b.w * b.h)} px
                  </div>
                </div>
                <span className="text-[13px] font-bold text-green-700 shrink-0">
                  {formatEUR(b.salePrice!)}
                </span>
              </div>
            </Link>
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17" />
        </svg>
      </div>
      <p className="text-black/40 text-[14px]">Aucun bloc en vente pour le moment.</p>
      <Link
        href="/?buy=1"
        className="inline-block mt-4 px-5 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-xl hover:bg-accent-700 transition-colors"
      >
        Acheter des pixels
      </Link>
    </div>
  );
}
