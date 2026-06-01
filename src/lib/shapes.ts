// Petites formes en pixel-art, générées comme "créations" de démonstration
// pour peupler le canvas et servir de preuve sociale.
//
// Chaque forme est une grille de caractères ; chaque caractère non-espace
// référence une couleur dans `colors`. La forme est posée à (ox, oy) avec
// une taille de cellule `cell` (en pixels du canvas), et chaque pixel-art
// devient un bloc "color".

import type { PixelBlock } from "./types";

interface ShapeDef {
  grid: string[];
  colors: Record<string, string>;
}

const SHAPES: Record<string, ShapeDef> = {
  heart: {
    grid: [
      ".RR.RR.",
      "RRRRRRR",
      "RRRRRRR",
      ".RRRRR.",
      "..RRR..",
      "...R...",
    ],
    colors: { R: "#ef4444" },
  },
  star: {
    grid: [
      "...Y...",
      "...Y...",
      "YYYYYYY",
      ".YYYYY.",
      "..Y.Y..",
      ".Y...Y.",
    ],
    colors: { Y: "#f59e0b" },
  },
  smiley: {
    grid: [
      ".GGGGG.",
      "GGGGGGG",
      "GBGGBGG",
      "GGGGGGG",
      "GBGGGBG",
      "GGBBBGG",
      ".GGGGG.",
    ],
    colors: { G: "#facc15", B: "#111111" },
  },
  arrow: {
    grid: [
      "...B...",
      "..BB...",
      "BBBBBBB",
      "BBBBBBB",
      "..BB...",
      "...B...",
    ],
    colors: { B: "#3b82f6" },
  },
  cloud: {
    grid: [
      "..WWW..",
      ".WWWWW.",
      "WWWWWWW",
      "WWWWWWW",
      ".WWWWW.",
    ],
    colors: { W: "#06b6d4" },
  },
  diamond: {
    grid: [
      "...P...",
      "..PPP..",
      ".PPPPP.",
      "PPPPPPP",
      ".PPPPP.",
      "..PPP..",
      "...P...",
    ],
    colors: { P: "#a855f7" },
  },
  check: {
    grid: [
      "......G",
      ".....GG",
      "G...GG.",
      "GG.GG..",
      ".GGG...",
      "..G....",
    ],
    colors: { G: "#22c55e" },
  },
};

/** Construit les blocs d'une forme posée sur le canvas. */
export function buildShapeBlocks(
  shape: keyof typeof SHAPES,
  opts: {
    ox: number;
    oy: number;
    cell: number;
    idPrefix: string;
    ownerName: string;
    purchaseId: string;
    label: string;
    createdAt: number;
    message?: string;
    link?: string;
  },
): PixelBlock[] {
  const def = SHAPES[shape];
  const blocks: PixelBlock[] = [];
  let n = 0;
  def.grid.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === "." || ch === " ") continue;
      const color = def.colors[ch] || "#111111";
      blocks.push({
        id: `${opts.idPrefix}-${n++}`,
        x: opts.ox + rx * opts.cell,
        y: opts.oy + ry * opts.cell,
        w: opts.cell,
        h: opts.cell,
        fill: "color",
        color,
        status: "active",
        ownerName: opts.ownerName,
        groupLabel: opts.label,
        purchaseId: opts.purchaseId,
        createdAt: opts.createdAt,
        ...(opts.message ? { message: opts.message } : {}),
        ...(opts.link ? { link: opts.link } : {}),
      });
    }
  });
  return blocks;
}

export const SHAPE_NAMES = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
