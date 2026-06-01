"use client";

// Modale de bienvenue affichée à la première visite (mémorisée dans
// localStorage). Explique le concept en 3 étapes simples.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { CountdownBanner } from "@/components/Countdown";
import { PRICE_PER_PIXEL_EUR, formatEUR } from "@/lib/constants";

const STORAGE_KEY = "unmillion.onboarded.v1";

const STEPS = [
  {
    title: "Bienvenue sur unmillion.fr",
    body: `Un canvas géant d'un million de pixels. Achetez votre parcelle et laissez votre marque dans l'histoire d'Internet — ${formatEUR(PRICE_PER_PIXEL_EUR)} le pixel.`,
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "Tracez votre zone",
    body: "Sur le canvas, dessinez un rectangle pour choisir vos pixels. Posez une couleur unie ou importez une image — elle sera transformée en pixel art.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2m14 0a2 2 0 012 2M5 21a2 2 0 01-2-2m18 0a2 2 0 01-2 2M9 3h6M9 21h6M3 9v6m18-6v6" />
      </svg>
    ),
  },
  {
    title: "Achetez, revendez, négociez",
    body: "Payez en quelques secondes. Plus tard, mettez vos pixels en vente, ou faites une offre sur ceux des autres. Un vrai marché du pixel.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17M9 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenue"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
      >
        <div className="px-7 pt-8 pb-6 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
            {s.icon}
          </div>
          <h2 className="text-[20px] font-bold tracking-tight mb-2">{s.title}</h2>
          <p className="text-[14px] text-black/55 leading-relaxed">{s.body}</p>

          {step === 0 && <CountdownBanner className="mt-6" />}
        </div>

        {/* Indicateurs */}
        <div className="flex items-center justify-center gap-1.5 pb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Étape ${i + 1}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-6 bg-accent" : "w-1.5 bg-black/15 hover:bg-black/25")
              }
            />
          ))}
        </div>

        <div className="px-7 pb-7 flex items-center gap-3">
          <button
            onClick={close}
            className="text-[13px] text-black/40 hover:text-black/70 transition-colors px-2 py-2"
          >
            Passer
          </button>
          <div className="flex-1" />
          <Button
            onClick={() => (last ? close() : setStep((s) => s + 1))}
            className="px-6"
          >
            {last ? "Commencer" : "Suivant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
