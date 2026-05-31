import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-black/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Paiement annulé</h1>
      <p className="text-[14px] text-black/45 mb-8">
        Aucun montant n'a été débité. Votre sélection est de nouveau disponible.
      </p>
      <Link
        href="/?buy=1"
        className="px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
      >
        Réessayer
      </Link>
    </div>
  );
}
