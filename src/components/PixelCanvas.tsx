"use client";

// Canvas interactif 1000x1000 — éditeur "mini-Paint".
// Outils (depuis EditorProvider) :
//   - pixel  : peint cellule par cellule (clic / glisser)
//   - zone   : peint un rectangle (glisser deux coins)
//   - erase  : efface des cellules peintes
//   - move   : déplace la vue (pan)
//   - picker : pipette (récupère la couleur sous le curseur)
// Multi-couleurs en direct. Zoom molette + pinch + double-tap. Minimap.

import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_SIZE } from "@/lib/constants";
import type { PixelBlock } from "@/lib/types";
import { cellKey, isCellFree, parseCellKey } from "@/lib/geometry";
import { useEditor } from "@/components/EditorProvider";

const ACCENT = "#4f46e5";

interface View {
  scale: number;
  ox: number;
  oy: number;
}

interface Props {
  blocks: PixelBlock[];
  onBlockClick?: (block: PixelBlock) => void;
  /** Rectangle d'aperçu image (dessiné en plus de la peinture). */
  previewRect?: { x: number; y: number; w: number; h: number } | null;
  focusCell?: { x: number; y: number; w: number; h: number } | null;
}

export default function PixelCanvas({
  blocks,
  onBlockClick,
  previewRect,
  focusCell,
}: Props) {
  const editor = useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);

  const viewRef = useRef<View>({ scale: 0.5, ox: 0, oy: 0 });
  const blocksRef = useRef<PixelBlock[]>(blocks);
  const paintedRef = useRef<Map<string, string>>(new Map(editor.painted));
  const previewRef = useRef(previewRect ?? null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Outil + couleur courants (refs pour les handlers).
  const toolRef = useRef(editor.tool);
  const colorRef = useRef(editor.color);

  const [hover, setHover] = useState<{ block: PixelBlock; sx: number; sy: number } | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [zoomLabel, setZoomLabel] = useState(1);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef<number>(0);

  // Geste en cours.
  const gesture = useRef<{
    mode: "paint" | "erase" | "zone" | "pan";
    startCellX: number;
    startCellY: number;
    startOX: number;
    startOY: number;
    startSX: number;
    startSY: number;
    moved: boolean;
    tapBlock: PixelBlock | null;
  } | null>(null);
  const zoneRect = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // ---- Sync props/contexte -> refs -----------------------------------------
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
    paintedRef.current = new Map(editor.painted);
    draw();
  }, [editor.painted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    previewRef.current = previewRect ?? null;
    draw();
  }, [previewRect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { toolRef.current = editor.tool; }, [editor.tool]);
  useEffect(() => { colorRef.current = editor.color; }, [editor.color]);

  // ---- Helpers --------------------------------------------------------------
  const screenToCell = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return {
      cx: Math.floor((sx - v.ox) / v.scale),
      cy: Math.floor((sy - v.oy) / v.scale),
    };
  }, []);

  const commitPainted = () => editor.setPainted(paintedRef.current);

  // ---- Minimap --------------------------------------------------------------
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
    const v = viewRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(0, (-v.ox / v.scale) * k),
      Math.max(0, (-v.oy / v.scale) * k),
      Math.min(size, (cw / v.scale) * k),
      Math.min(size, (ch / v.scale) * k),
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

    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, cw, ch);

    const gx = v.ox;
    const gy = v.oy;
    const gpx = GRID_SIZE * v.scale;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(gx, gy, gpx, gpx);

    const now = Date.now();
    for (const b of blocksRef.current) {
      if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
      const bx = v.ox + b.x * v.scale;
      const by = v.oy + b.y * v.scale;
      const bw = b.w * v.scale;
      const bh = b.h * v.scale;
      if (b.fill === "image" && b.imageUrl) {
        const img = imageCache.current.get(b.imageUrl);
        if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, bx, by, bw, bh);
        else { ctx.fillStyle = "#e4e4e7"; ctx.fillRect(bx, by, bw, bh); }
      } else {
        ctx.fillStyle = b.color || "#111111";
        ctx.fillRect(bx, by, bw, bh);
      }
      if (b.status === "pending") { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(bx, by, bw, bh); }
      if (b.status === "active" && b.forSale) {
        ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 2;
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      }
    }

    // Grille fine.
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
        ctx.moveTo(px, gy); ctx.lineTo(px, gy + gpx);
      }
      for (let y = startY; y <= endY; y++) {
        const py = Math.round(v.oy + y * v.scale) + 0.5;
        ctx.moveTo(gx, py); ctx.lineTo(gx + gpx, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gpx, gpx);

    // Peinture en cours (multi-couleurs).
    for (const [k, col] of paintedRef.current) {
      const { x, y } = parseCellKey(k);
      ctx.fillStyle = col;
      ctx.fillRect(v.ox + x * v.scale, v.oy + y * v.scale, v.scale, v.scale);
    }

    // Aperçu zone en cours (rectangle pointillé).
    const zr = zoneRect.current;
    if (zr) {
      ctx.fillStyle = colorRef.current + "55";
      ctx.fillRect(v.ox + zr.x * v.scale, v.oy + zr.y * v.scale, zr.w * v.scale, zr.h * v.scale);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(v.ox + zr.x * v.scale, v.oy + zr.y * v.scale, zr.w * v.scale, zr.h * v.scale);
      ctx.setLineDash([]);
    }

    // Aperçu image.
    const pr = previewRef.current;
    if (pr) {
      ctx.fillStyle = "rgba(79,70,229,0.14)";
      ctx.fillRect(v.ox + pr.x * v.scale, v.oy + pr.y * v.scale, pr.w * v.scale, pr.h * v.scale);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.strokeRect(v.ox + pr.x * v.scale, v.oy + pr.y * v.scale, pr.w * v.scale, pr.h * v.scale);
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

  const centerOn = useCallback((cx: number, cy: number, targetScale?: number) => {
    const container = containerRef.current;
    if (!container) return;
    const v = viewRef.current;
    if (targetScale) v.scale = Math.max(0.05, Math.min(40, targetScale));
    v.ox = container.clientWidth / 2 - cx * v.scale;
    v.oy = container.clientHeight / 2 - cy * v.scale;
    draw();
  }, [draw]);

  useEffect(() => {
    fitToScreen();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitToScreen, draw]);

  useEffect(() => {
    if (focusCell) centerOn(focusCell.x + focusCell.w / 2, focusCell.y + focusCell.h / 2, Math.max(4, viewRef.current.scale));
  }, [focusCell, centerOn]);

  // ---- Zoom -----------------------------------------------------------------
  const zoomAt = useCallback((sx: number, sy: number, factor: number) => {
    const v = viewRef.current;
    const newScale = Math.max(0.05, Math.min(40, v.scale * factor));
    const wx = (sx - v.ox) / v.scale;
    const wy = (sy - v.oy) / v.scale;
    v.scale = newScale;
    v.ox = sx - wx * newScale;
    v.oy = sy - wy * newScale;
    draw();
  }, [draw]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, [zoomAt]);

  // ---- Peinture -------------------------------------------------------------
  const paintCell = (cx: number, cy: number, erase: boolean) => {
    if (cx < 0 || cy < 0 || cx >= GRID_SIZE || cy >= GRID_SIZE) return;
    const key = cellKey(cx, cy);
    const map = paintedRef.current;
    if (erase) {
      if (map.has(key)) { map.delete(key); draw(); }
      return;
    }
    if (isCellFree(cx, cy, blocksRef.current)) {
      // Repeindre une cellule déjà peinte change sa couleur.
      if (map.get(key) !== colorRef.current) { map.set(key, colorRef.current); draw(); }
    }
  };

  const paintZone = (x: number, y: number, w: number, h: number) => {
    const map = paintedRef.current;
    const col = colorRef.current;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= GRID_SIZE || cy >= GRID_SIZE) continue;
        if (isCellFree(cx, cy, blocksRef.current)) map.set(cellKey(cx, cy), col);
      }
    }
  };

  // ---- Pointer / multi-touch ------------------------------------------------
  const getXY = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { sx, sy } = getXY(e);
    pointers.current.set(e.pointerId, { x: sx, y: sy });

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinch.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2,
      };
      gesture.current = null; zoneRect.current = null; draw();
      return;
    }

    const now = Date.now();
    if (now - lastTap.current < 300) { zoomAt(sx, sy, 1.8); lastTap.current = 0; return; }
    lastTap.current = now;

    const v = viewRef.current;
    const t = toolRef.current;
    const { cx, cy } = screenToCell(sx, sy);

    // Pipette : récupère la couleur sous le curseur (peinture ou bloc).
    if (t === "picker") {
      const k = cellKey(cx, cy);
      const fromPaint = paintedRef.current.get(k);
      const fromBlock = blocksRef.current.find(
        (b) => b.status === "active" && b.fill === "color" && cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h,
      );
      const picked = fromPaint || fromBlock?.color;
      if (picked) editor.setColor(picked);
      return;
    }

    const pan = t === "move" || e.button === 1 || e.button === 2;
    if (pan) {
      gesture.current = { mode: "pan", startCellX: 0, startCellY: 0, startOX: v.ox, startOY: v.oy, startSX: sx, startSY: sy, moved: false, tapBlock: null };
      return;
    }

    const hit = blocksRef.current.find(
      (b) => b.status === "active" && cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h,
    ) || null;

    if (t === "zone") {
      gesture.current = { mode: "zone", startCellX: cx, startCellY: cy, startOX: v.ox, startOY: v.oy, startSX: sx, startSY: sy, moved: false, tapBlock: hit };
      zoneRect.current = { x: cx, y: cy, w: 1, h: 1 };
      draw();
      return;
    }

    // pixel / erase
    gesture.current = {
      mode: t === "erase" ? "erase" : "paint",
      startCellX: cx, startCellY: cy, startOX: v.ox, startOY: v.oy, startSX: sx, startSY: sy,
      moved: false, tapBlock: hit,
    };
    // En mode pixel, si on vise un bloc existant et que la cellule n'est pas
    // libre, on laisse le clic ouvrir le détail (géré au relâchement).
    if (!(t === "pixel" && hit && !isCellFree(cx, cy, blocksRef.current))) {
      paintCell(cx, cy, t === "erase");
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = getXY(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: sx, y: sy });

    if (pinch.current && pointers.current.size >= 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
      zoomAt(cx, cy, dist / (pinch.current.dist || dist));
      const v = viewRef.current;
      v.ox += cx - pinch.current.cx; v.oy += cy - pinch.current.cy;
      pinch.current = { dist, cx, cy }; draw();
      return;
    }

    const g = gesture.current;
    const { cx, cy } = screenToCell(sx, sy);
    setCoords(cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE ? { x: cx, y: cy } : null);

    if (!g) {
      const found = blocksRef.current.find(
        (b) => b.status === "active" && cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h &&
          (b.message || b.link || b.ownerName || b.forSale),
      );
      setHover(found ? { block: found, sx, sy } : null);
      return;
    }

    g.moved = true;
    if (g.mode === "pan") {
      const v = viewRef.current;
      v.ox = g.startOX + (sx - g.startSX); v.oy = g.startOY + (sy - g.startSY); draw();
    } else if (g.mode === "zone") {
      const x = Math.min(g.startCellX, cx), y = Math.min(g.startCellY, cy);
      const w = Math.abs(cx - g.startCellX) + 1, h = Math.abs(cy - g.startCellY) + 1;
      zoneRect.current = { x, y, w, h };
      draw();
    } else {
      g.tapBlock = null;
      paintCell(cx, cy, g.mode === "erase");
    }
  };

  const finishPointer = (e?: React.PointerEvent) => {
    if (e) pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    const g = gesture.current;
    gesture.current = null;
    if (!g) return;

    // Clic simple sur un bloc existant -> ouvre le détail.
    if (g.mode !== "pan" && !g.moved && g.tapBlock && onBlockClick) {
      // En mode pixel, si la cellule était libre on a peint -> pas d'ouverture.
      const wasFree = isCellFree(g.startCellX, g.startCellY, blocksRef.current);
      if (!wasFree || g.mode === "zone") {
        zoneRect.current = null;
        onBlockClick(g.tapBlock);
        draw();
        return;
      }
    }

    if (g.mode === "zone" && zoneRect.current) {
      const { x, y, w, h } = zoneRect.current;
      zoneRect.current = null;
      paintZone(x, y, w, h);
      commitPainted();
      return;
    }

    if (g.mode === "paint" || g.mode === "erase") commitPainted();
  };

  // ---- UI -------------------------------------------------------------------
  const cursorClass =
    editor.tool === "move" ? "cursor-grab active:cursor-grabbing"
      : editor.tool === "picker" ? "cursor-copy"
        : editor.tool === "erase" ? "cursor-cell"
          : "cursor-crosshair";

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none touch-none bg-zinc-100">
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={(e) => { setHover(null); setCoords(null); if (gesture.current) finishPointer(e); }}
        onContextMenu={(e) => e.preventDefault()}
        className={cursorClass}
      />

      {/* Coords + zoom */}
      <div className="absolute top-3 right-3 flex items-center gap-2 animate-fade-in">
        {coords && (
          <div className="bg-white/95 backdrop-blur border border-black/[0.06] rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] font-mono text-black/60 tabular-nums">
            {coords.x}, {coords.y}
          </div>
        )}
        <div className="bg-white/95 backdrop-blur border border-black/[0.06] rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] font-medium text-black/50 tabular-nums">
          {Math.round(zoomLabel * 100) >= 100 ? `${Math.round(zoomLabel)}×` : `${Math.round(zoomLabel * 100)}%`}
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-[92px] left-3 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-black/[0.06] p-1.5 animate-fade-in hidden sm:block">
        <canvas ref={miniRef} style={{ width: 96, height: 96 }} className="rounded-md border border-black/[0.06]" />
      </div>

      {/* Zoom */}
      <div className="absolute bottom-[92px] right-3 flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-black/[0.06] p-1 animate-fade-in">
        <button onClick={() => { const c = containerRef.current!; zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1.4); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Zoomer">+</button>
        <button onClick={() => { const c = containerRef.current!; zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1 / 1.4); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] text-lg font-semibold focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Dézoomer">−</button>
        <button onClick={fitToScreen}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Réinitialiser la vue">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
          </svg>
        </button>
      </div>

      {/* Tooltip */}
      {hover && (
        <div className="pointer-events-none absolute z-20 max-w-[220px] bg-black text-white text-[12px] rounded-lg px-3 py-2 shadow-lg animate-fade-in"
          style={{ left: hover.sx + 12, top: hover.sy + 12 }}>
          {hover.block.ownerName && <div className="font-semibold">{hover.block.ownerName}</div>}
          {hover.block.message && <div className="text-white/70">{hover.block.message}</div>}
          {hover.block.forSale && hover.block.salePrice != null && (
            <div className="text-green-300 font-medium mt-0.5">À vendre · {hover.block.salePrice} €</div>
          )}
          {hover.block.link && <div className="text-indigo-300 truncate">{hover.block.link}</div>}
        </div>
      )}
    </div>
  );
}
