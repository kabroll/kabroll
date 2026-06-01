import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ simulated?: string }>;
}) {
  const { simulated } = await searchParams;
  const isSimulated = simulated === "1";

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">
        {isSimulated ? "Achat simulé réussi ✅" : "Paiement réussi 🎉"}
      </h1>
      <p className="text-[14px] text-black/45 mb-2">
        {isSimulated
          ? "Mode test : aucun paiement n'a eu lieu, mais toutes les données ont été créées en base (bloc, classement, profil)."
          : "Vos pixels apparaîtront sur le canvas dans quelques instants, une fois la confirmation du paiement traitée."}
      </p>
      {isSimulated && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-8 inline-block">
          Branchez Stripe pour activer les vrais paiements.
        </p>
      )}
      <div className="flex items-center justify-center gap-3 mt-6">
        <Link
          href="/"
          className="px-5 py-2.5 bg-accent text-white text-[13px] font-semibold rounded-xl hover:bg-accent-700 transition-colors"
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
