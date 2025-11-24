export const metadata = {
  title: 'Informativa programma Beta • Club & Player',
};

const CONTACT = 'beta@clubandplayer.com';

const sections = [
  {
    title: 'Chi può partecipare',
    body: `L’accesso alla Beta privata è riservato a club, procuratori e atleti invitati direttamente dal team Club & Player. Gli account sono personali, non trasferibili e possono essere revocati in caso di uso improprio.`,
  },
  {
    title: 'Cosa monitoriamo',
    body: `Durante la Beta raccogliamo feedback inviati via email/in-app e log di utilizzo strettamente necessari a diagnosticare errori su feed, candidature e onboarding. I dati vengono trattati secondo l’Informativa Privacy e cancellati quando non più necessari al debugging.`,
  },
  {
    title: 'Come inviare feedback o lasciare la Beta',
    body: `Puoi contattarci in qualsiasi momento scrivendo a ${CONTACT}. Gestiamo le richieste di uscita entro 48 ore e, se lo desideri, eliminiamo i contenuti creati durante il periodo Beta (post, candidature, profilo).`,
  },
  {
    title: 'Aggiornamenti e changelog',
    body: 'Ogni nuova build Beta viene annunciata via email con il riepilogo delle modifiche, eventuali regressioni note e link al changelog pubblico. Gli alert critici sono comunicati anche tramite la casella di supporto.',
  },
];

export default function BetaInfoPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Informativa programma Beta</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Questa pagina riassume i diritti e i doveri degli utenti invitati alla Beta privata. Fa fede insieme ai Termini e
        all’Informativa Privacy pubblicati sul sito.
      </p>

      <div className="mt-8 space-y-8 text-sm text-neutral-700 dark:text-neutral-200">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 leading-6">{section.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p>
          Per qualsiasi dubbio scrivi a{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{' '}
          indicando oggetto “Beta Club &amp; Player”.
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
      </p>
    </main>
  );
}
