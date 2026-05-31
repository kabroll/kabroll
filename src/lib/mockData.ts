import type { PixelBlock } from "./types";

// Données de démonstration utilisées tant que Firebase n'est pas configuré,
// pour que le canvas ne soit pas vide pendant le développement du front.
export const MOCK_BLOCKS: PixelBlock[] = [
  { id: "m1", x: 100, y: 100, w: 80, h: 80, fill: "color", color: "#111111", status: "active", ownerName: "Studio Noir", message: "Studio Noir — design" },
  { id: "m2", x: 200, y: 120, w: 60, h: 40, fill: "color", color: "#ef4444", status: "active", ownerName: "RougeVif", message: "RougeVif", link: "https://example.com", forSale: true, salePrice: 120 },
  { id: "m3", x: 320, y: 90, w: 120, h: 60, fill: "color", color: "#3b82f6", status: "active", ownerName: "BleuTech" },
  { id: "m4", x: 480, y: 200, w: 50, h: 50, fill: "color", color: "#22c55e", status: "active", ownerName: "GreenCo" },
  { id: "m5", x: 150, y: 300, w: 200, h: 30, fill: "color", color: "#f59e0b", status: "active", ownerName: "Bannière Or" },
  { id: "m6", x: 600, y: 400, w: 90, h: 90, fill: "color", color: "#a855f7", status: "active", ownerName: "Violet", forSale: true, salePrice: 500 },
  { id: "m7", x: 700, y: 150, w: 40, h: 160, fill: "color", color: "#0ea5e9", status: "active", ownerName: "Tour Cyan" },
  { id: "m8", x: 420, y: 500, w: 70, h: 70, fill: "color", color: "#ec4899", status: "active", ownerName: "Pink" },
  { id: "m9", x: 250, y: 600, w: 110, h: 50, fill: "color", color: "#14b8a6", status: "active", ownerName: "Teal" },
  { id: "m10", x: 800, y: 700, w: 120, h: 120, fill: "color", color: "#111111", status: "active", ownerName: "Carré Noir" },
];
