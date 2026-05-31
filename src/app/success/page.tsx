import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Paiement réussi 🎉</h1>
      <p className="text-[14px] text-black/45 mb-8">
        Vos pixels apparaîtront sur le canvas dans quelques instants, une fois la
        confirmation du paiement traitée.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          Voir le canvas
        </Link>
        <Link
          href="/profil"
          className="px-5 py-2.5 border border-black/10 text-[13px] font-semibold rounded-xl hover:bg-black/[0.03] transition-colors"
        >
          Mes pixels
        </Link>
      </div>
    </div>
  );
}
