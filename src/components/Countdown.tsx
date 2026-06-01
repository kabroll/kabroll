"use client";

// Compte à rebours jusqu'à la clôture de l'œuvre (1er juillet).
// Deux variantes :
//   - "pill"   : compacte, pour le bandeau du canvas
//   - "banner" : large, pour les pages (héro)
// Quand l'échéance est atteinte, affiche "Œuvre clôturée".

import { useEffect, useState } from "react";
import { CLOSING_DATE_ISO, msUntilClosing } from "@/lib/constants";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function computeParts(): Parts {
  const ms = msUntilClosing();
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: ms === 0,
  };
}

function useCountdown(): Parts | null {
  // null au 1er rendu pour éviter tout mismatch d'hydratation SSR.
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(computeParts());
    const id = setInterval(() => setParts(computeParts()), 1000);
    return () => clearInterval(id);
  }, []);

  return parts;
}

const pad = (n: number) => String(n).padStart(2, "0");

const CLOSING_LABEL = new Date(CLOSING_DATE_ISO).toLocaleDateString("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Variante compacte (bandeau canvas). */
export function CountdownPill({ className = "" }: { className?: string }) {
  const p = useCountdown();
  if (!p) return null;

  if (p.done) {
    return (
      <span
        className={
          "inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 " +
          className
        }
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Œuvre clôturée
      </span>
    );
  }

  return (
    <span
      className={"inline-flex items-center gap-1.5 tabular-nums " + className}
      title={`Clôture le ${CLOSING_LABEL}`}
      aria-label={`Clôture dans ${p.days} jours`}
    >
      <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
      <span className="font-semibold text-black/70">
        {p.days}j {pad(p.hours)}:{pad(p.minutes)}:{pad(p.seconds)}
      </span>
    </span>
  );
}

/** Variante large avec blocs (pages). */
export function CountdownBanner({ className = "" }: { className?: string }) {
  const p = useCountdown();
  if (!p) return null;

  if (p.done) {
    return (
      <div
        className={
          "rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-center " +
          className
        }
      >
        <div className="text-[13px] font-semibold text-red-600">
          L&apos;œuvre est clôturée
        </div>
        <div className="text-[12px] text-red-500/80 mt-0.5">
          Le canvas est désormais figé pour l&apos;histoire.
        </div>
      </div>
    );
  }

  const items: [number, string][] = [
    [p.days, "jours"],
    [p.hours, "heures"],
    [p.minutes, "min"],
    [p.seconds, "sec"],
  ];

  return (
    <div className={"text-center " + className}>
      <div className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-3">
        Clôture de l&apos;œuvre le {CLOSING_LABEL}
      </div>
      <div className="flex items-stretch justify-center gap-2 sm:gap-3">
        {items.map(([value, label], i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="min-w-[58px] sm:min-w-[68px] rounded-xl bg-black text-white px-3 py-2.5 tabular-nums">
              <span className="text-[24px] sm:text-[28px] font-bold leading-none">
                {pad(value)}
              </span>
            </div>
            <span className="text-[11px] text-black/40 mt-1.5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
