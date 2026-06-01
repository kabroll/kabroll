"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PixelCanvas from "@/components/PixelCanvas";
import BuyPanel from "@/components/BuyPanel";
import BlockDetailPanel from "@/components/BlockDetailPanel";
import Onboarding from "@/components/Onboarding";
import { CountdownPill } from "@/components/Countdown";
import { Spinner } from "@/components/ui";
import { EditorProvider, useEditor } from "@/components/EditorProvider";
import EditorToolbar from "@/components/EditorToolbar";
import { usePixels } from "@/lib/usePixels";
import { useCountUp } from "@/lib/useCountUp";
import { TOTAL_PIXELS, formatNumber } from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";

function CanvasView() {
  const { blocks, loading, usingMock } = usePixels();
  const { count, clearPainted } = useEditor();
  const [previewRect, setPreviewRect] = useState<Selection | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [focusCell, setFocusCell] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const searchParams = useSearchParams();

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || null,
    [blocks, activeBlockId],
  );

  function handleBlockClick(b: PixelBlock) {
    setActiveBlockId(b.id);
  }

  useEffect(() => {
    if (count > 0) setActiveBlockId(null);
  }, [count]);

  useEffect(() => {
    if (searchParams.get("buy") === "1") {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const x = Number(searchParams.get("x"));
    const y = Number(searchParams.get("y"));
    if (Number.isFinite(x) && Number.isFinite(y) && searchParams.has("x")) {
      const w = Number(searchParams.get("w")) || 1;
      const h = Number(searchParams.get("h")) || 1;
      setFocusCell({ x, y, w, h });
      const id = searchParams.get("block");
      if (id) setActiveBlockId(id);
    }
  }, [searchParams]);

  const soldPixels = useMemo(
    () => blocks.filter((b) => b.status === "active").reduce((acc, b) => acc + b.w * b.h, 0),
    [blocks],
  );
  const animatedSold = useCountUp(soldPixels);
  const remaining = TOTAL_PIXELS - soldPixels;
  const pct = (soldPixels / TOTAL_PIXELS) * 100;

  return (
    <div className="relative h-[calc(100vh-58px-60px)] md:h-[calc(100vh-58px)] no-overscroll">
      <Onboarding />

      {/* Bandeau statistiques */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur border border-black/[0.06] rounded-full shadow-sm px-4 py-2 flex items-center gap-3 text-[12px] whitespace-nowrap animate-fade-in">
        <span className="font-semibold tabular-nums">{formatNumber(animatedSold)}</span>
        <span className="text-black/40">vendus</span>
        <span className="hidden xs:inline w-px h-3.5 bg-black/10" />
        <span className="hidden xs:inline font-semibold tabular-nums">{formatNumber(remaining)}</span>
        <span className="hidden xs:inline text-black/40">restants</span>
        <span className="hidden sm:inline w-16 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
          <span className="block h-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.max(2, pct)}%` }} />
        </span>
        <span className="w-px h-3.5 bg-black/10" />
        <CountdownPill />
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100">
          <div className="flex flex-col items-center gap-3 text-black/40">
            <Spinner className="w-7 h-7" />
            <span className="text-[13px]">Chargement du canvas…</span>
          </div>
        </div>
      )}

      {usingMock && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] rounded-lg px-3 py-1.5 animate-fade-in">
          Mode démo · données factices
        </div>
      )}

      {showHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black text-white text-[12px] rounded-lg px-3.5 py-2 shadow-lg animate-fade-in">
          Choisissez une couleur et peignez · outils Pixel / Zone / Gomme en bas ✏️
        </div>
      )}

      <PixelCanvas
        blocks={blocks}
        onBlockClick={handleBlockClick}
        previewRect={previewRect}
        focusCell={focusCell}
      />

      {/* Barre d'outils + palette (masquée quand le checkout est ouvert sur mobile) */}
      {!checkoutOpen && <EditorToolbar />}

      {/* Bouton flottant "Continuer" quand on a peint */}
      {count > 0 && !checkoutOpen && (
        <button
          onClick={() => setCheckoutOpen(true)}
          className="absolute top-3 right-3 sm:top-auto sm:bottom-28 z-30 bg-accent hover:bg-accent-700 text-white rounded-full shadow-lg px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 animate-fade-in"
        >
          <span>Continuer ({formatNumber(count)} px)</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      {checkoutOpen && (
        <BuyPanel
          blocks={blocks}
          onPreviewRect={setPreviewRect}
          onClose={() => { setCheckoutOpen(false); setPreviewRect(null); }}
        />
      )}

      {activeBlock && count === 0 && !checkoutOpen && (
        <BlockDetailPanel block={activeBlock} onClose={() => setActiveBlockId(null)} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-58px)] bg-zinc-100" />}>
      <EditorProvider>
        <CanvasView />
      </EditorProvider>
    </Suspense>
  );
}
