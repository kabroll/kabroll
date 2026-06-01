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

// ===========================================================================
// Sélection par cellules (peinture libre + gomme)
// ===========================================================================

/** Clé d'une cellule pour un Set/Map. */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Décode une clé de cellule. */
export function parseCellKey(k: string): { x: number; y: number } {
  const i = k.indexOf(",");
  return { x: Number(k.slice(0, i)), y: Number(k.slice(i + 1)) };
}

/** Une cellule (x,y) est-elle libre de tout bloc existant ? */
export function isCellFree(
  x: number,
  y: number,
  blocks: PixelBlock[],
  now: number = Date.now(),
): boolean {
  for (const b of blocks) {
    if (b.status === "pending" && b.expiresAt && b.expiresAt < now) continue;
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return false;
  }
  return true;
}

/** Rectangle englobant d'un ensemble de cellules (ou null si vide). */
export function cellsBoundingBox(cells: Set<string>): Selection | null {
  if (cells.size === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of cells) {
    const { x, y } = parseCellKey(k);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Décompose un ensemble de cellules en rectangles maximaux (couverture
 * gloutonne). Permet de stocker une sélection libre comme peu de blocs.
 */
export function decomposeCellsToRects(cells: Set<string>): Selection[] {
  const remaining = new Set(cells);
  const rects: Selection[] = [];

  // Tri par (y, x) croissant pour un balayage déterministe.
  const sorted = Array.from(remaining)
    .map(parseCellKey)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  for (const start of sorted) {
    const sk = cellKey(start.x, start.y);
    if (!remaining.has(sk)) continue;

    // Étend vers la droite tant que contigu.
    let w = 1;
    while (remaining.has(cellKey(start.x + w, start.y))) w++;

    // Étend vers le bas tant que toute la bande [x..x+w-1] est présente.
    let h = 1;
    let canExtend = true;
    while (canExtend) {
      const ny = start.y + h;
      for (let dx = 0; dx < w; dx++) {
        if (!remaining.has(cellKey(start.x + dx, ny))) {
          canExtend = false;
          break;
        }
      }
      if (canExtend) h++;
    }

    // Consomme le rectangle.
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        remaining.delete(cellKey(start.x + dx, start.y + dy));
      }
    }
    rects.push({ x: start.x, y: start.y, w, h });
  }

  return rects;
}
