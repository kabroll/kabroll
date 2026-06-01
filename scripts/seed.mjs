// ===========================================================================
// Script de SEED Firestore — peuple la base de "créations" de démarrage
// (formes pixel-art + faux comptes 1–70 px) pour amorcer la preuve sociale.
//
// Usage :
//   node scripts/seed.mjs          → insère les blocs de seed
//   node scripts/seed.mjs --clear  → supprime UNIQUEMENT les blocs de seed
//   node scripts/seed.mjs --dry    → affiche ce qui serait inséré (sans écrire)
//
// Tous les blocs créés portent un champ { seed: true } et un id préfixé par
// "seed-" → suppression propre et sans risque pour les vrais achats.
// ===========================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- 1) Charge .env.local --------------------------------------------------
function loadEnv() {
  let raw;
  try {
    raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  } catch {
    console.error("❌ .env.local introuvable. Lance ce script depuis la racine du projet.");
    process.exit(1);
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv();

// ---- 2) Init Firebase Admin ------------------------------------------------
const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const p = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return { projectId: p.project_id, clientEmail: p.client_email, privateKey: (p.private_key || "").replace(/\\n/g, "\n") };
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
}

const sa = serviceAccount();
if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
  console.error("❌ Credentials Firebase Admin manquants dans .env.local.");
  process.exit(1);
}

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);
const PIXELS = "pixels";

// ---- 3) Formes pixel-art (mêmes définitions que src/lib/shapes.ts) ---------
const SHAPES = {
  heart: { grid: [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."], colors: { R: "#ef4444" } },
  star: { grid: ["...Y...", "...Y...", "YYYYYYY", ".YYYYY.", "..Y.Y..", ".Y...Y."], colors: { Y: "#f59e0b" } },
  smiley: { grid: [".GGGGG.", "GGGGGGG", "GBGGBGG", "GGGGGGG", "GBGGGBG", "GGBBBGG", ".GGGGG."], colors: { G: "#facc15", B: "#111111" } },
  arrow: { grid: ["...B...", "..BB...", "BBBBBBB", "BBBBBBB", "..BB...", "...B..."], colors: { B: "#3b82f6" } },
  cloud: { grid: ["..WWW..", ".WWWWW.", "WWWWWWW", "WWWWWWW", ".WWWWW."], colors: { W: "#06b6d4" } },
  diamond: { grid: ["...P...", "..PPP..", ".PPPPP.", "PPPPPPP", ".PPPPP.", "..PPP..", "...P..."], colors: { P: "#a855f7" } },
  check: { grid: ["......G", ".....GG", "G...GG.", "GG.GG..", ".GGG...", "..G...."], colors: { G: "#22c55e" } },
};

function shapeBlocks(shape, o) {
  const def = SHAPES[shape];
  const out = [];
  let n = 0;
  def.grid.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === "." || ch === " ") continue;
      out.push({
        id: `seed-${o.idPrefix}-${n++}`,
        x: o.ox + rx * o.cell, y: o.oy + ry * o.cell, w: o.cell, h: o.cell,
        fill: "color", color: def.colors[ch] || "#111111",
        status: "active", ownerName: o.ownerName, groupLabel: o.label,
        purchaseId: `seed-${o.purchaseId}`, createdAt: o.createdAt,
        ...(o.message ? { message: o.message } : {}),
        ...(o.link ? { link: o.link } : {}),
      });
    }
  });
  return out;
}

// ---- 4) Construit le jeu de données ----------------------------------------
// Timestamps relatifs à "maintenant" pour une activité récente crédible.
const now = Date.now();
const ago = (min) => now - min * 60_000;

