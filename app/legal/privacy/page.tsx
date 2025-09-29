export const metadata = {
  title: 'Privacy Policy • Club & Player',
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Questa informativa descrive come trattiamo i dati personali degli utenti del servizio Club & Player.
        Utilizziamo cookie tecnici necessari al funzionamento e strumenti di analisi in forma aggregata/anonima.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Titolare del trattamento</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        (Inserisci qui i riferimenti del titolare e il contatto.)
      </p>
      <h2 className="mt-6 text-lg font-semibold">Diritti dell’interessato</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Puoi richiedere accesso, rettifica, cancellazione, limitazione e opposizione scrivendo al titolare.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Cookie</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        I cookie necessari sono sempre attivi. I cookie di misurazione vengono attivati solo previa accettazione.
      </p>
      <p className="mt-8 text-sm text-neutral-500">Ultimo aggiornamento: {new Date().toLocaleDateString()}</p>
    </main>
  );
}
