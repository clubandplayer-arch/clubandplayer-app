export default function Home() {
  return (
    <main className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-white to-[#f6f8fb]">
      <div className="w-full max-w-3xl text-center px-6 py-14">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="text-brand">Benvenuto</span> nella community di
          <br />
          <span className="text-brand">Club</span> <span className="text-accent">&</span> <span className="text-brand">Player</span>
        </h1>
        <p className="text-gray-600 mb-8">
          Crea il tuo profilo come <b>Atleta</b> o <b>Club</b>, pubblica opportunità e invia candidature. Un’esperienza
          nuova, mai vista prima, sei un'Giocatore che cerca un nuovo Club o un Club che cerca Giocatori. Questo è il posto giusto per te.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/auth/login"
            className="rounded-2xl px-6 py-3 bg-brand text-white font-medium shadow hover:opacity-95"
          >
            Accedi / Iscriviti
          </a>
          <a
            href="/opportunities"
            className="rounded-2xl px-6 py-3 border font-medium hover:bg-gray-50"
          >
            Esplora opportunità
          </a>
        </div>
      </div>
    </main>
  );
}
