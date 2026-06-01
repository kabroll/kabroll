"use client";

// Panneau d'achat : s'ouvre quand une sélection est faite sur le canvas.
//
// Mode "Couleur" : remplit la zone sélectionnée d'une couleur unie.
// Mode "Image"   : importe une image, choisit sa taille (taille réelle ou
//                  réduite ÷X), la transforme en PIXELS (downsampling) à
//                  l'endroit choisi, avec aperçu pixelisé en direct.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui";
import { clampSelection, isSelectionFree } from "@/lib/geometry";
import {
  GRID_SIZE,
  MAX_BLOCK_SIDE,
  PRICE_PER_PIXEL_EUR,
  isClosed,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { PixelBlock, PixelFill, Selection } from "@/lib/types";

interface Props {
  selection: Selection;
  blocks: PixelBlock[];
  onSelectionResize: (sel: Selection) => void;
  onClose: () => void;
}

function sameSel(a: Selection | null, b: Selection | null): boolean {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export default function BuyPanel({
  selection,
  blocks,
  onSelectionResize,
  onClose,
}: Props) {
  const { user, configured, signInWithGoogle } = useAuth();
  const toast = useToast();

  const [fill, setFill] = useState<PixelFill>("color");
  const [color, setColor] = useState("#4f46e5");

  // ---- Image -------------------------------------------------------------
  const [file, setFile] = useState<File | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [divisor, setDivisor] = useState(1); // 1 = taille réelle
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ancre = position/dimensions d'origine (rectangle dessiné). On distingue
  // les changements "externes" (l'utilisateur redessine) de nos propres
  // redimensionnements pour éviter toute boucle.
  const [original, setOriginal] = useState<Selection>(selection);
  const lastPushedRef = useRef<Selection | null>(null);

  useEffect(() => {
    if (!sameSel(selection, lastPushedRef.current)) {
      setOriginal(selection);
    }
  }, [selection]);

  // Dimensions cibles (en cellules) selon le mode.
  const target = useMemo<Selection>(() => {
    if (fill === "image" && natural) {
      const w = Math.max(1, Math.round(natural.w / divisor));
      const h = Math.max(1, Math.round(natural.h / divisor));
      return clampSelection({ x: original.x, y: original.y, w, h });
    }
    return original;
  }, [fill, natural, divisor, original]);

  // Propage la taille effective au parent (canvas + prix).
  useEffect(() => {
    lastPushedRef.current = target;
    onSelectionResize(target);
  }, [target, onSelectionResize]);

  // Ajuste manuellement un champ de la sélection (mode couleur).
  function setField(field: keyof Selection, value: number) {
    const v = Math.max(0, Math.floor(value || 0));
    const next = clampSelection({ ...original, [field]: v });
    setOriginal(next);
  }

  const closed = isClosed();
  const pixels = target.w * target.h;
  const totalPrice = pixels * PRICE_PER_PIXEL_EUR;
  const free = useMemo(
    () => isSelectionFree(target, blocks),
    [target, blocks],
  );
  const clamped =
    !!natural &&
    fill === "image" &&
    (target.w !== Math.max(1, Math.round(natural.w / divisor)) ||
      target.h !== Math.max(1, Math.round(natural.h / divisor)));

  // ---- Chargement de l'image ---------------------------------------------
  useEffect(() => {
    if (!file) {
      setImgEl(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      // Choisit un diviseur de départ pour que l'image tienne dans la grille.
      const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
      setDivisor(maxSide > MAX_BLOCK_SIDE ? Math.ceil(maxSide / 400) : 1);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Construit un canvas downsamplé (image -> pixels) aux dimensions cibles.
  const buildPixelCanvas = useCallback(
    (w: number, h: number): HTMLCanvasElement | null => {
      if (!imgEl) return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imgEl, 0, 0, w, h);
      return c;
    },
    [imgEl],
  );

  // Aperçu pixelisé en direct.
  useEffect(() => {
    if (fill !== "image" || !imgEl) return;
    const small = buildPixelCanvas(target.w, target.h);
    const dst = previewCanvasRef.current;
    if (!small || !dst) return;
    dst.width = target.w;
    dst.height = target.h;
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, target.w, target.h);
    ctx.drawImage(small, 0, 0);
  }, [fill, imgEl, target.w, target.h, buildPixelCanvas]);

  function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Conversion image échouée."))),
        "image/png",
      );
    });
  }

  // ---- Paiement -----------------------------------------------------------
  async function handlePay() {
    setError(null);
    if (closed) {
      setError("L'œuvre est clôturée : le canvas est figé.");
      return;
    }
    if (!free) {
      setError("Cette zone contient déjà des pixels. Choisissez-en une autre.");
      return;
    }
    if (!user) {
      toast.info("Connectez-vous pour finaliser votre achat.");
      await signInWithGoogle();
      return;
    }
    if (fill === "image" && !imgEl) {
      setError("Importez une image.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (fill === "image") {
        if (!storage) throw new Error("Stockage indisponible (Firebase non configuré).");
        // On upload l'image DÉJÀ pixelisée aux dimensions exactes du bloc.
        const c = buildPixelCanvas(target.w, target.h);
        if (!c) throw new Error("Génération de l'image échouée.");
        const blob = await canvasToBlob(c);
        const path = `pixels/${user.uid}/${Date.now()}.png`;
        const r = storageRef(storage, path);
        await uploadBytes(r, blob, { contentType: "image/png" });
        imageUrl = await getDownloadURL(r);
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          selection: target,
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
      toast.success("Redirection vers le paiement sécurisé…");
      window.location.href = data.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Une erreur est survenue.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  // Taille d'affichage de l'aperçu (upscale net, image-rendering pixelated).
  const previewBox = useMemo(() => {
    const maxPx = 200;
    const ratio = target.w / target.h;
    if (ratio >= 1) return { w: maxPx, h: Math.round(maxPx / ratio) };
    return { w: Math.round(maxPx * ratio), h: maxPx };
  }, [target.w, target.h]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 sm:hidden animate-fade-in" onClick={onClose} />

      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] max-h-[88vh] flex flex-col animate-panel-up">
        {/* En-tête */}
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-black/[0.06] shrink-0">
          <div>
            <div className="text-[15px] font-semibold">Acheter ces pixels</div>
            <div className="text-[12px] text-black/40 mt-0.5">
              {formatNumber(pixels)} pixels · {target.w} × {target.h} · en ({target.x}, {target.y})
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
              Cette zone est déjà occupée. Déplacez ou réduisez votre bloc.
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
                      ? "bg-accent border-accent text-white"
                      : "bg-white border-black/[0.08] text-black/50 hover:border-black/20")
                  }
                >
                  {opt === "color" ? "Couleur" : "Image / Logo"}
                </button>
              ))}
            </div>
          </div>

          {/* Position & taille précises */}
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">
              Position &amp; taille
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([
                ["x", "X", original.x],
                ["y", "Y", original.y],
                ["w", "Largeur", original.w],
                ["h", "Hauteur", original.h],
              ] as const).map(([key, lbl, val]) => (
                <label key={key} className="block">
                  <span className="block text-[10px] text-black/35 mb-1">{lbl}</span>
                  <input
                    type="number"
                    min={key === "w" || key === "h" ? 1 : 0}
                    max={GRID_SIZE}
                    value={val}
                    disabled={fill === "image" && (key === "w" || key === "h")}
                    onChange={(e) => setField(key, Number(e.target.value))}
                    className="w-full bg-black/[0.02] border border-black/[0.06] rounded-lg px-2 py-2 text-[13px] tabular-nums focus:outline-none focus:border-accent/40 disabled:opacity-40 transition-colors"
                  />
                </label>
              ))}
            </div>
            {fill === "image" && (
              <p className="text-[11px] text-black/30 mt-1.5">
                La taille en mode image est définie par le diviseur ci-dessous.
              </p>
            )}
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
            <div className="space-y-4">
              {/* Import */}
              <label className="block border-2 border-dashed border-black/10 rounded-2xl p-5 text-center bg-black/[0.01] cursor-pointer hover:border-black/20 transition-colors">
                {imgEl ? (
                  <div className="flex flex-col items-center gap-2">
                    <canvas
                      ref={previewCanvasRef}
                      className="rounded-lg border border-black/10"
                      style={{
                        width: previewBox.w,
                        height: previewBox.h,
                        imageRendering: "pixelated",
                      }}
                    />
                    <span className="text-[11px] text-black/35">
                      Aperçu pixelisé · cliquez pour changer
                    </span>
                  </div>
                ) : (
                  <div className="text-[13px] text-black/40">
                    Cliquez pour importer une image
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

              {/* Contrôle de taille */}
              {natural && (
                <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-black/40">Image d'origine</span>
                    <span className="font-medium">{natural.w} × {natural.h} px</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 4, 8].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDivisor(d)}
                        className={
                          "flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-all " +
                          (divisor === d
                            ? "bg-accent border-accent text-white"
                            : "bg-white border-black/[0.08] text-black/50 hover:border-black/20")
                        }
                      >
                        {d === 1 ? "Réelle" : `÷${d}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-black/40 shrink-0">Diviser ÷{divisor}</span>
                    <input
                      type="range"
                      min={1}
                      max={32}
                      value={divisor}
                      onChange={(e) => setDivisor(Number(e.target.value))}
                      className="flex-1 accent-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-1 border-t border-black/[0.06]">
                    <span className="text-black/40">Taille finale</span>
                    <span className="font-semibold">
                      {target.w} × {target.h} cellules
                    </span>
                  </div>

                  {clamped && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      Image rognée pour tenir dans la grille (max {GRID_SIZE}). Augmentez le diviseur.
                    </div>
                  )}
                </div>
              )}
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

          {closed && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              L&apos;œuvre est clôturée : le canvas est désormais figé.
            </div>
          )}

          {!configured && !closed && (
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
            <span className="text-[22px] font-bold">{formatEUR(totalPrice)}</span>
          </div>
          <Button onClick={handlePay} loading={loading} disabled={!free || closed} fullWidth className="py-4 rounded-2xl text-[15px]">
            {closed ? (
              "Œuvre clôturée"
            ) : loading ? (
              "Redirection vers le paiement…"
            ) : !user ? (
              "Se connecter pour acheter"
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Payer {formatEUR(totalPrice)}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
