import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informativa programma Beta • Club and Player',
  description: 'Informativa del programma Beta Club and Player: partecipazione, feedback, monitoraggio tecnico e uscita dalla beta.',
  alternates: { canonical: '/legal/beta' },
};

const CONTACT = 'beta@clubandplayer.com';

const sections = [
  {
    title: 'Chi può partecipare',
    body: `Le condizioni di questa pagina si applicano soltanto a chi partecipa a un programma Beta di Club and Player e alle funzionalità sperimentali indicate per quel programma. Gli account sono personali, non trasferibili e possono essere revocati in caso di uso improprio.`,
  },
  {
    title: 'Cosa monitoriamo',
    body: `Durante la Beta possiamo utilizzare i feedback e le richieste di assistenza che invii, insieme ai dati diagnostici disponibili, per analizzare errori e migliorare il servizio. Evita di includere password, codici di accesso o dati personali non necessari. Finalità e gestione dei dati sono descritte nell’Informativa Privacy.`,
  },
  {
    title: 'Come inviare feedback o lasciare la Beta',
    body: `Puoi contattarci in qualsiasi momento scrivendo a ${CONTACT}. Indica se vuoi inviare un feedback o richiedere l’uscita dal programma. Uscire dalla Beta non elimina automaticamente l’account, i post o le candidature: per cancellare l’account o richiedere la cancellazione dei dati usa il percorso dedicato nell’Informativa Privacy.`,
  },
  {
    title: 'Aggiornamenti e changelog',
    body: 'Le versioni Beta possono contenere errori, interruzioni o funzionalità soggette a modifica. Le informazioni disponibili sulle versioni di prova vengono fornite attraverso i canali del relativo programma. Per chiarimenti sulle modifiche puoi contattare il team.',
  },
];

export default function BetaInfoPage() {
  return (
    <main lang="it" className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Informativa programma Beta</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Questa informativa riguarda i programmi di prova e non significa che l’intera applicazione sia riservata alla Beta privata. Si applica insieme ai <a className="underline" href="/legal/terms">Termini</a> e all’<a className="underline" href="/legal/privacy">Informativa Privacy</a>.
      </p>

      <div className="mt-8 space-y-8 text-sm text-neutral-700 dark:text-neutral-200">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 leading-6">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm"><a className="underline" href="/legal/privacy#eliminazione-account">Come richiedere l’eliminazione dell’account e dei dati associati</a></p>

      <section className="mt-10 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p>
          Per qualsiasi dubbio scrivi a{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{' '}
          indicando oggetto “Beta Club and Player”.
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: <time dateTime="2026-09-17">17/09/2026</time>
      </p>
    </main>
  );
}
