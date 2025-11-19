export const metadata = {
  title: 'Termini e Condizioni • Club & Player',
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Termini e condizioni d’uso</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        L’accesso o l’utilizzo della piattaforma Club & Player implica l’accettazione integrale dei presenti Termini. Ti invitiamo a
        leggerli con attenzione prima di proseguire.
      </p>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Oggetto del servizio</h2>
        <p>
          Club & Player fornisce strumenti di matching tra società sportive e atleti, funzioni di messaggistica e gestione di opportunità.
          Le funzionalità possono essere aggiornate, sospese o ampliate senza preavviso per ragioni tecniche o di sicurezza.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Uso consentito</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>È vietato utilizzare il servizio per attività illecite, spam o scraping non autorizzato.</li>
          <li>Gli account aziendali devono rappresentare club o accademie reali con dati aggiornati.</li>
          <li>È proibito tentare di aggirare i controlli di sicurezza o accedere ad aree riservate senza permesso.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Contenuti generati dagli utenti</h2>
        <p>
          Sei responsabile dei contenuti inseriti (post, opportunità, allegati). Caricando materiali dichiari di possedere i diritti necessari e di
          non violare privacy o proprietà intellettuale di terzi. Possiamo rimuovere contenuti che violano la legge o i presenti Termini.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Limitazione di responsabilità</h2>
        <p>
          Il servizio è fornito “così com’è”. Nei limiti consentiti, escludiamo garanzie implicite e non siamo responsabili per danni indiretti o
          perdita di opportunità derivanti dall’utilizzo della piattaforma. In ogni caso, l’eventuale responsabilità complessiva è limitata alle
          somme corrisposte per servizi a pagamento negli ultimi 12 mesi.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Privacy e cookie</h2>
        <p>
          L’utilizzo della piattaforma è subordinato al rispetto della nostra{' '}
          <a className="underline" href="/legal/privacy">
            Informativa Privacy
          </a>
          , che descrive trattamento dei dati, cookie tecnici e strumenti analytics rispettosi del Do Not Track.
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
      </p>
    </main>
  );
}
