export const metadata = {
  title: 'Privacy Policy • Club & Player',
};

const LEGAL_EMAIL = 'privacy@clubandplayer.com';

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Informativa Privacy</h1>
      <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        Questa informativa descrive come Club & Player tratta i dati personali degli utenti e come puoi esercitare i tuoi diritti
        in qualità di interessato (GDPR UE 2016/679 e normativa nazionale).
      </p>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Titolare e contatti</h2>
        <p>
          Il titolare del trattamento è Club & Player — contattabile all’indirizzo{' '}
          <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          . Puoi utilizzare lo stesso contatto per inviare richieste relative alla privacy.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Dati trattati e finalità</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Dati anagrafici e di contatto forniti durante la registrazione (nome, email, ruolo atleta/club).</li>
          <li>Dati di profilo e contenuti immessi volontariamente (bio, feed, candidature, messaggi).</li>
          <li>
            Log tecnici necessari al funzionamento del servizio (es. IP, user agent) conservati a fini di sicurezza e troubleshooting
            per il tempo strettamente necessario.
          </li>
          <li>
            Metriche aggregate di utilizzo raccolte tramite una soluzione analytics privacy-first che non usa cookie di terze parti
            e rispetta il segnale “Do Not Track”.
          </li>
        </ul>
        <p>
          La base giuridica principale è l’esecuzione del contratto (art. 6.1.b GDPR) per l’erogazione del servizio e il legittimo
          interesse per attività di sicurezza e miglioramento (art. 6.1.f), bilanciato dal rispetto delle preferenze cookie.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Cookie e analisi</h2>
        <p>
          Utilizziamo cookie tecnici indispensabili e uno strumento di analisi essenziale (compatibile con Plausible) che anonimizza i
          dati e non traccia singoli utenti. Lo script viene caricato solo dopo il consenso espresso nel banner cookie e viene
          disattivato automaticamente quando il browser invia il segnale Do Not Track.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Conservazione e sicurezza</h2>
        <p>
          I dati sono ospitati su Supabase (UE) e su Vercel. Applichiamo policy di sicurezza come RLS (Row Level Security), password
          complesse, OTP con scadenza breve e logging degli accessi amministrativi. Le informazioni vengono conservate per la durata del
          rapporto contrattuale o per gli obblighi di legge.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Diritti degli interessati</h2>
        <p>
          Puoi esercitare i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità inviando una richiesta
          a <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. Riceverai risposta entro 30 giorni.
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
      </p>
    </main>
  );
}
