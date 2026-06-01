"use client";

// Miniature d'une création : rend tous les blocs d'un groupe dans un petit
// canvas, à l'échelle, en respectant les couleurs et les positions relatives.

import { useEffect, useRef } from "react";
import type { PixelBlock } from "@/lib/types";

interface Props {
  blocks: PixelBlock[];
  size?: number;
}

export default function GroupThumb({ blocks, size = 56 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || blocks.length === 0) return;

    // Bounding box du groupe.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of blocks) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    const bw = maxX - minX;
    const bh = maxY - minY;
    const scale = Math.max(1, Math.floor(Math.min(size / bw, size / bh)));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    // Centre la création.
    const offX = (size - bw * scale) / 2;
    const offY = (size - bh * scale) / 2;

    const images = new Map<string, HTMLImageElement>();
    const render = () => {
      ctx.clearRect(0, 0, size, size);
      for (const b of blocks) {
        const x = offX + (b.x - minX) * scale;
        const y = offY + (b.y - minY) * scale;
        const w = b.w * scale;
        const h = b.h * scale;
        if (b.fill === "image" && b.imageUrl) {
          const img = images.get(b.imageUrl);
          if (img && img.complete) ctx.drawImage(img, x, y, w, h);
          else { ctx.fillStyle = "#e4e4e7"; ctx.fillRect(x, y, w, h); }
        } else {
          ctx.fillStyle = b.color || "#111";
          ctx.fillRect(x, y, w, h);
        }
      }
    };

    for (const b of blocks) {
      if (b.fill === "image" && b.imageUrl && !images.has(b.imageUrl)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = render;
        img.src = b.imageUrl;
        images.set(b.imageUrl, img);
      }
    }
    render();
  }, [blocks, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      className="rounded-lg border border-black/10 bg-zinc-50 shrink-0"
    />
  );
}
