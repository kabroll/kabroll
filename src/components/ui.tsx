"use client";

// Petits composants UI réutilisables : spinner, bouton avec état de chargement,
// skeleton. Centralisés pour une cohérence visuelle sur tout le site.

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-black text-white hover:bg-zinc-800 active:bg-zinc-900 shadow-sm",
  secondary:
    "bg-white text-black border border-black/10 hover:bg-black/[0.03] active:bg-black/[0.05]",
  ghost: "bg-transparent text-black/60 hover:bg-black/[0.04]",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

export function Button({
  loading = false,
  variant = "primary",
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={
        "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[14px] px-4 py-2.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 " +
        (fullWidth ? "w-full " : "") +
        VARIANTS[variant] +
        " " +
        className
      }
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-black/[0.06] ${className}`} />;
}
