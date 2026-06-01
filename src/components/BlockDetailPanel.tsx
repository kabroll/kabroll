"use client";

// Panneau de détail d'un bloc existant (au clic sur le canvas).
// - Propriétaire : statut de vente + gestion rapide.
// - Visiteur : rachat direct (si en vente) et/ou proposition d'offre.

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui";
import GroupThumb from "@/components/GroupThumb";
import { buyResale, makeOffer, unlistBlock } from "@/lib/api";
import { MIN_SALE_PRICE_EUR, formatEUR, formatNumber } from "@/lib/constants";
import { publicOwnerName } from "@/lib/display";
import type { PixelBlock } from "@/lib/types";

interface Props {
  block: PixelBlock;
  /** Tous les blocs (pour retrouver les frères d'une création en vente). */
  allBlocks?: PixelBlock[];
  onClose: () => void;
}

export default function BlockDetailPanel({ block, allBlocks = [], onClose }: Props) {
  const { user, openAuth } = useAuth();
  const toast = useToast();
  const [offerOpen, setOfferOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si le bloc est vendu dans le cadre d'une création entière, on agrège
  // tous les blocs du groupe pour afficher prix total et pixels totaux.
  const groupBlocks = block.saleGroupId
    ? allBlocks.filter((b) => b.saleGroupId === block.saleGroupId)
    : [block];
  const isGroupSale = block.saleGroupId ? groupBlocks.length > 1 : false;

  const isOwner = !!user && block.ownerId === user.uid;
  const pixels = groupBlocks.reduce((a, b) => a + b.w * b.h, 0);
  const groupPrice = groupBlocks.reduce((a, b) => a + (b.salePrice || 0), 0);
  const reservedForMe = block.reservedForUid && block.reservedForUid === user?.uid;
  const reservedForOther = block.reservedForUid && block.reservedForUid !== user?.uid;
  const canBuyNow = block.forSale && !!block.salePrice && !reservedForOther && !isOwner;

  async function handleBuy() {
    setError(null);
    if (!user) {
      openAuth();
      return;
    }
    setLoading(true);
    try {
      await buyResale(block.id); // redirige vers Stripe
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  async function handleOffer() {
    setError(null);
    if (!user) {
      openAuth();
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_SALE_PRICE_EUR) {
      setError(`Montant minimum : ${formatEUR(MIN_SALE_PRICE_EUR)}.`);
      return;
    }
    setLoading(true);
    try {
      await makeOffer(block.id, amt);
      toast.success("Offre envoyée ! Le propriétaire sera notifié.");
      setOfferOpen(false);
      setAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlist() {
    setError(null);
    setLoading(true);
    try {
      await unlistBlock(block.id);
      toast.success("Bloc retiré de la vente.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/?block=${block.id}&x=${block.x}&y=${block.y}&w=${block.w}&h=${block.h}`
        : "";
    const shareData = {
      title: "PixelMillions",
      text: `Regarde ce bloc de pixels sur PixelMillions (${block.w}×${block.h})`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papier !");
      }
    } catch {
      /* l'utilisateur a annulé le partage */
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 sm:hidden animate-fade-in" onClick={onClose} />

      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] max-h-[85vh] flex flex-col animate-panel-up">
        {/* Poignée (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-9 h-1 rounded-full bg-black/15" />
        </div>
        {/* En-tête */}
        <div className="flex items-start gap-3 px-5 py-2.5 sm:py-3.5 border-b border-black/[0.06] shrink-0">
          {isGroupSale ? (
            <GroupThumb blocks={groupBlocks} size={48} />
          ) : (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-zinc-100">
              {block.fill === "image" && block.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: block.color || "#111" }} />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate">
              {isGroupSale && block.groupLabel ? block.groupLabel : publicOwnerName(block.ownerName)}
            </div>
            <div className="text-[12px] text-black/40">
              {isGroupSale
                ? `Création · ${groupBlocks.length} blocs · ${formatNumber(pixels)} px`
                : `${block.w} × ${block.h} · ${formatNumber(pixels)} px · (${block.x}, ${block.y})`}
            </div>
          </div>
          <button
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/[0.06] text-black/35 hover:text-black/70 transition-colors"
            aria-label="Partager"
            title="Partager"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.2 10.6a3 3 0 100 2.8m0-2.8a3 3 0 110 2.8m0-2.8l9.6-5.4m-9.6 8.2l9.6 5.4M16.8 5.2a3 3 0 100-.1zm0 13.6a3 3 0 100 .1z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/[0.06] text-black/30 hover:text-black/60 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {block.message && (
            <p className="text-[13px] text-black/70">{block.message}</p>
          )}
          {block.link && (
            <a
              href={block.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[13px] text-accent truncate hover:underline"
            >
              {block.link}
            </a>
          )}
          {!!block.resaleCount && (
            <div className="text-[12px] text-black/40">
              Revendu {block.resaleCount} fois
            </div>
          )}

          {block.forSale && block.salePrice != null && (
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3.5 py-3">
              <span className="text-[13px] text-green-700 font-medium">
                {isGroupSale ? "Création à vendre" : "À vendre"}
              </span>
              <span className="text-[18px] font-bold text-green-700">
                {formatEUR(isGroupSale ? groupPrice : block.salePrice)}
              </span>
            </div>
          )}

          {reservedForMe && (
            <div className="text-[12px] text-accent bg-accent-soft border border-accent/15 rounded-xl px-3 py-2">
              Votre offre a été acceptée — finalisez le paiement ci-dessous.
            </div>
          )}
          {reservedForOther && !isOwner && (
            <div className="text-[12px] text-black/50 bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2">
              Ce bloc est réservé à un autre acheteur (offre acceptée).
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Formulaire d'offre */}
          {offerOpen && !isOwner && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider">
                Votre offre (€)
              </label>
              <input
                type="number"
                min={MIN_SALE_PRICE_EUR}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ex. 150"
                autoFocus
                className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-black/[0.06] shrink-0 space-y-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {isOwner ? (
            <>
              {block.forSale ? (
                <Button onClick={handleUnlist} loading={loading} variant="secondary" fullWidth className="py-3.5 rounded-2xl">
                  Retirer de la vente
                </Button>
              ) : (
                <p className="text-[12px] text-black/40 text-center">
                  Vous possédez ce bloc — mettez-le en vente depuis votre profil.
                </p>
              )}
            </>
          ) : (
            <>
              {canBuyNow && (
                <Button onClick={handleBuy} loading={loading} fullWidth className="py-3.5 rounded-2xl">
                  {loading
                    ? "Redirection…"
                    : `Acheter ${isGroupSale ? "la création" : ""} pour ${formatEUR(isGroupSale ? groupPrice : block.salePrice!)}`}
                </Button>
              )}
              {!reservedForOther &&
                (offerOpen ? (
                  <Button onClick={handleOffer} loading={loading} variant="secondary" fullWidth className="py-3.5 rounded-2xl">
                    Envoyer l&apos;offre
                  </Button>
                ) : (
                  <Button
                    onClick={() => (user ? setOfferOpen(true) : openAuth())}
                    variant="secondary"
                    fullWidth
                    className="py-3.5 rounded-2xl"
                  >
                    {user ? "Faire une offre" : "Se connecter pour acheter / proposer"}
                  </Button>
                ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
