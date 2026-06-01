"use client";

// Canvas interactif 1000x1000.
// - Molette : zoom centré sur le curseur
// - Pinch (2 doigts) : zoom mobile
// - Outil "Déplacer" : pan (glisser)
// - Outil "Sélectionner" : tracer un rectangle de pixels à acheter
// - Double-clic / double-tap : zoom rapide
// Rendu des blocs (couleur / image), halo sur les blocs en vente, minimap,
// survol/tooltip, lecture des coordonnées en direct.

import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_SIZE } from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";
import { isSelectionFree, selectionFromCorners } from "@/lib/geometry";

type Tool = "move" | "select";
const ACCENT = "#4f46e5";

interface View {
  scale: number; // pixels écran par cellule
  ox: number; // position écran (px) de la cellule x=0
  oy: number;
}

interface Props {
  blocks: PixelBlock[];
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
  onBlockClick?: (block: PixelBlock) => void;
  /** Cellule à recentrer (depuis le marketplace, par ex.). */
  focusCell?: { x: number; y: number; w: number; h: number } | null;
}

export default function PixelCanvas({
  blocks,
  selection,
  onSelectionChange,
  onBlockClick,
  focusCell,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<View>({ scale: 0.5, ox: 0, oy: 0 });
  const draftRef = useRef<Selection | null>(null);
  const blocksRef = useRef<PixelBlock[]>(blocks);
  const selectionRef = useRef<Selection | null>(selection);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const [tool, setTool] = useState<Tool>("select");
  const toolRef = useRef<Tool>(tool);
  const [hover, setHover] = useState<{ block: PixelBlock; sx: number; sy: number } | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [zoomLabel, setZoomLabel] = useState(1);

  // Multi-touch (pinch) : suivi des pointeurs actifs.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef<number>(0);

  const dragging = useRef<{
    mode: "pan" | "select";
    startSX: number;
    startSY: number;
    startOX: number;
    startOY: number;
    startCellX: number;
    startCellY: number;
    moved: boolean;
  } | null>(null);

  // ---- Sync props -> refs ---------------------------------------------------
  useEffect(() => {
    blocksRef.current = blocks;
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

  // ---- Rendu minimap --------------------------------------------------------
  const drawMini = useCallback(() => {
    const mini = miniRef.current;
    const container = containerRef.current;
    if (!mini || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 96;
    if (mini.width !== size * dpr) {
      mini.width = size * dpr;
      mini.height = size * dpr;
    }
    const ctx = mini.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const k = size / GRID_SIZE;
    const now = Date.now();
    for (const b of blocksRef.current) {
      if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
      ctx.fillStyle = b.fill === "color" ? b.color || "#111" : "#9ca3af";
      ctx.fillRect(b.x * k, b.y * k, Math.max(1, b.w * k), Math.max(1, b.h * k));
    }
    // Cadre du viewport actuel.
    const v = viewRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vx = (-v.ox / v.scale) * k;
    const vy = (-v.oy / v.scale) * k;
    const vw = (cw / v.scale) * k;
    const vh = (ch / v.scale) * k;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(0, vx),
      Math.max(0, vy),
      Math.min(size, vw),
      Math.min(size, vh),
    );
  }, []);

  // ---- Rendu principal ------------------------------------------------------
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
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);

    const v = viewRef.current;
    setZoomLabel(v.scale);

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

      if (b.status === "pending") {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(bx, by, bw, bh);
      }

      // Halo vert sur les blocs en vente.
      if (b.status === "active" && b.forSale) {
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      }
    }

    // Grille fine si suffisamment zoomé
    if (v.scale >= 6) {
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      const startX = Math.max(0, Math.floor(-v.ox / v.scale));
      const endX = Math.min(GRID_SIZE, Math.ceil((cw - v.ox) / v.scale));
      const startY = Math.max(0, Math.floor(-v.oy / v.scale));
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

    // Sélection
    const sel = draftRef.current || selectionRef.current;
    if (sel) {
      const free = isSelectionFree(sel, blocksRef.current, now);
      const sxp = v.ox + sel.x * v.scale;
      const syp = v.oy + sel.y * v.scale;
      const swp = sel.w * v.scale;
      const shp = sel.h * v.scale;
      ctx.fillStyle = free ? "rgba(79,70,229,0.16)" : "rgba(220,38,38,0.20)";
      ctx.fillRect(sxp, syp, swp, shp);
      ctx.strokeStyle = free ? ACCENT : "#dc2626";
      ctx.lineWidth = 2;
      ctx.strokeRect(sxp, syp, swp, shp);
    }

    drawMini();
  }, [drawMini]);

  // ---- Fit / centrage -------------------------------------------------------
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw, ch) / GRID_SIZE;
    const gpx = GRID_SIZE * scale;
    viewRef.current = { scale, ox: (cw - gpx) / 2, oy: (ch - gpx) / 2 };
    draw();
  }, [draw]);

  const centerOn = useCallback(
    (cx: number, cy: number, targetScale?: number) => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const v = viewRef.current;
      if (targetScale) v.scale = Math.max(0.05, Math.min(40, targetScale));
      v.ox = cw / 2 - cx * v.scale;
      v.oy = ch / 2 - cy * v.scale;
      draw();
    },
    [draw],
  );

  useEffect(() => {
    fitToScreen();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitToScreen, draw]);

  // Recentre sur une cible externe (depuis le marketplace).
  useEffect(() => {
    if (focusCell) {
      centerOn(
        focusCell.x + focusCell.w / 2,
        focusCell.y + focusCell.h / 2,
        Math.max(4, viewRef.current.scale),
      );
    }
  }, [focusCell, centerOn]);

  // ---- Zoom -----------------------------------------------------------------
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const v = viewRef.current;
      const newScale = Math.max(0.05, Math.min(40, v.scale * factor));
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

  // ---- Pointer / multi-touch ------------------------------------------------
  const getXY = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { sx, sy } = getXY(e);
    pointers.current.set(e.pointerId, { x: sx, y: sy });

    // Deux doigts -> démarre un pinch, annule tout drag.
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinch.current = {
        dist: Math.hypot(dx, dy),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
      };
      dragging.current = null;
      draftRef.current = null;
      draw();
      return;
    }

    // Double-tap / double-clic -> zoom.
    const now = Date.now();
    if (now - lastTap.current < 300) {
      zoomAt(sx, sy, 1.8);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    const v = viewRef.current;
    const panMode = toolRef.current === "move" || e.button === 1 || e.button === 2;
    if (panMode) {
      dragging.current = {
        mode: "pan",
        startSX: sx, startSY: sy, startOX: v.ox, startOY: v.oy,
        startCellX: 0, startCellY: 0, moved: false,
      };
    } else {
      const { cx, cy } = screenToCell(sx, sy);
      dragging.current = {
        mode: "select",
        startSX: sx, startSY: sy, startOX: v.ox, startOY: v.oy,
        startCellX: cx, startCellY: cy, moved: false,
      };
      draftRef.current = selectionFromCorners(cx, cy, cx, cy);
      draw();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = getXY(e);
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: sx, y: sy });
    }

    // Pinch en cours.
    if (pinch.current && pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const factor = dist / (pinch.current.dist || dist);
      zoomAt(cx, cy, factor);
      // Pan simultané du centre du pinch.
      const v = viewRef.current;
      v.ox += cx - pinch.current.cx;
      v.oy += cy - pinch.current.cy;
      pinch.current = { dist, cx, cy };
      draw();
      return;
    }

    const d = dragging.current;
    const { cx, cy } = screenToCell(sx, sy);
    setCoords(cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE ? { x: cx, y: cy } : null);

    if (!d) {
      const now = Date.now();
      const found = blocksRef.current.find(
        (b) =>
          b.status === "active" &&
          cx >= b.x && cx < b.x + b.w &&
          cy >= b.y && cy < b.y + b.h &&
          (b.message || b.link || b.ownerName || b.forSale),
      );
      setHover(found ? { block: found, sx, sy } : null);
      return;
    }

    d.moved = true;
    if (d.mode === "pan") {
      const v = viewRef.current;
      v.ox = d.startOX + (sx - d.startSX);
      v.oy = d.startOY + (sy - d.startSY);
      draw();
    } else {
      draftRef.current = selectionFromCorners(d.startCellX, d.startCellY, cx, cy);
      draw();
    }
  };

  const finishPointer = (e?: React.PointerEvent) => {
    if (e) pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    const d = dragging.current;
    dragging.current = null;
    if (d?.mode === "select" && draftRef.current) {
      const sel = draftRef.current;
      draftRef.current = null;
      // Clic simple sur un bloc existant -> ouvre son détail.
      if (sel.w === 1 && sel.h === 1 && onBlockClick) {
        const hit = blocksRef.current.find(
          (b) =>
            b.status === "active" &&
            sel.x >= b.x && sel.x < b.x + b.w &&
            sel.y >= b.y && sel.y < b.y + b.h,
        );
        if (hit) {
          draw();
          onBlockClick(hit);
          return;
        }
      }
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
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={(e) => {
          setHover(null);
          setCoords(null);
          if (dragging.current) finishPointer(e);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={tool === "move" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}
      />

      {/* Barre d'outils */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-black/[0.06] p-1 animate-fade-in">
        <ToolButton active={tool === "select"} onClick={() => setTool("select")} label="Sélectionner (S)">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2m14 0a2 2 0 012 2M5 21a2 2 0 01-2-2m18 0a2 2 0 01-2 2M9 3h2m2 0h2M3 9v2m0 2v2m18-6v2m0 2v2M9 21h2m2 0h2" />
          </svg>
        </ToolButton>
        <ToolButton active={tool === "move"} onClick={() => setTool("move")} label="Déplacer (M)">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
          </svg>
        </ToolButton>
      </div>

      {/* Lecture des coordonnées + zoom */}
      <div className="absolute top-3 right-3 flex items-center gap-2 animate-fade-in">
        {coords && (
          <div className="bg-white/95 backdrop-blur border border-black/[0.06] rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] font-mono text-black/60 tabular-nums">
            {coords.x}, {coords.y}
          </div>
        )}
        <div className="bg-white/95 backdrop-blur border border-black/[0.06] rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] font-medium text-black/50 tabular-nums">
          {Math.round(zoomLabel * 100) >= 100
            ? `${Math.round(zoomLabel)}×`
            : `${Math.round(zoomLabel * 100)}%`}
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-black/[0.06] p-1.5 animate-fade-in hidden sm:block">
        <canvas
          ref={miniRef}
          style={{ width: 96, height: 96 }}
          className="rounded-md border border-black/[0.06]"
        />
      </div>

      {/* Contrôles zoom */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-black/[0.06] p-1 animate-fade-in">
        <button
          onClick={() => {
            const c = containerRef.current!;
            zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1.4);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Zoomer"
        >
          +
        </button>
        <button
          onClick={() => {
            const c = containerRef.current!;
            zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1 / 1.4);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Dézoomer"
        >
          −
        </button>
        <button
          onClick={fitToScreen}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-accent/40"
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
          className="pointer-events-none absolute z-20 max-w-[220px] bg-black text-white text-[12px] rounded-lg px-3 py-2 shadow-lg animate-fade-in"
          style={{ left: hover.sx + 12, top: hover.sy + 12 }}
        >
          {hover.block.ownerName && (
            <div className="font-semibold">{hover.block.ownerName}</div>
          )}
          {hover.block.message && (
            <div className="text-white/70">{hover.block.message}</div>
          )}
          {hover.block.forSale && hover.block.salePrice != null && (
            <div className="text-green-300 font-medium mt-0.5">À vendre · {hover.block.salePrice} €</div>
          )}
          {hover.block.link && (
            <div className="text-indigo-300 truncate">{hover.block.link}</div>
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
      aria-pressed={active}
      className={
        "w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 " +
        (active ? "bg-black text-white" : "text-black/50 hover:bg-black/[0.05]")
      }
    >
      {children}
    </button>
  );
}
