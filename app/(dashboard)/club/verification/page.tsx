export default function ClubVerificationPage() {
  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Verifica profilo</h1>
        <p className="text-sm text-neutral-600">
          Carica il certificato PDF del Registro nazionale ASD/SSD per richiedere la verifica del club.
        </p>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Richiesta verifica</h2>
        <p className="text-sm text-neutral-600">
          In questa sezione potrai inviare il certificato e monitorare lo stato della richiesta.
        </p>
      </section>
    </main>
  );
}
