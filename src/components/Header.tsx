"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV = [
  { href: "/", label: "Canvas live" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/profil", label: "Mon profil" },
];

export default function Header() {
  const pathname = usePathname();
  const { user, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-black/[0.06] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-[58px] flex items-center justify-between gap-3 sm:gap-8">
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 group-hover:bg-accent-700 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.4" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold leading-none tracking-tight">unmillion.fr</div>
            <div className="text-[10px] text-black/30 leading-none mt-0.5 tracking-wide uppercase">
              1 000 000 pixels
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all " +
                  (active
                    ? "bg-black text-white"
                    : "text-black/50 hover:text-black hover:bg-black/[0.04]")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <button
              onClick={signOut}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium text-black/60 hover:bg-black/[0.04] transition-colors"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[11px]">
                  {(user.displayName || user.email || "?")[0]?.toUpperCase()}
                </span>
              )}
              Se déconnecter
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="hidden md:inline-block px-4 py-1.5 text-black/60 hover:bg-black/[0.04] text-[13px] font-medium rounded-lg transition-colors"
            >
              Se connecter
            </button>
          )}
          {/* Avatar utilisateur sur mobile (la déconnexion se fait via Profil) */}
          {user && (
            <span className="md:hidden w-7 h-7 rounded-full bg-black/[0.06] overflow-hidden flex items-center justify-center text-[11px] font-medium shrink-0">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.displayName || user.email || "?")[0]?.toUpperCase()
              )}
            </span>
          )}
          <Link
            href="/?buy=1"
            className="inline-block px-3 sm:px-4 py-1.5 bg-accent hover:bg-accent-700 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
          >
            Acheter<span className="hidden sm:inline"> des pixels</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
