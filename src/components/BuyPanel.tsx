"use client";

// Panneau d'achat : s'ouvre quand une sélection est faite sur le canvas.
// Choix couleur/image, lien, message, calcul du prix, puis redirection Stripe.

import { useEffect, useMemo, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { isSelectionFree } from "@/lib/geometry";
import {
  PRICE_PER_PIXEL_EUR,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { PixelBlock, PixelFill, Selection } from "@/lib/types";

interface Props {
  selection: Selection;
  blocks: PixelBlock[];
  onClose: () => void;
}

export default function BuyPanel({ selection, blocks, onClose }: Props) {
  const { user, configured, signInWithGoogle } = useAuth();

  const [fill, setFill] = useState<PixelFill>("color");
  const [color, setColor] = useState("#111111");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pixels = selection.w * selection.h;
  const total = pixels * PRICE_PER_PIXEL_EUR;
  const free = useMemo(
    () => isSelectionFree(selection, blocks),
    [selection, blocks],
  );

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handlePay() {
    setError(null);

    if (!free) {
      setError("Cette zone contient déjà des pixels achetés. Choisissez-en une autre.");
      return;
    }
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (fill === "image" && !file) {
      setError("Sélectionnez une image à afficher.");
      return;
    }

    setLoading(true);
    try {
      // 1) Upload de l'image (si besoin) vers Firebase Storage.
      let imageUrl: string | undefined;
      if (fill === "image" && file) {
        if (!storage) throw new Error("Stockage indisponible (Firebase non configuré).");
        const path = `pixels/${user.uid}/${Date.now()}-${file.name}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, file);
        imageUrl = await getDownloadURL(r);
      }

      // 2) Création de la session de paiement Stripe.
      const idToken = await user.getIdToken();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          selection,
          fill,
          color: fill === "color" ? color : undefined,
          imageUrl,
          link: link.trim() || undefined,
          message: message.trim() || undefined,
          ownerName: user.displayName || user.email || "Anonyme",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement.");
      if (!data.url) throw new Error("Réponse de paiement invalide.");

      window.location.href = data.url; // Redirection vers Stripe Checkout
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Overlay mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/20 sm:hidden"
        onClick={onClose}
      />

      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] max-h-[88vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-black/[0.06] shrink-0">
          <div>
            <div className="text-[15px] font-semibold">Acheter ces pixels</div>
            <div className="text-[12px] text-black/40 mt-0.5">
              {formatNumber(pixels)} pixels · {selection.w} × {selection.h} · à partir de ({selection.x}, {selection.y})
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
          {!free && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              Cette zone est déjà occupée. Fermez et sélectionnez une zone libre.
            </div>
          )}

          {/* Choix couleur / image */}
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">
              Contenu
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["color", "image"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFill(opt)}
                  className={
                    "py-3 rounded-xl text-[13px] font-medium border transition-all " +
                    (fill === opt
                      ? "bg-black border-black text-white"
                      : "bg-white border-black/[0.08] text-black/50 hover:border-black/20")
                  }
                >
                  {opt === "color" ? "Couleur" : "Image / Logo"}
                </button>
              ))}
            </div>
          </div>

          {fill === "color" ? (
            <div>
              <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">
                Couleur
              </label>
              <div className="flex items-center gap-3 bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-black/10 bg-transparent"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] font-mono focus:outline-none"
                />
                <div className="w-10 h-10 rounded-lg border border-black/10" style={{ backgroundColor: color }} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">
                Image
              </label>
              <label className="block border-2 border-dashed border-black/10 rounded-2xl p-6 text-center bg-black/[0.01] cursor-pointer hover:border-black/20 transition-colors">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Aperçu" className="max-h-32 mx-auto rounded-lg" />
                ) : (
                  <div className="text-[13px] text-black/40">
                    Cliquez pour choisir une image
                    <div className="text-[11px] text-black/25 mt-1">PNG, JPG, GIF, SVG</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          {/* Lien */}
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-1.5">
              Lien (optionnel)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://votre-site.fr"
              className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-black/20 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-1.5">
              Message (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="Affiché au survol de vos pixels"
              className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-black/20 resize-none transition-colors"
            />
          </div>

          {error && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {!configured && (
            <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Mode démo : connectez Firebase et Stripe pour activer l'achat réel.
            </div>
          )}
        </div>

        {/* Pied : total + paiement */}
        <div className="px-5 py-4 border-t border-black/[0.06] shrink-0">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] text-black/50">
              {formatNumber(pixels)} × {formatEUR(PRICE_PER_PIXEL_EUR)}
            </span>
            <span className="text-[22px] font-bold">{formatEUR(total)}</span>
          </div>
          <button
            onClick={handlePay}
            disabled={loading || !free}
            className="w-full bg-black hover:bg-zinc-800 active:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-4 font-semibold text-[15px] text-white transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              "Redirection vers Stripe..."
            ) : !user ? (
              "Se connecter pour acheter"
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Payer {formatEUR(total)}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