const banners = [
  { id: "seed-m1", x: 120, y: 120, w: 80, h: 80, fill: "color", color: "#111111", status: "active", ownerName: "studio.noir@gmail.com", message: "Studio Noir — design", purchaseId: "seed-m1", createdAt: ago(150) },
  { id: "seed-m2", x: 230, y: 140, w: 60, h: 40, fill: "color", color: "#ef4444", status: "active", ownerName: "contact@rougevif.fr", message: "RougeVif", link: "https://example.com", forSale: true, salePrice: 120, purchaseId: "seed-m2", createdAt: ago(140) },
  { id: "seed-m3", x: 330, y: 110, w: 120, h: 60, fill: "color", color: "#3b82f6", status: "active", ownerName: "hello@bleutech.io", message: "BleuTech", purchaseId: "seed-m3", createdAt: ago(130) },
  { id: "seed-m5", x: 170, y: 320, w: 200, h: 30, fill: "color", color: "#f59e0b", status: "active", ownerName: "pub@banniereor.com", message: "Bannière Or", purchaseId: "seed-m5", createdAt: ago(100) },
  { id: "seed-m7", x: 720, y: 160, w: 40, h: 160, fill: "color", color: "#0ea5e9", status: "active", ownerName: "tour@cyan.co", message: "Tour Cyan", purchaseId: "seed-m7", createdAt: ago(90) },
  { id: "seed-m10", x: 820, y: 720, w: 120, h: 120, fill: "color", color: "#111111", status: "active", ownerName: "info@carrenoir.fr", message: "Carré Noir", purchaseId: "seed-m10", createdAt: ago(80) },
];

const shapes = [
  ...shapeBlocks("heart", { ox: 500, oy: 600, cell: 14, idPrefix: "heart", ownerName: "marie.dupont@gmail.com", purchaseId: "heart", label: "Mon cœur ❤️", message: "marie ❤️ unmillion", createdAt: ago(10) }),
  ...shapeBlocks("star", { ox: 640, oy: 240, cell: 12, idPrefix: "star", ownerName: "lucas@outlook.com", purchaseId: "star", label: "Étoile", message: "⭐ Lucas", createdAt: ago(20) }),
  ...shapeBlocks("smiley", { ox: 470, oy: 230, cell: 12, idPrefix: "smiley", ownerName: "emma.l@yahoo.fr", purchaseId: "smiley", label: "Smiley", message: "😊", createdAt: ago(5) }),
  ...shapeBlocks("arrow", { ox: 250, oy: 470, cell: 12, idPrefix: "arrow", ownerName: "team@startup.io", purchaseId: "arrow", label: "Flèche", link: "https://startup.io", message: "→ startup.io", createdAt: ago(33) }),
  ...shapeBlocks("cloud", { ox: 360, oy: 690, cell: 12, idPrefix: "cloud", ownerName: "nuage@proton.me", purchaseId: "cloud", label: "Nuage", createdAt: ago(43) }),
  ...shapeBlocks("diamond", { ox: 690, oy: 470, cell: 11, idPrefix: "diamond", ownerName: "vip@diamond.lux", purchaseId: "diamond", label: "Diamant", createdAt: ago(53) }),
  ...shapeBlocks("check", { ox: 150, oy: 640, cell: 12, idPrefix: "check", ownerName: "ok@valide.fr", purchaseId: "check", label: "Validé", createdAt: ago(15) }),
];

