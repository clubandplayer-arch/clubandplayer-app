import type { Metadata } from 'next';
import CookiePreferencesButton from '@/components/legal/CookiePreferencesButton';

export const metadata: Metadata = {
  title: 'Privacy Policy • Club and Player',
  description: 'Informativa privacy di Club and Player: dati trattati, basi giuridiche, fornitori, diritti GDPR e contatti.',
  alternates: { canonical: '/legal/privacy' },
};

const LEGAL_EMAIL = 'support@clubandplayer.com';
const BETA_EMAIL = 'beta@clubandplayer.com';

export default function PrivacyPage() {
  return (
    <main lang="it" className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Informativa Privacy</h1>
      <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        Questa informativa descrive come Club and Player tratta i dati personali degli utenti e come puoi esercitare i tuoi diritti
        in qualità di interessato (GDPR UE 2016/679 e normativa nazionale).
      </p>

      <p className="mt-4 text-sm">
        <a className="underline" href="#eliminazione-account">Come eliminare l’account Club and Player e richiedere la cancellazione dei dati</a>
      </p>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Titolare e contatti</h2>
        <p>
          Il titolare del trattamento è Club and Player — contattabile all’indirizzo{' '}
          <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          . Puoi utilizzare lo stesso contatto per inviare richieste relative alla privacy.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Dati trattati e finalità</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Dati di registrazione e di contatto, tipo di account e informazioni sul profilo sportivo (ad esempio nome, email, sport, ruoli ed esperienze).</li>
          <li>Dati di profilo e contenuti forniti volontariamente: biografia, aree geografiche e preferenze, post, commenti, foto, video, candidature, messaggi e allegati, inclusi messaggi vocali.</li>
          <li>Dati relativi a segnalazioni, blocchi e richieste di assistenza; dati e documenti inviati dagli enti per le procedure di verifica.</li>
          <li>Identificativi del dispositivo per recapitare notifiche push, quando abilitate.</li>
          <li>
            Log tecnici necessari al funzionamento del servizio (es. IP, user agent) conservati a fini di sicurezza e troubleshooting
            per il tempo strettamente necessario.
          </li>
          <li>
            Eventi di utilizzo e prestazioni, come visualizzazioni e interazioni con le opportunità, per produrre statistiche sul servizio quando abiliti le analisi facoltative.
          </li>
        </ul>
        <p>
          La base giuridica principale è l’esecuzione del contratto (art. 6.1.b GDPR) per l’erogazione del servizio e il legittimo
          interesse per attività di sicurezza e miglioramento (art. 6.1.f), bilanciato dal rispetto delle preferenze cookie. Per
          le analisi facoltative del sito e le eventuali comunicazioni di marketing utilizziamo il consenso. Le comunicazioni necessarie al servizio sono distinte da quelle promozionali.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Fornitori tecnici e destinatari</h2>
        <p>I servizi tecnici utilizzati dalla piattaforma includono:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Supabase per autenticazione, database e storage dei contenuti caricati.</li>
          <li>Vercel per l’hosting dell’applicazione web e delle API.</li>
          <li>Resend per le comunicazioni email transazionali.</li>
          <li>Sentry per la diagnostica degli errori e delle prestazioni, quando configurato.</li>
          <li>Soluzione analytics privacy-first (compatibile Plausible) per le metriche aggregate, abilitata solo dopo consenso.</li>
        </ul>
        <p>
          I dati necessari all’erogazione del servizio possono essere trattati dai fornitori tecnici. Per informazioni sulle sedi di trattamento e sulle garanzie applicabili agli eventuali trasferimenti fuori dallo Spazio economico europeo, puoi contattare il recapito privacy indicato sopra.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Visibilità dei contenuti</h2>
        <p>I dati del profilo e i contenuti che pubblichi sono mostrati secondo le funzioni e le impostazioni di visibilità della piattaforma. Messaggi e candidature sono comunicati ai rispettivi destinatari. Prima di pubblicare dati di altre persone, assicurati di avere titolo per condividerli.</p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Cookie e analisi</h2>
        <p>
          Il sito utilizza cookie e memoria locale per le funzioni tecniche, la sessione e le preferenze. Le analisi statistiche facoltative vengono caricate soltanto dopo la scelta “Accetta” nel banner e non vengono caricate quando il browser comunica Do Not Track. Puoi scegliere “Solo necessari” e modificare in seguito la tua scelta con il pulsante qui sotto. La scelta riguarda questo browser; la diagnostica tecnica del servizio è distinta dalle statistiche facoltative.
        </p>
        <CookiePreferencesButton />
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Conservazione e sicurezza</h2>
        <p>
          Adottiamo controlli di autenticazione e di accesso ai dati per proteggere il servizio. I dati dell’account sono trattati per la durata del rapporto; richieste di assistenza, segnalazioni e log vengono conservati in funzione delle rispettive finalità e degli obblighi applicabili. Puoi chiedere informazioni sui tempi di conservazione delle singole categorie di dati al contatto privacy.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
        <h2 className="text-lg font-semibold">Diritti degli interessati</h2>
        <p>
          Puoi esercitare i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità inviando una richiesta
          a <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>, nei casi previsti dal GDPR. Puoi revocare un consenso senza pregiudicare la liceità del trattamento precedente e proporre reclamo all’autorità di controllo competente, in Italia il Garante per la protezione dei dati personali. Le richieste sono gestite nei termini previsti dall’articolo 12 del GDPR; eventuali proroghe motivate vengono comunicate all’interessato.
        </p>
      </section>

      <section id="eliminazione-account" className="mt-8 scroll-mt-20 space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
        <h2 className="text-lg font-semibold">Eliminazione dell’account Club and Player</h2>
        <p>Dal sito autenticato puoi aprire Impostazioni, selezionare “Elimina account” e seguire le conferme mostrate. Puoi anche richiedere la cancellazione senza accedere al servizio o reinstallare l’app, usando il contatto email seguente.</p>
        <p>
          Gli utenti possono richiedere l’eliminazione del proprio account Club and Player e dei dati personali associati inviando
          una richiesta all’indirizzo email:
        </p>
        <p><a className="underline" href="mailto:support@clubandplayer.com?subject=Eliminazione%20account%20Club%20and%20Player">support@clubandplayer.com</a></p>
        <p>
          Scrivi preferibilmente dall’indirizzo usato per la registrazione e indica nell’oggetto “Eliminazione account Club and Player”. Non inviare password o codici di accesso. Potremmo chiedere le informazioni necessarie a verificare che l’account sia tuo. La richiesta riguarda l’account e i dati personali associati; puoi specificare anche singoli contenuti di cui chiedi la cancellazione.
        </p>
        <p>
          Ti comunicheremo l’esito della richiesta e le eventuali categorie di dati da conservare, con il motivo e i tempi applicabili. Restano possibili conservazioni richieste dalla legge o necessarie alla tutela di diritti nei casi consentiti. Disinstallare l’app o uscire dal programma Beta non equivale a eliminare l’account.
        </p>
      </section>

      <section className="mt-8 space-y-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <h2 className="text-lg font-semibold">Programma Beta privata</h2>
        <p>
          Se partecipi a un programma Beta, i feedback e le richieste di assistenza che invii possono essere associati al tuo profilo per analizzare i problemi segnalati. Le condizioni specifiche sono descritte nell’<a className="underline" href="/legal/beta">informativa Beta</a>.
        </p>
        <p>
          Se desideri lasciare il programma o revocare il consenso alle comunicazioni Beta scrivi a{' '}
          <a className="underline" href={`mailto:${BETA_EMAIL}`}>
            {BETA_EMAIL}
          </a>
          . La richiesta di uscita dalla Beta è distinta dalla richiesta di cancellazione dell’account.
        </p>
      </section>

      <p className="mt-10 text-xs uppercase tracking-wide text-neutral-500">
        Ultimo aggiornamento: <time dateTime="2026-09-17">17/09/2026</time>
      </p>
    </main>
  );
}
