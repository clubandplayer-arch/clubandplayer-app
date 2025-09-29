export const metadata = {
  title: 'Termini e Condizioni • Club & Player',
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Termini e Condizioni</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        L’uso del servizio Club & Player è soggetto ai presenti Termini. Creando un account accetti integralmente le condizioni.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Uso consentito</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Non è consentito l’uso illecito, lo spam o la violazione dei diritti di terzi.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Contenuti pubblicati</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Sei responsabile dei contenuti immessi; potremmo rimuovere contenuti che violano le policy.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Limitazione di responsabilità</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Il servizio è fornito “as-is” senza garanzie; nei limiti di legge la responsabilità è limitata.
      </p>
      <p className="mt-8 text-sm text-neutral-500">Ultimo aggiornamento: {new Date().toLocaleDateString()}</p>
    </main>
  );
}
