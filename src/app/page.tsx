"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PixelCanvas from "@/components/PixelCanvas";
import BuyPanel from "@/components/BuyPanel";
import BlockDetailPanel from "@/components/BlockDetailPanel";
import { usePixels } from "@/lib/usePixels";
import { TOTAL_PIXELS, formatNumber } from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";

function CanvasView() {
  const { blocks, usingMock } = usePixels();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const searchParams = useSearchParams();

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || null,
    [blocks, activeBlockId],
  );

  function handleBlockClick(b: PixelBlock) {
    setSelection(null);
    setActiveBlockId(b.id);
  }

  function handleSelectionChange(s: Selection | null) {
    if (s) setActiveBlockId(null);
    setSelection(s);
  }

  useEffect(() => {
    if (searchParams.get("buy") === "1") {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const soldPixels = useMemo(
    () =>
      blocks
        .filter((b) => b.status === "active")
        .reduce((acc, b) => acc + b.w * b.h, 0),
    [blocks],
  );
  const remaining = TOTAL_PIXELS - soldPixels;
  const pct = (soldPixels / TOTAL_PIXELS) * 100;

  return (
    <div className="relative h-[calc(100vh-58px-60px)] md:h-[calc(100vh-58px)] no-overscroll">
      {/* Bandeau statistiques */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur border border-black/[0.06] rounded-full shadow-sm px-4 py-2 flex items-center gap-3 text-[12px] whitespace-nowrap">
        <span className="font-semibold">{formatNumber(soldPixels)}</span>
        <span className="text-black/40">vendus</span>
        <span className="w-px h-3.5 bg-black/10" />
        <span className="font-semibold">{formatNumber(remaining)}</span>
        <span className="text-black/40">restants</span>
        <span className="hidden sm:inline w-16 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
          <span className="block h-full bg-black" style={{ width: `${Math.max(2, pct)}%` }} />
        </span>
      </div>

      {usingMock && (
        <div className="absolute bottom-3 left-3 z-20 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] rounded-lg px-3 py-1.5">
          Mode démo · données factices
        </div>
      )}

      {showHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black text-white text-[12px] rounded-lg px-3.5 py-2 shadow-lg">
          Tracez une zone sur le canvas pour choisir vos pixels ✏️
        </div>
      )}

      <PixelCanvas
        blocks={blocks}
        selection={selection}
        onSelectionChange={handleSelectionChange}
        onBlockClick={handleBlockClick}
      />

      {selection && (
        <BuyPanel
          selection={selection}
          blocks={blocks}
          onSelectionResize={setSelection}
          onClose={() => setSelection(null)}
        />
      )}

      {activeBlock && !selection && (
        <BlockDetailPanel
          block={activeBlock}
          onClose={() => setActiveBlockId(null)}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-58px)] bg-zinc-100" />}>
      <CanvasView />
    </Suspense>
  );
}
