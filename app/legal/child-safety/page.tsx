import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Standard di sicurezza dei minori • Club and Player',
  description: 'Club and Player vieta abuso e sfruttamento sessuale dei minori (CSAE) e materiale di abuso sessuale su minori (CSAM). Standard e contatti per segnalazioni.',
  alternates: { canonical: '/legal/child-safety' },
};

const SAFETY_EMAIL = 'support@clubandplayer.com';

export default function ChildSafetyPage() {
  return (
    <main lang="it" className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Standard di sicurezza dei minori</h1>

      <section className="space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <p>Club and Player è una piattaforma dedicata ad atleti e club sportivi.</p>
        <p>La piattaforma non è destinata ai minori di 13 anni. Questi standard tutelano tutte le persone di età inferiore a 18 anni e si applicano a tutti gli utenti, sul sito e nell’app.</p>
      </section>

      <section aria-labelledby="csae" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="csae" className="text-lg font-semibold">Divieto di abuso e sfruttamento sessuale dei minori (CSAE)</h2>
        <p>Club and Player vieta espressamente qualsiasi forma di abuso e sfruttamento sessuale dei minori (CSAE, Child Sexual Abuse and Exploitation).</p>
        <p>Sono vietati contenuti e comportamenti che promuovono, facilitano o realizzano:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>adescamento di minori a fini sessuali (grooming);</li>
          <li>richieste di immagini o prestazioni sessuali a minori, anche in cambio di denaro, favori o opportunità sportive;</li>
          <li>ricatti o estorsioni sessuali (sextortion), tratta e sfruttamento sessuale di minori.</li>
        </ul>
      </section>

      <section aria-labelledby="csam" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="csam" className="text-lg font-semibold">Divieto di materiale di abuso sessuale su minori (CSAM)</h2>
        <p>È vietato creare, caricare, pubblicare, condividere, richiedere o distribuire materiale di abuso sessuale su minori (CSAM, Child Sexual Abuse Material), compresi immagini, video, rappresentazioni digitali e link a tale materiale.</p>
        <p>Questi divieti valgono per profili, post, commenti, messaggi, allegati e qualsiasi altra funzione di Club and Player.</p>
      </section>

      <section aria-labelledby="segnalazioni" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="segnalazioni" className="text-lg font-semibold">Come segnalare un problema</h2>
        <p>Usa il pulsante “Segnala questo post” disponibile sui post. Per segnalare un profilo, un messaggio o un altro problema, oppure se non riesci a usare il pulsante, scrivi al contatto per la sicurezza dei minori indicato sotto.</p>
        <p>Indica il profilo o il link al contenuto, la data e una breve descrizione del problema. Non scaricare, allegare o inoltrare materiale di abuso sessuale su minori per effettuare la segnalazione.</p>
      </section>

      <section aria-labelledby="interventi" className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 id="interventi" className="text-lg font-semibold">Gestione delle violazioni e autorità competenti</h2>
        <p>Club and Player si impegna a esaminare le segnalazioni e a rimuovere il materiale di abuso sessuale su minori di cui venga a conoscenza. Le violazioni possono comportare la rimozione dei contenuti e la sospensione degli account coinvolti.</p>
        <p>Club and Player si impegna a rispettare le leggi applicabili sulla sicurezza dei minori e a segnalare i casi di abuso e il relativo materiale alle autorità regionali o nazionali competenti, secondo gli obblighi di legge.</p>
      </section>

      <section aria-labelledby="contatto" className="mt-8 space-y-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
        <h2 id="contatto" className="text-lg font-semibold">Contatto per la sicurezza dei minori</h2>
        <p>
          Per segnalazioni e richieste relative agli standard di sicurezza dei minori di Club and Player:{' '}
          <a className="underline" href={`mailto:${SAFETY_EMAIL}`}>
            {SAFETY_EMAIL}
          </a>
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: <time dateTime="2026-09-17">17/09/2026</time>
      </p>
    </main>
  );
}
