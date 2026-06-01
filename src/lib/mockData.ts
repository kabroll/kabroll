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

// Une douzaine de "faux comptes" : petites commandes de 1 à 70 pixels,
// réparties dans des zones libres, pour donner l'impression que beaucoup de
// monde a déjà acheté. Emails masqués à l'affichage (preuve sociale).
const fakeAccounts: PixelBlock[] = [
  { id: "f1", x: 60, y: 60, w: 1, h: 1, fill: "color", color: "#f43f5e", status: "active", ownerName: "tom.b@gmail.com", groupLabel: "Mon 1er pixel", purchaseId: "fa-1", message: "Premier !", createdAt: T0 - 120_000 },
  { id: "f2", x: 920, y: 90, w: 2, h: 2, fill: "color", color: "#3b82f6", status: "active", ownerName: "sarah.k@gmail.com", purchaseId: "fa-2", createdAt: T0 - 240_000 },
  { id: "f3", x: 880, y: 420, w: 3, h: 3, fill: "color", color: "#22c55e", status: "active", ownerName: "nina@icloud.com", purchaseId: "fa-3", createdAt: T0 - 480_000 },
  { id: "f4", x: 70, y: 820, w: 4, h: 4, fill: "color", color: "#f59e0b", status: "active", ownerName: "paulo@gmail.com", purchaseId: "fa-4", createdAt: T0 - 720_000 },
  { id: "f5", x: 470, y: 810, w: 5, h: 5, fill: "color", color: "#a855f7", status: "active", ownerName: "yanis.r@hotmail.fr", purchaseId: "fa-5", message: "Yanis était là", createdAt: T0 - 150_000 },
  { id: "f6", x: 600, y: 870, w: 7, h: 10, fill: "color", color: "#ec4899", status: "active", ownerName: "lea@gmail.com", groupLabel: "Bloc rose", purchaseId: "fa-6", createdAt: T0 - 1_500_000 },
  { id: "f7", x: 910, y: 560, w: 4, h: 3, fill: "color", color: "#06b6d4", status: "active", ownerName: "max.devs@gmail.com", purchaseId: "fa-7", link: "https://github.com", createdAt: T0 - 360_000 },
  { id: "f8", x: 410, y: 430, w: 3, h: 2, fill: "color", color: "#14b8a6", status: "active", ownerName: "clara@yahoo.fr", purchaseId: "fa-8", createdAt: T0 - 90_000 },
  { id: "f9", x: 300, y: 200, w: 7, h: 7, fill: "color", color: "#0ea5e9", status: "active", ownerName: "hugo_p@gmail.com", groupLabel: "Carré bleu", purchaseId: "fa-9", createdAt: T0 - 2_100_000 },
  { id: "f10", x: 560, y: 420, w: 6, h: 5, fill: "color", color: "#eab308", status: "active", ownerName: "zoe@gmail.com", purchaseId: "fa-10", createdAt: T0 - 200_000 },
  { id: "f11", x: 790, y: 660, w: 2, h: 1, fill: "color", color: "#111111", status: "active", ownerName: "ali.b@gmail.com", purchaseId: "fa-11", createdAt: T0 - 30_000 },
  { id: "f12", x: 120, y: 500, w: 10, h: 5, fill: "color", color: "#84cc16", status: "active", ownerName: "manon@gmail.com", groupLabel: "Bannière verte", purchaseId: "fa-12", forSale: true, salePrice: 60, createdAt: T0 - 3_000_000 },

  // Une création de faux compte en 2 couleurs (drapeau) = 45 px sur 2 blocs.
  { id: "f13a", x: 950, y: 750, w: 5, h: 5, fill: "color", color: "#ef4444", status: "active", ownerName: "kevin.m@gmail.com", groupLabel: "Drapeau", purchaseId: "fa-13", createdAt: T0 - 420_000 },
  { id: "f13b", x: 955, y: 750, w: 4, h: 5, fill: "color", color: "#ffffff", status: "active", ownerName: "kevin.m@gmail.com", groupLabel: "Drapeau", purchaseId: "fa-13", createdAt: T0 - 420_000 },
];

export const MOCK_BLOCKS: PixelBlock[] = [...banners, ...shapes, ...fakeAccounts];
