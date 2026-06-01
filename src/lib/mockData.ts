import type { PixelBlock } from "./types";
import { buildShapeBlocks } from "./shapes";

// Données de démonstration (tant que Firebase n'est pas configuré).
// On y mêle de grandes zones publicitaires et des PETITES FORMES pixel-art
// avec des "propriétaires" (emails masqués à l'affichage) pour donner une
// impression de communauté active = preuve sociale.

const T0 = 1_780_000_000_000; // base timestamp fixe (évite Date.now() au build)

const banners: PixelBlock[] = [
  { id: "m1", x: 120, y: 120, w: 80, h: 80, fill: "color", color: "#111111", status: "active", ownerName: "studio.noir@gmail.com", message: "Studio Noir — design", createdAt: T0 - 9_000_000 },
  { id: "m2", x: 230, y: 140, w: 60, h: 40, fill: "color", color: "#ef4444", status: "active", ownerName: "contact@rougevif.fr", message: "RougeVif", link: "https://example.com", forSale: true, salePrice: 120, createdAt: T0 - 8_400_000 },
  { id: "m3", x: 330, y: 110, w: 120, h: 60, fill: "color", color: "#3b82f6", status: "active", ownerName: "hello@bleutech.io", message: "BleuTech", createdAt: T0 - 7_800_000 },
  { id: "m5", x: 170, y: 320, w: 200, h: 30, fill: "color", color: "#f59e0b", status: "active", ownerName: "pub@banniereor.com", message: "Bannière Or", createdAt: T0 - 6_000_000 },
  { id: "m7", x: 720, y: 160, w: 40, h: 160, fill: "color", color: "#0ea5e9", status: "active", ownerName: "tour@cyan.co", message: "Tour Cyan", createdAt: T0 - 5_400_000 },
  { id: "m10", x: 820, y: 720, w: 120, h: 120, fill: "color", color: "#111111", status: "active", ownerName: "info@carrenoir.fr", message: "Carré Noir", createdAt: T0 - 4_800_000 },
];

// Petites formes pixel-art (cell = taille d'un "pixel" de la forme).
const shapes: PixelBlock[] = [
  ...buildShapeBlocks("heart", { ox: 500, oy: 600, cell: 14, idPrefix: "s-heart", ownerName: "marie.dupont@gmail.com", purchaseId: "demo-heart", label: "Mon cœur ❤️", message: "marie ❤️ unmillion", createdAt: T0 - 600_000 }),
  ...buildShapeBlocks("star", { ox: 640, oy: 240, cell: 12, idPrefix: "s-star", ownerName: "lucas@outlook.com", purchaseId: "demo-star", label: "Étoile", message: "⭐ Lucas", createdAt: T0 - 1_200_000 }),
  ...buildShapeBlocks("smiley", { ox: 470, oy: 230, cell: 12, idPrefix: "s-smiley", ownerName: "emma.l@yahoo.fr", purchaseId: "demo-smiley", label: "Smiley", message: "😊", createdAt: T0 - 300_000 }),
  ...buildShapeBlocks("arrow", { ox: 250, oy: 470, cell: 12, idPrefix: "s-arrow", ownerName: "team@startup.io", purchaseId: "demo-arrow", label: "Flèche", link: "https://startup.io", message: "→ startup.io", createdAt: T0 - 2_000_000 }),
  ...buildShapeBlocks("cloud", { ox: 360, oy: 690, cell: 12, idPrefix: "s-cloud", ownerName: "nuage@proton.me", purchaseId: "demo-cloud", label: "Nuage", createdAt: T0 - 2_600_000 }),
  ...buildShapeBlocks("diamond", { ox: 690, oy: 470, cell: 11, idPrefix: "s-diamond", ownerName: "vip@diamond.lux", purchaseId: "demo-diamond", label: "Diamant", createdAt: T0 - 3_200_000 }),
  ...buildShapeBlocks("check", { ox: 150, oy: 640, cell: 12, idPrefix: "s-check", ownerName: "ok@valide.fr", purchaseId: "demo-check", label: "Validé", createdAt: T0 - 900_000 }),
];

export const MOCK_BLOCKS: PixelBlock[] = [...banners, ...shapes];
