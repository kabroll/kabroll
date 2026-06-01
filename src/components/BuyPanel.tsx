"use client";

// Panneau de finalisation d'achat. Lit la peinture multi-couleurs de
// l'EditorProvider. Deux modes :
//   - "Dessin"  : paie toutes les cellules peintes (multi-couleurs), un seul
//                 paiement, regroupées en un "groupe" nommé.
//   - "Image"   : pose une image pixelisée sur un rectangle.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useEditor } from "@/components/EditorProvider";
import { Button } from "@/components/ui";
import {
  cellsBoundingBox,
  decomposePaintToRects,
  clampSelection,
  isSelectionFree,
  type ColoredRect,
} from "@/lib/geometry";
import {
  GRID_SIZE,
  MAX_BLOCK_SIDE,
  PRICE_PER_PIXEL_EUR,
  isClosed,
  formatEUR,
  formatNumber,
} from "@/lib/constants";
import type { PixelBlock, Selection } from "@/lib/types";

type Mode = "draw" | "image";

interface Props {
  blocks: PixelBlock[];
  onPreviewRect: (rect: Selection | null) => void;
  onClose: () => void;
}

export default function BuyPanel({ blocks, onPreviewRect, onClose }: Props) {
  const { user, configured, openAuth } = useAuth();
  const { painted, clearPainted } = useEditor();
  const toast = useToast();
  const stripeReady = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  const [mode, setMode] = useState<Mode>("draw");
  const [groupLabel, setGroupLabel] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image
  const [file, setFile] = useState<File | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [divisor, setDivisor] = useState(1);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const closed = isClosed();

  // Cellules peintes -> rectangles colorés.
  const coloredRects = useMemo<ColoredRect[]>(
    () => decomposePaintToRects(painted),
    [painted],
  );
  const bbox = useMemo(() => cellsBoundingBox(new Set(painted.keys())), [painted]);

  // Rectangle image ancré au coin haut-gauche de la peinture (ou centre grille).
  const imageRect = useMemo<Selection | null>(() => {
    if (mode !== "image" || !natural) return null;
    const w = Math.max(1, Math.round(natural.w / divisor));
    const h = Math.max(1, Math.round(natural.h / divisor));
    const ax = bbox ? bbox.x : Math.floor((GRID_SIZE - w) / 2);
    const ay = bbox ? bbox.y : Math.floor((GRID_SIZE - h) / 2);
    return clampSelection({ x: ax, y: ay, w, h });
  }, [mode, natural, divisor, bbox]);

  const drawPixels = painted.size;
  const imagePixels = imageRect ? imageRect.w * imageRect.h : 0;
  const pixels = mode === "image" ? imagePixels : drawPixels;
  const totalPrice = pixels * PRICE_PER_PIXEL_EUR;
  const colorCount = useMemo(() => new Set(painted.values()).size, [painted]);

  const free = useMemo(() => {
    if (mode === "image") return imageRect ? isSelectionFree(imageRect, blocks) : false;
    // En dessin, les cellules occupées ont été filtrées à la peinture ;
    // on revérifie les rectangles par sécurité.
    return coloredRects.length > 0 && coloredRects.every((r) => isSelectionFree(r, blocks));
  }, [mode, imageRect, coloredRects, blocks]);

  useEffect(() => {
    onPreviewRect(mode === "image" ? imageRect : null);
    return () => onPreviewRect(null);
  }, [mode, imageRect, onPreviewRect]);

  const clamped =
    !!natural && mode === "image" && !!imageRect &&
    (imageRect.w !== Math.max(1, Math.round(natural.w / divisor)) ||
      imageRect.h !== Math.max(1, Math.round(natural.h / divisor)));

  // ---- Image ----------------------------------------------------------------
  useEffect(() => {
    if (!file) { setImgEl(null); setNatural(null); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
      setDivisor(maxSide > MAX_BLOCK_SIDE ? Math.ceil(maxSide / 400) : 1);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const buildPixelCanvas = useCallback((w: number, h: number): HTMLCanvasElement | null => {
    if (!imgEl) return null;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgEl, 0, 0, w, h);
    return c;
  }, [imgEl]);

  useEffect(() => {
    if (mode !== "image" || !imgEl || !imageRect) return;
    const small = buildPixelCanvas(imageRect.w, imageRect.h);
    const dst = previewCanvasRef.current;
    if (!small || !dst) return;
    dst.width = imageRect.w; dst.height = imageRect.h;
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, imageRect.w, imageRect.h);
    ctx.drawImage(small, 0, 0);
  }, [mode, imgEl, imageRect, buildPixelCanvas]);

  function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion image échouée."))), "image/png");
    });
  }

  // ---- Paiement -------------------------------------------------------------
  async function handlePay() {
    setError(null);
    if (closed) return setError("L'œuvre est clôturée : le canvas est figé.");
    if (!free) return setError("Une partie de la zone est déjà prise.");
    if (!user) { openAuth(); return; }
    if (mode === "image" && !imgEl) return setError("Importez une image.");

    setLoading(true);
    try {
      let body: Record<string, unknown>;

      if (mode === "image" && imageRect) {
        if (!storage) throw new Error("Stockage indisponible.");
        const c = buildPixelCanvas(imageRect.w, imageRect.h);
        if (!c) throw new Error("Génération de l'image échouée.");
        const blob = await canvasToBlob(c);
        const path = `pixels/${user.uid}/${Date.now()}.png`;
        const r = storageRef(storage, path);
        await uploadBytes(r, blob, { contentType: "image/png" });
        const imageUrl = await getDownloadURL(r);
        body = {
          rects: [{ ...imageRect, fill: "image", imageUrl }],
        };
      } else {
        body = {
          // Rectangles colorés (chaque rect porte sa couleur).
          rects: coloredRects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, fill: "color", color: r.color })),
        };
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          ...body,
          groupLabel: groupLabel.trim() || undefined,
          link: link.trim() || undefined,
          message: message.trim() || undefined,
          ownerName: user.displayName || user.email || "Anonyme",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement.");
      if (!data.url) throw new Error("Réponse de paiement invalide.");
      clearPainted();
      toast.success(data.simulated ? "Achat simulé : pixels créés ✅" : "Redirection vers le paiement…");
      window.location.href = data.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Une erreur est survenue.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  const previewBox = useMemo(() => {
    const maxPx = 180;
    if (!imageRect) return { w: maxPx, h: maxPx };
    const ratio = imageRect.w / imageRect.h;
    if (ratio >= 1) return { w: maxPx, h: Math.round(maxPx / ratio) };
    return { w: Math.round(maxPx * ratio), h: maxPx };
  }, [imageRect]);

  const disabled = loading || closed || pixels === 0 || (mode === "draw" && !free);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 sm:hidden animate-fade-in" onClick={onClose} />

      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:top-[72px] sm:right-6 sm:bottom-auto sm:w-[360px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] sm:max-h-[calc(100vh-150px)] max-h-[85vh] flex flex-col animate-panel-up">
        {/* Poignée (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-9 h-1 rounded-full bg-black/15" />
        </div>
        {/* En-tête */}
        <div className="flex items-start justify-between px-5 py-2.5 sm:py-3.5 border-b border-black/[0.06] shrink-0">
          <div>
            <div className="text-[15px] font-semibold">Votre création</div>
            <div className="text-[12px] text-black/40 mt-0.5">
              {formatNumber(pixels)} pixel{pixels > 1 ? "s" : ""}
              {mode === "draw" && colorCount > 1 ? ` · ${colorCount} couleurs` : ""}
              {mode === "image" && imageRect ? ` · ${imageRect.w}×${imageRect.h}` : ""}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/[0.06] text-black/30 hover:text-black/60 transition-colors" aria-label="Fermer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4 scrollbar-thin">
          {/* Onglets Dessin / Image */}
          <div className="grid grid-cols-2 gap-2">
            {(["draw", "image"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  "py-2.5 rounded-xl text-[13px] font-medium border transition-all " +
                  (mode === m ? "bg-accent border-accent text-white" : "bg-white border-black/[0.08] text-black/50 hover:border-black/20")
                }
              >
                {m === "draw" ? "Dessin" : "Image / Logo"}
              </button>
            ))}
          </div>

          {!free && mode === "draw" && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              Une partie de votre dessin chevauche des pixels déjà pris.
            </div>
          )}

          {mode === "draw" ? (
            <>
              {pixels === 0 ? (
                <div className="text-[13px] text-black/45 bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-6 text-center">
                  Choisissez une couleur et peignez sur le canvas.
                  <div className="text-[11px] text-black/30 mt-1">Outils Pixel, Zone et Gomme en bas.</div>
                </div>
              ) : (
                <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-black/40">Pixels</span>
                    <span className="font-semibold">{formatNumber(pixels)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-black/40">Couleurs</span>
                    <div className="flex items-center gap-1">
                      {[...new Set(painted.values())].slice(0, 8).map((c) => (
                        <span key={c} className="w-4 h-4 rounded border border-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[12px] pt-2 border-t border-black/[0.06]">
                    <span className="text-black/40">Zones (blocs)</span>
                    <span className="font-medium">{coloredRects.length}</span>
                  </div>
                </div>
              )}

              {/* Nom du groupe */}
              <div>
                <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-1.5">
                  Nom de la création (optionnel)
                </label>
                <input
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  maxLength={40}
                  placeholder="ex. Mon cœur ❤️"
                  className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-accent/40 transition-colors"
                />
                <p className="text-[11px] text-black/30 mt-1">Pour revendre toute la création d&apos;un coup depuis votre profil.</p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <label className="block border-2 border-dashed border-black/10 rounded-2xl p-5 text-center bg-black/[0.01] cursor-pointer hover:border-black/20 transition-colors">
                {imgEl ? (
                  <div className="flex flex-col items-center gap-2">
                    <canvas ref={previewCanvasRef} className="rounded-lg border border-black/10" style={{ width: previewBox.w, height: previewBox.h, imageRendering: "pixelated" }} />
                    <span className="text-[11px] text-black/35">Aperçu pixelisé · cliquez pour changer</span>
                  </div>
                ) : (
                  <div className="text-[13px] text-black/40">
                    Cliquez pour importer une image
                    <div className="text-[11px] text-black/25 mt-1">PNG, JPG, GIF, SVG</div>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>

              {natural && imageRect && (
                <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-black/40">Image d&apos;origine</span>
                    <span className="font-medium">{natural.w} × {natural.h} px</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 4, 8].map((d) => (
                      <button key={d} onClick={() => setDivisor(d)}
                        className={"flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-all " + (divisor === d ? "bg-accent border-accent text-white" : "bg-white border-black/[0.08] text-black/50 hover:border-black/20")}>
                        {d === 1 ? "Réelle" : `÷${d}`}
                      </button>
                    ))}
                  </div>
                  <input type="range" min={1} max={32} value={divisor} onChange={(e) => setDivisor(Number(e.target.value))} className="w-full accent-accent" />
                  <div className="flex items-center justify-between text-[12px] pt-1 border-t border-black/[0.06]">
                    <span className="text-black/40">Taille finale</span>
                    <span className="font-semibold">{imageRect.w} × {imageRect.h}</span>
                  </div>
                  {clamped && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      Image rognée (max {GRID_SIZE}). Augmentez le diviseur.
                    </div>
                  )}
                  {!free && (
                    <div className="text-[11px] text-red-600">L&apos;image chevauche des pixels déjà pris.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lien + message (communs) */}
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-1.5">Lien (optionnel)</label>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://votre-site.fr"
              className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-accent/40 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-1.5">Message (optionnel)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={140} placeholder="Affiché au survol de vos pixels"
              className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:border-accent/40 resize-none transition-colors" />
          </div>

          {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
          {!configured && !closed && (
            <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Mode démo : connectez Firebase pour activer l&apos;achat.</div>
          )}
          {configured && !stripeReady && !closed && (
            <div className="text-[12px] text-indigo-700 bg-accent-soft border border-accent/15 rounded-xl px-3 py-2">Mode test : achat simulé (aucun paiement), données bien créées en base.</div>
          )}
          {closed && <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">L&apos;œuvre est clôturée.</div>}
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t border-black/[0.06] shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] text-black/50">{formatNumber(pixels)} × {formatEUR(PRICE_PER_PIXEL_EUR)}</span>
            <span className="text-[22px] font-bold">{formatEUR(totalPrice)}</span>
          </div>
          <Button onClick={handlePay} loading={loading} disabled={disabled} fullWidth className="py-4 rounded-2xl text-[15px]">
            {closed ? "Œuvre clôturée"
              : loading ? (stripeReady ? "Redirection…" : "Création…")
              : !user ? "Se connecter pour acheter"
              : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {stripeReady ? "Payer" : "Simuler l'achat"} {formatEUR(totalPrice)}
                </>
              )}
          </Button>
        </div>
      </div>
    </>
  );
}
