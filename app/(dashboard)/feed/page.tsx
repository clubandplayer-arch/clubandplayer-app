import FeedComposer from '@/components/feed/FeedComposer';

export const dynamic = 'force-dynamic'; // assicura refresh lato server quando pubblichiamo

export default async function FeedPage() {
  // Se hai già un elenco di post SSR qui sotto, lascialo:
  // ad es. fetch('/api/feed/posts?limit=20') lato server e renderizzi
  // In questa versione minima mostriamo solo il composer in alto.

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Composer in alto */}
        <FeedComposer />

        {/* TODO: sotto qui dovrebbe esserci la tua lista post renderizzata SSR/ISR
            Se già esiste nel tuo progetto, lascia tutto com’è e
            il router.refresh() dal composer aggiornerà l’elenco */}
      </div>
    </div>
  );
}
