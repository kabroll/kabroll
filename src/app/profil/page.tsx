"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { usePixels } from "@/lib/usePixels";
import { useOffers } from "@/lib/useOffers";
import {
  buyResale, listBlock, unlistBlock,
  listGroup, unlistGroup, respondOffer,
} from "@/lib/api";
import GroupThumb from "@/components/GroupThumb";
import {
  MIN_SALE_PRICE_EUR,
  PRICE_PER_PIXEL_EUR,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { Offer, PixelBlock } from "@/lib/types";

/** Regroupe les blocs d'un même achat (création). */
interface Group {
  key: string;
  purchaseId?: string;
  label?: string;
  blocks: PixelBlock[];
  pixels: number;
  forSale: boolean;
  salePriceTotal: number;
}

function groupBlocks(blocks: PixelBlock[]): Group[] {
  const map = new Map<string, Group>();
  for (const b of blocks) {
    const key = b.purchaseId || b.id;
    const g = map.get(key) || {
      key,
      purchaseId: b.purchaseId,
      label: b.groupLabel,
      blocks: [],
      pixels: 0,
      forSale: false,
      salePriceTotal: 0,
    };
    g.blocks.push(b);
    g.pixels += b.w * b.h;
    if (b.forSale) { g.forSale = true; g.salePriceTotal += b.salePrice || 0; }
    if (!g.label && b.groupLabel) g.label = b.groupLabel;
    map.set(key, g);
  }
  return Array.from(map.values()).sort(
    (a, b) => (b.blocks[0]?.createdAt || 0) - (a.blocks[0]?.createdAt || 0),
  );
}

export default function ProfilPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { blocks } = usePixels();
  const { received, sent } = useOffers(user?.uid);

  const mine = useMemo(
    () =>
      blocks.filter(
        (b) => b.status === "active" && user && b.ownerId === user.uid,
      ),
    [blocks, user],
  );

  const groups = useMemo(() => groupBlocks(mine), [mine]);
  const totalPixels = mine.reduce((acc, b) => acc + b.w * b.h, 0);
  const totalSpent = totalPixels * PRICE_PER_PIXEL_EUR;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-black/[0.06] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-black/[0.06] rounded animate-pulse" />
            <div className="h-3 w-24 bg-black/[0.06] rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-black/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.7 0-5.2-.6-7.5-1.65z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Mon profil</h1>
        <p className="text-[14px] text-black/45 mb-6">
          Connectez-vous pour gérer vos pixels, ventes et offres.
        </p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-accent text-white text-[14px] font-semibold rounded-xl hover:bg-accent-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
        >
          Se connecter avec Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {/* En-tête profil */}
      <div className="flex items-center gap-4 mb-8">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center text-xl font-semibold">
            {(user.displayName || user.email || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            {user.displayName || user.email}
          </h1>
          <button
            onClick={signOut}
            className="text-[13px] text-black/40 hover:text-black transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Pixels" value={formatNumber(totalPixels)} />
        <Stat label="Blocs" value={String(mine.length)} />
        <Stat label="Valeur (achat)" value={formatEUR(totalSpent)} />
      </div>

      {/* Offres reçues */}
      {received.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-black/35 uppercase tracking-wider mb-3">
            Offres reçues ({received.length})
          </h2>
          <div className="space-y-2">
            {received.map((o) => (
              <ReceivedOfferRow key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      {/* Mes offres envoyées */}
      {sent.filter((o) => o.status === "pending" || o.status === "accepted").length > 0 && (
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-black/35 uppercase tracking-wider mb-3">
            Mes offres envoyées
          </h2>
          <div className="space-y-2">
            {sent
              .filter((o) => o.status === "pending" || o.status === "accepted")
              .map((o) => (
                <SentOfferRow key={o.id} offer={o} />
              ))}
          </div>
        </section>
      )}

      {/* Mes créations */}
      <h2 className="text-[13px] font-semibold text-black/35 uppercase tracking-wider mb-3">
        Mes créations ({groups.length})
      </h2>

      {groups.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-black/10">
          <p className="text-black/40 text-[14px]">Vous ne possédez pas encore de pixels.</p>
          <Link
            href="/?buy=1"
            className="inline-block mt-4 px-5 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-xl hover:bg-accent-700 transition-colors"
          >
            Créer mes pixels
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard key={g.key} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] px-4 py-3.5">
      <div className="text-[20px] font-bold leading-none">{value}</div>
      <div className="text-[12px] text-black/40 mt-1.5">{label}</div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const toast = useToast();
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isGroup = group.blocks.length > 1 && !!group.purchaseId;
  const reserved = group.blocks.some((b) => b.reservedForUid);

  async function listWhole() {
    const p = Number(price);
    if (!Number.isFinite(p) || p < MIN_SALE_PRICE_EUR) {
      toast.error(`Prix min. ${formatEUR(MIN_SALE_PRICE_EUR)}`);
      return;
    }
    setBusy(true);
    try {
      if (isGroup) await listGroup(group.purchaseId!, p);
      else await listBlock(group.blocks[0].id, p);
      toast.success(`Mis en vente à ${formatEUR(p)}.`);
      setPrice("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function unlistWhole() {
    setBusy(true);
    try {
      if (isGroup) await unlistGroup(group.purchaseId!);
      else await unlistBlock(group.blocks[0].id);
      toast.success("Retiré de la vente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-3 rounded-2xl border border-black/[0.06]">
      <div className="flex items-center gap-3">
        <GroupThumb blocks={group.blocks} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold truncate">
            {group.label || (isGroup ? "Création" : "Bloc")}
          </div>
          <div className="text-[12px] text-black/40">
            {formatNumber(group.pixels)} px · {group.blocks.length} bloc{group.blocks.length > 1 ? "s" : ""}
          </div>
          {group.forSale && (
            <div className="text-[12px] text-green-700 mt-0.5">
              En vente · {formatEUR(group.salePriceTotal)}{reserved ? " (réservé)" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Vente du groupe entier */}
      <div className="mt-3">
        {group.forSale ? (
          <button
            onClick={unlistWhole}
            disabled={busy}
            className="w-full text-[13px] font-medium px-3 py-2 rounded-xl border border-black/10 hover:bg-black/[0.03] disabled:opacity-40 transition-colors"
          >
            Retirer de la vente
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_SALE_PRICE_EUR}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`Prix € ${isGroup ? "(création entière)" : ""}`}
              className="flex-1 bg-black/[0.02] border border-black/[0.06] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-accent/40"
            />
            <button
              onClick={listWhole}
              disabled={busy}
              className="text-[13px] font-semibold px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent-700 disabled:opacity-40 transition-colors shrink-0"
            >
              Vendre {isGroup ? "tout" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Vente pièce par pièce (créations multi-blocs) */}
      {isGroup && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[12px] text-black/45 hover:text-black/70 transition-colors flex items-center gap-1"
          >
            <svg className={"w-3.5 h-3.5 transition-transform " + (expanded ? "rotate-90" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Vendre pièce par pièce ({group.blocks.length} blocs)
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 pl-1">
              {group.blocks.map((b) => (
                <PieceRow key={b.id} block={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PieceRow({ block }: { block: PixelBlock }) {
  const toast = useToast();
  const [price, setPrice] = useState(block.salePrice ? String(block.salePrice) : "");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (block.forSale) {
        await unlistBlock(block.id);
        toast.success("Pièce retirée.");
      } else {
        const p = Number(price);
        if (!Number.isFinite(p) || p < MIN_SALE_PRICE_EUR) {
          toast.error(`Prix min. ${formatEUR(MIN_SALE_PRICE_EUR)}`);
          setBusy(false);
          return;
        }
        await listBlock(block.id, p);
        toast.success(`Pièce en vente à ${formatEUR(p)}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className="w-6 h-6 rounded border border-black/10 shrink-0"
        style={{ backgroundColor: block.fill === "color" ? block.color || "#111" : "#9ca3af" }}
      />
      <span className="text-black/45 w-24 shrink-0">{block.w}×{block.h} ({block.x},{block.y})</span>
      {block.forSale ? (
        <>
          <span className="flex-1 text-green-700">{formatEUR(block.salePrice || 0)}</span>
          <button onClick={toggle} disabled={busy} className="px-2.5 py-1 rounded-lg border border-black/10 hover:bg-black/[0.03] disabled:opacity-40">Retirer</button>
        </>
      ) : (
        <>
          <input type="number" min={MIN_SALE_PRICE_EUR} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="€"
            className="flex-1 min-w-0 bg-black/[0.02] border border-black/[0.06] rounded-lg px-2 py-1 focus:outline-none focus:border-accent/40" />
          <button onClick={toggle} disabled={busy} className="px-2.5 py-1 rounded-lg bg-accent text-white hover:bg-accent-700 disabled:opacity-40 shrink-0">Vendre</button>
        </>
      )}
    </div>
  );
}

function ReceivedOfferRow({ offer }: { offer: Offer }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      await respondOffer(offer.id, action);
      toast.success(
        action === "accept"
          ? "Offre acceptée. L'acheteur va finaliser le paiement."
          : "Offre refusée.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const s = offer.blockSnapshot;
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-black/[0.06]">
      <div className="flex-1 min-w-0">
        <div className="text-[13px]">
          <span className="font-semibold">{offer.fromName}</span> propose{" "}
          <span className="font-semibold">{formatEUR(offer.amount)}</span>
        </div>
        {s && (
          <div className="text-[12px] text-black/40">
            bloc {s.w}×{s.h} en ({s.x}, {s.y})
          </div>
        )}
        {err && <div className="text-[11px] text-red-600">{err}</div>}
      </div>
      <button
        onClick={() => respond("reject")}
        disabled={busy}
        className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/[0.03] disabled:opacity-40"
      >
        Refuser
      </button>
      <button
        onClick={() => respond("accept")}
        disabled={busy}
        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-700 disabled:opacity-40 transition-colors"
      >
        Accepter
      </button>
    </div>
  );
}

function SentOfferRow({ offer }: { offer: Offer }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = offer.blockSnapshot;

  async function cancel() {
    setBusy(true);
    setErr(null);
    try {
      await respondOffer(offer.id, "cancel");
      toast.info("Offre annulée.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    setErr(null);
    try {
      await buyResale(offer.blockId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setErr(msg);
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-black/[0.06]">
      <div className="flex-1 min-w-0">
        <div className="text-[13px]">
          Offre de <span className="font-semibold">{formatEUR(offer.amount)}</span>
          {s && <span className="text-black/40"> · bloc {s.w}×{s.h} ({s.x}, {s.y})</span>}
        </div>
        <div className="text-[12px]">
          {offer.status === "accepted" ? (
            <span className="text-green-700">Acceptée — finalisez le paiement</span>
          ) : (
            <span className="text-black/40">En attente de réponse</span>
          )}
        </div>
        {err && <div className="text-[11px] text-red-600">{err}</div>}
      </div>
      {offer.status === "accepted" ? (
        <button
          onClick={pay}
          disabled={busy}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-700 disabled:opacity-40 transition-colors"
        >
          Payer
        </button>
      ) : (
        <button
          onClick={cancel}
          disabled={busy}
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/[0.03] disabled:opacity-40"
        >
          Annuler
        </button>
      )}
    </div>
  );
}
