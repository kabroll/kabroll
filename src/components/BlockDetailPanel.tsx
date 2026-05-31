"use client";

// Panneau de détail d'un bloc existant (au clic sur le canvas).
// - Propriétaire : statut de vente + gestion rapide.
// - Visiteur : rachat direct (si en vente) et/ou proposition d'offre.

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { buyResale, makeOffer, unlistBlock } from "@/lib/api";
import { MIN_SALE_PRICE_EUR, formatEUR, formatNumber } from "@/lib/constants";
import type { PixelBlock } from "@/lib/types";

interface Props {
  block: PixelBlock;
  onClose: () => void;
}

export default function BlockDetailPanel({ block, onClose }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const [offerOpen, setOfferOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = !!user && block.ownerId === user.uid;
  const pixels = block.w * block.h;
  const reservedForMe = block.reservedForUid && block.reservedForUid === user?.uid;
  const reservedForOther = block.reservedForUid && block.reservedForUid !== user?.uid;
  const canBuyNow = block.forSale && !!block.salePrice && !reservedForOther && !isOwner;

  async function handleBuy() {
    setError(null);
    if (!user) return signInWithGoogle();
    setLoading(true);
    try {
      await buyResale(block.id); // redirige vers Stripe
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
      setLoading(false);
    }
  }

  async function handleOffer() {
    setError(null);
    if (!user) return signInWithGoogle();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_SALE_PRICE_EUR) {
      setError(`Montant minimum : ${formatEUR(MIN_SALE_PRICE_EUR)}.`);
      return;
    }
    setLoading(true);
    try {
      await makeOffer(block.id, amt);
      setNotice("Offre envoyée ! Le propriétaire sera notifié.");
      setOfferOpen(false);
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlist() {
    setError(null);
    setLoading(true);
    try {
      await unlistBlock(block.id);
      setNotice("Bloc retiré de la vente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={onClose} />

      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] max-h-[88vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-black/[0.06] shrink-0">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-zinc-100">
            {block.fill === "image" && block.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: block.color || "#111" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate">
              {block.ownerName || "Propriétaire"}
            </div>
            <div className="text-[12px] text-black/40">
              {block.w} × {block.h} · {formatNumber(pixels)} px · ({block.x}, {block.y})
            </div>
          </div>
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
              className="block text-[13px] text-blue-600 truncate hover:underline"
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
              <span className="text-[13px] text-green-700 font-medium">À vendre</span>
              <span className="text-[18px] font-bold text-green-700">
                {formatEUR(block.salePrice)}
              </span>
            </div>
          )}

          {reservedForMe && (
            <div className="text-[12px] text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              Votre offre a été acceptée — finalisez le paiement ci-dessous.
            </div>
          )}
          {reservedForOther && !isOwner && (
            <div className="text-[12px] text-black/50 bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2">
              Ce bloc est réservé à un autre acheteur (offre acceptée).
            </div>
          )}

          {notice && (
            <div className="text-[12px] text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              {notice}
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
                className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-black/20"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-black/[0.06] shrink-0 space-y-2">
          {isOwner ? (
            <>
              {block.forSale ? (
                <button
                  onClick={handleUnlist}
                  disabled={loading}
                  className="w-full border border-black/10 rounded-2xl py-3.5 font-semibold text-[14px] hover:bg-black/[0.03] transition-colors disabled:opacity-40"
                >
                  Retirer de la vente
                </button>
              ) : (
                <p className="text-[12px] text-black/40 text-center">
                  Vous possédez ce bloc — mettez-le en vente depuis votre profil.
                </p>
              )}
            </>
          ) : (
            <>
              {canBuyNow && (
                <button
                  onClick={handleBuy}
                  disabled={loading}
                  className="w-full bg-black hover:bg-zinc-800 active:bg-zinc-900 disabled:opacity-40 rounded-2xl py-3.5 font-semibold text-[14px] text-white transition-colors shadow-sm"
                >
                  {loading
                    ? "Redirection vers Stripe..."
                    : `Acheter pour ${formatEUR(block.salePrice!)}`}
                </button>
              )}
              {!reservedForOther &&
                (offerOpen ? (
                  <button
                    onClick={handleOffer}
                    disabled={loading}
                    className="w-full border border-black/10 rounded-2xl py-3.5 font-semibold text-[14px] hover:bg-black/[0.03] transition-colors disabled:opacity-40"
                  >
                    Envoyer l'offre
                  </button>
                ) : (
                  <button
                    onClick={() => (user ? setOfferOpen(true) : signInWithGoogle())}
                    className="w-full border border-black/10 rounded-2xl py-3.5 font-semibold text-[14px] hover:bg-black/[0.03] transition-colors"
                  >
                    {user ? "Faire une offre" : "Se connecter pour acheter / proposer"}
                  </button>
                ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
