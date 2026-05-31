"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { usePixels } from "@/lib/usePixels";
import {
  PRICE_PER_PIXEL_EUR,
  formatEUR,
  formatNumber,
} from "@/lib/constants";

export default function ProfilPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { blocks } = usePixels();

  const mine = useMemo(
    () =>
      blocks.filter(
        (b) => b.status === "active" && user && b.ownerId === user.uid,
      ),
    [blocks, user],
  );

  const totalPixels = mine.reduce((acc, b) => acc + b.w * b.h, 0);
  const totalSpent = totalPixels * PRICE_PER_PIXEL_EUR;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-black/40">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Mon profil</h1>
        <p className="text-[14px] text-black/45 mb-6">
          Connectez-vous pour retrouver vos pixels et votre historique.
        </p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-black text-white text-[14px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          Se connecter avec Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {/* En-tête profil */}
      <div className="flex items-center gap-4 mb-8">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center text-xl font-semibold">
            {(user.displayName || user.email || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            {user.displayName || user.email}
          </h1>
          <button
            onClick={signOut}
            className="text-[13px] text-black/40 hover:text-black transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Pixels" value={formatNumber(totalPixels)} />
        <Stat label="Blocs" value={String(mine.length)} />
        <Stat label="Total dépensé" value={formatEUR(totalSpent)} />
      </div>

      <h2 className="text-[13px] font-semibold text-black/35 uppercase tracking-wider mb-3">
        Mes pixels
      </h2>

      {mine.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-black/10">
          <p className="text-black/40 text-[14px]">Vous ne possédez pas encore de pixels.</p>
          <Link
            href="/?buy=1"
            className="inline-block mt-4 px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Acheter des pixels
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mine.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-black/[0.06]"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-zinc-100">
                {b.fill === "image" && b.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: b.color || "#111" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">
                  {b.w} × {b.h} · {formatNumber(b.w * b.h)} px
                </div>
                <div className="text-[12px] text-black/40">
                  position ({b.x}, {b.y})
                </div>
                {b.link && (
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-blue-600 truncate block"
                  >
                    {b.link}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] px-4 py-3.5">
      <div className="text-[20px] font-bold leading-none">{value}</div>
      <div className="text-[12px] text-black/40 mt-1.5">{label}</div>
    </div>
  );
}
