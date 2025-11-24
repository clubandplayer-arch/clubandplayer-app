export const metadata = {
  title: 'Termini e Condizioni • Club & Player',
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Termini e condizioni d’uso</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        L’accesso o l’utilizzo della piattaforma Club &amp; Player implica l’accettazione integrale dei presenti Termini. Ti
        invitiamo a leggerli con attenzione prima di proseguire. In caso di adesione al programma Beta privata si applicano anche le
        condizioni supplementari descritte nell’Informativa Beta.
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
          somme corrisposte per servizi a pagamento negli ultimi 12 mesi. Durante la Beta privata possono verificarsi interruzioni programmate o
          regressioni funzionali: informeremo gli utenti invitati via email e nel changelog dedicato.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Privacy e comunicazioni Beta</h2>
        <p>
          L’utilizzo della piattaforma è subordinato al rispetto della nostra{' '}
          <a className="underline" href="/legal/privacy">
            Informativa Privacy
          </a>
          . Gli utenti invitati al programma Beta ricevono comunicazioni dedicate e possono uscire dal programma in qualsiasi momento seguendo le
          istruzioni riportate in{' '}
          <a className="underline" href="/legal/beta">
            questa informativa
          </a>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <h2 className="text-lg font-semibold">Condizioni aggiuntive per la Beta</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Gli account invitati sono personali e non trasferibili.</li>
          <li>Le funzionalità sperimentali possono essere modificate o rimosse senza preavviso.</li>
          <li>I feedback condivisi possono essere utilizzati per migliorare il prodotto e potrebbero generare follow-up da parte del team.</li>
        </ul>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
      </p>
    </main>
  );
}
