// Mise en page commune des pages légales (lisible, centrée, sobre).

import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 py-8 sm:py-12">
      <Link href="/" className="text-[13px] text-black/40 hover:text-black transition-colors inline-flex items-center gap-1 mb-6">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Retour au site
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{title}</h1>
      {updated && <p className="text-[12px] text-black/35 mb-8">Dernière mise à jour : {updated}</p>}
      <div className="legal-content space-y-5 text-[14px] leading-relaxed text-black/70">
        {children}
      </div>
    </div>
  );
}
