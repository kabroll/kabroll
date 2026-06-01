"use client";

// Pied de page avec liens légaux. Masqué sur la page canvas (plein écran)
// pour ne pas gêner l'éditeur ; visible sur les autres pages.

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  // Le canvas (/) occupe tout l'écran : pas de footer dessus.
  if (pathname === "/") return null;

  return (
    <footer className="border-t border-black/[0.06] mt-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-black/40">
        <div>© {new Date().getFullYear()} PixelMillions</div>
        <nav className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/mentions-legales" className="hover:text-black transition-colors">Mentions légales</Link>
          <Link href="/cgv" className="hover:text-black transition-colors">CGV</Link>
          <Link href="/confidentialite" className="hover:text-black transition-colors">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
