import type { PixelBlock, Selection } from "./types";
import { GRID_SIZE } from "./constants";

/** Intersection de deux rectangles (true si chevauchement strictement positif). */
export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Une sélection est-elle libre (aucun chevauchement avec un bloc existant) ? */
export function isSelectionFree(
  sel: Selection,
  blocks: PixelBlock[],
  now: number = Date.now(),
): boolean {
  for (const b of blocks) {
    // On ignore les réservations expirées.
    if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
    if (rectsOverlap(sel, b)) return false;
  }
  return true;
}

/** Borne une sélection à l'intérieur de la grille et garantit w,h >= 1. */
export function clampSelection(sel: Selection): Selection {
  const x = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(sel.x)));
  const y = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(sel.y)));
  const w = Math.max(1, Math.min(GRID_SIZE - x, Math.floor(sel.w)));
  const h = Math.max(1, Math.min(GRID_SIZE - y, Math.floor(sel.h)));
  return { x, y, w, h };
}

/** Construit une sélection normalisée à partir de deux coins (en cellules). */
export function selectionFromCorners(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Selection {
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  const w = Math.abs(ax - bx) + 1;
  const h = Math.abs(ay - by) + 1;
  return clampSelection({ x, y, w, h });
}
