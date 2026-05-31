"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { usePixels } from "@/lib/usePixels";
import { useOffers } from "@/lib/useOffers";
import { buyResale, listBlock, respondOffer, unlistBlock } from "@/lib/api";
import {
  MIN_SALE_PRICE_EUR,
  PRICE_PER_PIXEL_EUR,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { Offer, PixelBlock } from "@/lib/types";

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

  const totalPixels = mine.reduce((acc, b) => acc + b.w * b.h, 0);
  const totalSpent = totalPixels * PRICE_PER_PIXEL_EUR;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-black/40">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Mon profil</h1>
        <p className="text-[14px] text-black/45 mb-6">
          Connectez-vous pour gérer vos pixels, ventes et offres.
        </p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-black text-white text-[14px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
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

      {/* Mes pixels */}
      <h2 className="text-[13px] font-semibold text-black/35 uppercase tracking-wider mb-3">
        Mes pixels
      </h2>

      {mine.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-black/10">
          <p className="text-black/40 text-[14px]">Vous ne possédez pas encore de pixels.</p>
          <Link
            href="/?buy=1"
            className="inline-block mt-4 px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Acheter des pixels
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mine.map((b) => (
            <OwnedBlockCard key={b.id} block={b} />
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

function BlockThumb({ block }: { block: PixelBlock }) {
  const b = block;
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-zinc-100">
      {b.fill === "image" && b.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="w-full h-full" style={{ backgroundColor: b.color || "#111" }} />
      )}
    </div>
  );
}

function OwnedBlockCard({ block }: { block: PixelBlock }) {
  const [price, setPrice] = useState<string>(
    block.salePrice ? String(block.salePrice) : "",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doList() {
    setErr(null);
    const p = Number(price);
    if (!Number.isFinite(p) || p < MIN_SALE_PRICE_EUR) {
      setErr(`Prix min. ${formatEUR(MIN_SALE_PRICE_EUR)}`);
      return;
    }
    setBusy(true);
    try {
      await listBlock(block.id, p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function doUnlist() {
    setBusy(true);
    setErr(null);
    try {
      await unlistBlock(block.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-3 rounded-2xl border border-black/[0.06] space-y-3">
      <div className="flex items-center gap-3">
        <BlockThumb block={block} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">
            {block.w} × {block.h} · {formatNumber(block.w * block.h)} px
          </div>
          <div className="text-[12px] text-black/40">position ({block.x}, {block.y})</div>
        </div>
      </div>

      {block.forSale ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
            En vente · {formatEUR(block.salePrice || 0)}
            {block.reservedForUid ? " (réservé)" : ""}
          </span>
          <button
            onClick={doUnlist}
            disabled={busy}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/[0.03] disabled:opacity-40"
          >
            Retirer
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={MIN_SALE_PRICE_EUR}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Prix €"
            className="flex-1 bg-black/[0.02] border border-black/[0.06] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-black/20"
          />
          <button
            onClick={doList}
            disabled={busy}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            Mettre en vente
          </button>
        </div>
      )}
      {err && <div className="text-[11px] text-red-600">{err}</div>}
    </div>
  );
}

function ReceivedOfferRow({ offer }: { offer: Offer }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function respond(action: "accept" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      await respondOffer(offer.id, action);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
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
        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 disabled:opacity-40"
      >
        Accepter
      </button>
    </div>
  );
}

function SentOfferRow({ offer }: { offer: Offer }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = offer.blockSnapshot;

  async function cancel() {
    setBusy(true);
    setErr(null);
    try {
      await respondOffer(offer.id, "cancel");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
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
      setErr(e instanceof Error ? e.message : "Erreur.");
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
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 disabled:opacity-40"
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
