export default function Home() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl font-bold">
          Ti diamo il benvenuto nella prima community dedicata a <span className="text-gray-900">Club & Player</span>
        </h1>
        <p className="text-gray-600">
          Crea il tuo profilo come <b>Atleta</b> o <b>Club</b>, pubblica opportunità e invia candidature. Un’esperienza
          familiare, ispirata a LinkedIn.
        </p>
        <div className="flex items-center justify-center gap-3">
          {/* punta all’endpoint OAuth già configurato (Google ok) */}
          <a
            href="/api/auth/login?provider=google"
            className="px-5 py-3 rounded-xl bg-gray-900 text-white hover:opacity-90"
          >
            Accedi con Google
          </a>
        </div>
      </div>
    </main>
  );
}