const fakeAccounts = [
  { id: "seed-f1", x: 60, y: 60, w: 1, h: 1, fill: "color", color: "#f43f5e", status: "active", ownerName: "tom.b@gmail.com", groupLabel: "Mon 1er pixel", purchaseId: "seed-fa-1", message: "Premier !", createdAt: ago(2) },
  { id: "seed-f2", x: 920, y: 90, w: 2, h: 2, fill: "color", color: "#3b82f6", status: "active", ownerName: "sarah.k@gmail.com", purchaseId: "seed-fa-2", createdAt: ago(4) },
  { id: "seed-f3", x: 880, y: 420, w: 3, h: 3, fill: "color", color: "#22c55e", status: "active", ownerName: "nina@icloud.com", purchaseId: "seed-fa-3", createdAt: ago(8) },
  { id: "seed-f4", x: 70, y: 820, w: 4, h: 4, fill: "color", color: "#f59e0b", status: "active", ownerName: "paulo@gmail.com", purchaseId: "seed-fa-4", createdAt: ago(12) },
  { id: "seed-f5", x: 470, y: 810, w: 5, h: 5, fill: "color", color: "#a855f7", status: "active", ownerName: "yanis.r@hotmail.fr", purchaseId: "seed-fa-5", message: "Yanis était là", createdAt: ago(3) },
  { id: "seed-f6", x: 600, y: 870, w: 7, h: 10, fill: "color", color: "#ec4899", status: "active", ownerName: "lea@gmail.com", groupLabel: "Bloc rose", purchaseId: "seed-fa-6", createdAt: ago(25) },
  { id: "seed-f7", x: 910, y: 560, w: 4, h: 3, fill: "color", color: "#06b6d4", status: "active", ownerName: "max.devs@gmail.com", purchaseId: "seed-fa-7", link: "https://github.com", createdAt: ago(6) },
  { id: "seed-f8", x: 410, y: 430, w: 3, h: 2, fill: "color", color: "#14b8a6", status: "active", ownerName: "clara@yahoo.fr", purchaseId: "seed-fa-8", createdAt: ago(1) },
  { id: "seed-f9", x: 300, y: 200, w: 7, h: 7, fill: "color", color: "#0ea5e9", status: "active", ownerName: "hugo_p@gmail.com", groupLabel: "Carré bleu", purchaseId: "seed-fa-9", createdAt: ago(35) },
  { id: "seed-f10", x: 560, y: 420, w: 6, h: 5, fill: "color", color: "#eab308", status: "active", ownerName: "zoe@gmail.com", purchaseId: "seed-fa-10", createdAt: ago(3) },
  { id: "seed-f11", x: 790, y: 660, w: 2, h: 1, fill: "color", color: "#111111", status: "active", ownerName: "ali.b@gmail.com", purchaseId: "seed-fa-11", createdAt: ago(1) },
  { id: "seed-f12", x: 120, y: 500, w: 10, h: 5, fill: "color", color: "#84cc16", status: "active", ownerName: "manon@gmail.com", groupLabel: "Bannière verte", purchaseId: "seed-fa-12", forSale: true, salePrice: 60, createdAt: ago(50) },
  { id: "seed-f13a", x: 950, y: 750, w: 5, h: 5, fill: "color", color: "#ef4444", status: "active", ownerName: "kevin.m@gmail.com", groupLabel: "Drapeau", purchaseId: "seed-fa-13", createdAt: ago(7) },
  { id: "seed-f13b", x: 955, y: 750, w: 4, h: 5, fill: "color", color: "#ffffff", status: "active", ownerName: "kevin.m@gmail.com", groupLabel: "Drapeau", purchaseId: "seed-fa-13", createdAt: ago(7) },
];

const ALL = [...banners, ...shapes, ...fakeAccounts].map((b) => ({ ...b, seed: true }));

// ---- 5) Exécution ----------------------------------------------------------
const mode = process.argv[2];

async function clearSeed() {
  const snap = await db.collection(PIXELS).where("seed", "==", true).get();
  if (snap.empty) {
    console.log("Aucun bloc de seed à supprimer.");
    return;
  }
  let n = 0;
  // Batch de 400 max.
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => { batch.delete(d.ref); n++; });
    await batch.commit();
  }
  console.log(`🗑️  ${n} bloc(s) de seed supprimé(s).`);
}

async function insertSeed() {
  // Vérifie les chevauchements avec les vrais blocs (actifs/pending non-seed).
  const existing = await db.collection(PIXELS).where("status", "in", ["active", "pending"]).get();
  const real = existing.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => !b.seed);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const conflicts = ALL.filter((s) => real.some((r) => overlap(s, r)));
  if (conflicts.length) {
    console.warn(`⚠️  ${conflicts.length} bloc(s) de seed chevauchent de vrais pixels — ils seront ignorés.`);
  }
  const toWrite = ALL.filter((s) => !real.some((r) => overlap(s, r)));

  let n = 0;
  for (let i = 0; i < toWrite.length; i += 400) {
    const batch = db.batch();
    toWrite.slice(i, i + 400).forEach((b) => {
      const { id, ...data } = b;
      batch.set(db.collection(PIXELS).doc(id), data, { merge: true });
      n++;
    });
    await batch.commit();
  }
  const pixels = toWrite.reduce((a, b) => a + b.w * b.h, 0);
  console.log(`✅ ${n} bloc(s) de seed insérés (${pixels} pixels au total).`);
}

if (mode === "--clear") {
  await clearSeed();
} else if (mode === "--dry") {
  const pixels = ALL.reduce((a, b) => a + b.w * b.h, 0);
  const creations = new Set(ALL.map((b) => b.purchaseId)).size;
  console.log(`[dry-run] ${ALL.length} blocs · ${creations} créations · ${pixels} pixels. Aucune écriture.`);
} else {
  await insertSeed();
}

process.exit(0);
