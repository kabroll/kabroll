"use client";

// Canvas interactif 1000x1000.
// - Molette : zoom centré sur le curseur
// - Outil "Déplacer" : pan (glisser)
// - Outil "Sélectionner" : tracer un rectangle de pixels à acheter
// Rendu des blocs achetés (couleur unie ou image) + survol/tooltip.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { GRID_SIZE } from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";
import {
  isSelectionFree,
  selectionFromCorners,
} from "@/lib/geometry";

type Tool = "move" | "select";

interface View {
  scale: number; // pixels écran par cellule
  ox: number; // position écran (px) de la cellule x=0
  oy: number;
}

interface Props {
  blocks: PixelBlock[];
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
}

export default function PixelCanvas({
  blocks,
  selection,
  onSelectionChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<View>({ scale: 0.5, ox: 0, oy: 0 });
  const draftRef = useRef<Selection | null>(null);
  const blocksRef = useRef<PixelBlock[]>(blocks);
  const selectionRef = useRef<Selection | null>(selection);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const [tool, setTool] = useState<Tool>("select");
  const toolRef = useRef<Tool>(tool);
  const [hover, setHover] = useState<{ block: PixelBlock; sx: number; sy: number } | null>(null);

  // Interaction state (refs pour éviter les re-renders pendant le drag).
  const dragging = useRef<{
    mode: "pan" | "select";
    startSX: number;
    startSY: number;
    startOX: number;
    startOY: number;
    startCellX: number;
    startCellY: number;
  } | null>(null);

  // ---- Sync props -> refs ---------------------------------------------------
  useEffect(() => {
    blocksRef.current = blocks;
    // Précharge les images des blocs.
    for (const b of blocks) {
      if (b.fill === "image" && b.imageUrl && !imageCache.current.has(b.imageUrl)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = b.imageUrl;
        img.onload = () => draw();
        imageCache.current.set(b.imageUrl, img);
      }
    }
    draw();
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    selectionRef.current = selection;
    draw();
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // ---- Helpers --------------------------------------------------------------
  const screenToCell = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return {
      cx: Math.floor((sx - v.ox) / v.scale),
      cy: Math.floor((sy - v.oy) / v.scale),
    };
  }, []);

  // ---- Rendu ----------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Rendu pixelisé : chaque pixel d'image = une cellule, sans flou.
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);

    const v = viewRef.current;

    // Fond hors-grille
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, cw, ch);

    // Zone grille (blanche)
    const gx = v.ox;
    const gy = v.oy;
    const gpx = GRID_SIZE * v.scale;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(gx, gy, gpx, gpx);

    // Blocs
    const now = Date.now();
    for (const b of blocksRef.current) {
      if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
      const bx = v.ox + b.x * v.scale;
      const by = v.oy + b.y * v.scale;
      const bw = b.w * v.scale;
      const bh = b.h * v.scale;

      if (b.fill === "image" && b.imageUrl) {
        const img = imageCache.current.get(b.imageUrl);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, bx, by, bw, bh);
        } else {
          ctx.fillStyle = "#e4e4e7";
          ctx.fillRect(bx, by, bw, bh);
        }
      } else {
        ctx.fillStyle = b.color || "#111111";
        ctx.fillRect(bx, by, bw, bh);
      }

      // Voile pour les réservations en attente
      if (b.status === "pending") {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(bx, by, bw, bh);
      }
    }

    // Grille fine si suffisamment zoomé
    if (v.scale >= 6) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      const startX = Math.max(0, Math.floor((-v.ox) / v.scale));
      const endX = Math.min(GRID_SIZE, Math.ceil((cw - v.ox) / v.scale));
      const startY = Math.max(0, Math.floor((-v.oy) / v.scale));
      const endY = Math.min(GRID_SIZE, Math.ceil((ch - v.oy) / v.scale));
      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        const px = Math.round(v.ox + x * v.scale) + 0.5;
        ctx.moveTo(px, gy);
        ctx.lineTo(px, gy + gpx);
      }
      for (let y = startY; y <= endY; y++) {
        const py = Math.round(v.oy + y * v.scale) + 0.5;
        ctx.moveTo(gx, py);
        ctx.lineTo(gx + gpx, py);
      }
      ctx.stroke();
    }

    // Bordure de la grille
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gpx, gpx);

    // Sélection (draft pendant le drag, sinon la sélection validée)
    const sel = draftRef.current || selectionRef.current;
    if (sel) {
      const free = isSelectionFree(sel, blocksRef.current, now);
      const sxp = v.ox + sel.x * v.scale;
      const syp = v.oy + sel.y * v.scale;
      const swp = sel.w * v.scale;
      const shp = sel.h * v.scale;
      ctx.fillStyle = free ? "rgba(37,99,235,0.18)" : "rgba(220,38,38,0.20)";
      ctx.fillRect(sxp, syp, swp, shp);
      ctx.strokeStyle = free ? "#2563eb" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.strokeRect(sxp, syp, swp, shp);
    }
  }, []);

  // ---- Fit initial : la grille remplit le conteneur ------------------------
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw, ch) / GRID_SIZE;
    const gpx = GRID_SIZE * scale;
    viewRef.current = {
      scale,
      ox: (cw - gpx) / 2,
      oy: (ch - gpx) / 2,
    };
    draw();
  }, [draw]);

  useEffect(() => {
    fitToScreen();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitToScreen, draw]);

  // ---- Zoom ----------------------------------------------------------------
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const v = viewRef.current;
      const newScale = Math.max(
        0.05,
        Math.min(40, v.scale * factor),
      );
      // Garde le point sous le curseur fixe.
      const wx = (sx - v.ox) / v.scale;
      const wy = (sy - v.oy) / v.scale;
      v.scale = newScale;
      v.ox = sx - wx * newScale;
      v.oy = sy - wy * newScale;
      draw();
    },
    [draw],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(sx, sy, factor);
    },
    [zoomAt],
  );

  // ---- Pointer (pan / select / hover) --------------------------------------
  const getXY = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { sx, sy } = getXY(e);
    const v = viewRef.current;
    const panMode = toolRef.current === "move" || e.button === 1 || e.button === 2;
    if (panMode) {
      dragging.current = {
        mode: "pan",
        startSX: sx,
        startSY: sy,
        startOX: v.ox,
        startOY: v.oy,
        startCellX: 0,
        startCellY: 0,
      };
    } else {
      const { cx, cy } = screenToCell(sx, sy);
      dragging.current = {
        mode: "select",
        startSX: sx,
        startSY: sy,
        startOX: v.ox,
        startOY: v.oy,
        startCellX: cx,
        startCellY: cy,
      };
      draftRef.current = selectionFromCorners(cx, cy, cx, cy);
      draw();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = getXY(e);
    const d = dragging.current;

    if (!d) {
      // Survol : tooltip sur un bloc.
      const { cx, cy } = screenToCell(sx, sy);
      const now = Date.now();
      const found = blocksRef.current.find(
        (b) =>
          b.status === "active" &&
          cx >= b.x &&
          cx < b.x + b.w &&
          cy >= b.y &&
          cy < b.y + b.h &&
          (b.message || b.link || b.ownerName),
      );
      setHover(found ? { block: found, sx, sy } : null);
      return;
    }

    if (d.mode === "pan") {
      const v = viewRef.current;
      v.ox = d.startOX + (sx - d.startSX);
      v.oy = d.startOY + (sy - d.startSY);
      draw();
    } else {
      const { cx, cy } = screenToCell(sx, sy);
      draftRef.current = selectionFromCorners(
        d.startCellX,
        d.startCellY,
        cx,
        cy,
      );
      draw();
    }
  };

  const onPointerUp = () => {
    const d = dragging.current;
    dragging.current = null;
    if (d?.mode === "select" && draftRef.current) {
      const sel = draftRef.current;
      draftRef.current = null;
      // Ignore les "clics" d'un seul pixel involontaires ? On garde tout >=1.
      onSelectionChange(sel);
    }
  };

  // ---- UI -------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none touch-none bg-zinc-100"
    >
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHover(null);
          if (dragging.current) onPointerUp();
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={tool === "move" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}
      />

      {/* Barre d'outils */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-xl shadow-sm border border-black/[0.06] p-1">
        <ToolButton active={tool === "select"} onClick={() => setTool("select")} label="Sélectionner">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2m14 0a2 2 0 012 2M5 21a2 2 0 01-2-2m18 0a2 2 0 01-2 2M9 3h2m2 0h2M3 9v2m0 2v2m18-6v2m0 2v2M9 21h2m2 0h2" />
          </svg>
        </ToolButton>
        <ToolButton active={tool === "move"} onClick={() => setTool("move")} label="Déplacer">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
          </svg>
        </ToolButton>
      </div>

      {/* Contrôles zoom */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-white rounded-xl shadow-sm border border-black/[0.06] p-1">
        <button
          onClick={() => {
            const c = containerRef.current!;
            zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1.4);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold"
          aria-label="Zoomer"
        >
          +
        </button>
        <button
          onClick={() => {
            const c = containerRef.current!;
            zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1 / 1.4);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold"
          aria-label="Dézoomer"
        >
          −
        </button>
        <button
          onClick={fitToScreen}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05]"
          aria-label="Réinitialiser la vue"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
          </svg>
        </button>
      </div>

      {/* Tooltip survol */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[220px] bg-black text-white text-[12px] rounded-lg px-3 py-2 shadow-lg"
          style={{ left: hover.sx + 12, top: hover.sy + 12 }}
        >
          {hover.block.ownerName && (
            <div className="font-semibold">{hover.block.ownerName}</div>
          )}
          {hover.block.message && (
            <div className="text-white/70">{hover.block.message}</div>
          )}
          {hover.block.link && (
            <div className="text-blue-300 truncate">{hover.block.link}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "w-9 h-9 flex items-center justify-center rounded-lg transition-colors " +
        (active ? "bg-black text-white" : "text-black/50 hover:bg-black/[0.05]")
      }
    >
      {children}
    </button>
  );
}
