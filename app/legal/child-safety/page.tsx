import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Standard di sicurezza dei minori • Club & Player',
  description: 'Standard di sicurezza dei minori applicati da Club & Player e contatti per segnalazioni.',
};

const SAFETY_EMAIL = 'support@clubandplayer.com';

export default function ChildSafetyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Standard di sicurezza dei minori</h1>

      <section className="space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <p>Club &amp; Player è una piattaforma dedicata ad atleti e club sportivi.</p>
        <p>La piattaforma non è destinata ai minori di 13 anni.</p>
        <p>Adottiamo misure per prevenire abusi e contenuti inappropriati, tra cui:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>possibilità di segnalare utenti e contenuti</li>
          <li>monitoraggio delle attività sospette</li>
          <li>rimozione di contenuti che violano le policy</li>
        </ul>
        <p>Non è consentita la pubblicazione o condivisione di contenuti che coinvolgono minori in modo improprio o illegale.</p>
      </section>

      <section className="mt-10 rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
        <p>
          Per segnalazioni o richieste relative alla sicurezza:{' '}
          <a className="underline" href={`mailto:${SAFETY_EMAIL}`}>
            {SAFETY_EMAIL}
          </a>
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
      </p>
    </main>
  );
}
