import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-white to-[#f6f8fb]">
      <div className="w-full max-w-4xl text-center px-6 py-16">
        <div className="inline-block rounded-2xl px-3 py-1 mb-4 bg-[var(--brand-50)] text-[var(--brand-700)] text-xs font-medium">
          Il social per Atleti e Club
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="text-brand">Benvenuto</span> nella community di<br />
          <span className="text-brand">Club</span> <span className="text-accent">&amp;</span> <span className="text-brand">Player</span>
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
          Crea il tuo profilo come <b>Atleta</b> o <b>Club</b>, pubblica opportunità e invia candidature. 
          Un’esperienza familiare (stile LinkedIn) ma pensata per lo sport: se cerchi un nuovo club o 
          stai costruendo una squadra, sei nel posto giusto.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/auth/login" className="btn btn-brand">
            Accedi / Iscriviti
          </Link>
          <Link href="/opportunities" className="btn btn-outline">
            Esplora opportunità
          </Link>
        </div>
      </div>
    </main>
  );
}
