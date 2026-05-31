"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/",
    label: "Canvas",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/leaderboard",
    label: "Classement",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V19a1 1 0 001 1h3v-5H3zm7-9.5V19a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1zm7 5V19a1 1 0 001 1h3v-8h-3a1 1 0 00-1 1z" />,
  },
  {
    href: "/profil",
    label: "Profil",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.7 0-5.2-.6-7.5-1.65z" />,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-black/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-[60px]">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors " +
                (active ? "text-black" : "text-black/30")
              }
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={active ? 2.5 : 1.8}
              >
                {item.icon}
              </svg>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
