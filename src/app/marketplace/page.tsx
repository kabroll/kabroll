"use client";

// Marketplace : annonces de revente.
// Les blocs vendus en GROUPE (saleGroupId) sont regroupés en UNE annonce
// = la création entière (miniature complète, prix total). Les blocs vendus
// à la pièce restent des annonces individuelles.

import { useMemo, useState } from "react";
import Link from "next/link";
import GroupThumb from "@/components/GroupThumb";
import { usePixels } from "@/lib/usePixels";
import { formatEUR, formatNumber } from "@/lib/constants";
import { publicOwnerName } from "@/lib/display";
import type { PixelBlock } from "@/lib/types";

type Sort = "recent" | "price-asc" | "price-desc" | "size-desc";

/** Une annonce du marketplace : un bloc seul OU une création entière. */
interface Listing {
  key: string;
  blocks: PixelBlock[]; // 1 (pièce) ou N (création)
  isGroup: boolean;
  label?: string;
  ownerName?: string;
  pixels: number;
  price: number; // total
  createdAt: number;
  /** Bloc d'entrée pour le lien (recentrage canvas + ouverture détail). */
  anchor: PixelBlock;
}

function boundingBox(blocks: PixelBlock[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export default function MarketplacePage() {
  const { blocks, loading, usingMock } = usePixels();
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");

  const listings = useMemo<Listing[]>(() => {
    const onSale = blocks.filter(
      (b) => b.status === "active" && b.forSale && b.salePrice != null && !b.reservedForUid,
    );

    // Regroupe par saleGroupId (création entière) ; sinon annonce par bloc.
    const groups = new Map<string, PixelBlock[]>();
    const singles: PixelBlock[] = [];
    for (const b of onSale) {
      if (b.saleGroupId) {
        const arr = groups.get(b.saleGroupId) || [];
        arr.push(b);
        groups.set(b.saleGroupId, arr);
      } else {
        singles.push(b);
      }
    }

    const result: Listing[] = [];

    for (const [gid, gblocks] of groups) {
      const anchor = gblocks[0];
      result.push({
        key: `g-${gid}`,
        blocks: gblocks,
        isGroup: true,
        label: gblocks.find((b) => b.groupLabel)?.groupLabel,
        ownerName: anchor.ownerName,
        pixels: gblocks.reduce((a, b) => a + b.w * b.h, 0),
        price: gblocks.reduce((a, b) => a + (b.salePrice || 0), 0),
        createdAt: Math.max(...gblocks.map((b) => b.createdAt || 0)),
        anchor,
      });
    }
    for (const b of singles) {
      result.push({
        key: `b-${b.id}`,
        blocks: [b],
        isGroup: false,
        label: b.groupLabel,
        ownerName: b.ownerName,
        pixels: b.w * b.h,
        price: b.salePrice || 0,
        createdAt: b.createdAt || 0,
        anchor: b,
      });
    }

    // Recherche
    let list = result;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) =>
          l.ownerName?.toLowerCase().includes(q) ||
          l.label?.toLowerCase().includes(q) ||
          l.blocks.some((b) => b.message?.toLowerCase().includes(q)),
      );
    }

    const sorters: Record<Sort, (a: Listing, b: Listing) => number> = {
      recent: (a, b) => b.createdAt - a.createdAt,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "size-desc": (a, b) => b.pixels - a.pixels,
    };
    return [...list].sort(sorters[sort]);
  }, [blocks, sort, query]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-[14px] text-black/45 mt-1">
          Les créations et blocs proposés à la revente par leurs propriétaires.
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
            placeholder="Rechercher une création, un vendeur…"
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
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listings.map((l) => {
            const bb = boundingBox(l.blocks);
            const href = `/?block=${l.anchor.id}&x=${bb.x}&y=${bb.y}&w=${bb.w}&h=${bb.h}`;
            return (
              <Link
                key={l.key}
                href={href}
                className="group rounded-2xl border border-black/[0.06] p-3 hover:border-accent/30 hover:shadow-sm transition-all"
              >
                <div className="aspect-square rounded-xl overflow-hidden border border-black/[0.06] bg-zinc-100 mb-3 flex items-center justify-center relative">
                  {l.isGroup ? (
                    <GroupThumb blocks={l.blocks} size={120} />
                  ) : l.anchor.fill === "image" && l.anchor.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.anchor.imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: l.anchor.color || "#111" }} />
                  )}
                  {l.isGroup && (
                    <span className="absolute top-1.5 left-1.5 bg-accent text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm">
                      Création
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">
                      {l.label || publicOwnerName(l.ownerName)}
                    </div>
                    <div className="text-[11px] text-black/40">
                      {formatNumber(l.pixels)} px
                      {l.isGroup ? ` · ${l.blocks.length} blocs` : ""}
                    </div>
                  </div>
                  <span className="text-[13px] font-bold text-green-700 shrink-0">
                    {formatEUR(l.price)}
                  </span>
                </div>
              </Link>
            );
          })}
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
      <p className="text-black/40 text-[14px]">Aucune annonce pour le moment.</p>
      <Link
        href="/?buy=1"
        className="inline-block mt-4 px-5 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-xl hover:bg-accent-700 transition-colors"
      >
        Acheter des pixels
      </Link>
    </div>
  );
}
