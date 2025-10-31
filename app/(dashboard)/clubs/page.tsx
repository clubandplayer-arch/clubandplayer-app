// app/(dashboard)/clubs/page.tsx
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

/**
 * Vista /clubs in sola lettura controllata via feature flag.
 * Se NEXT_PUBLIC_FEATURE_CLUBS_READONLY != '1' mostriamo 404 (policy attuale).
 * Quando la flag è attiva, renderizziamo un placeholder pronto per collegare la tabella.
 */
export default function Page() {
  const enabled = process.env.NEXT_PUBLIC_FEATURE_CLUBS_READONLY === '1';
  if (!enabled) {
    notFound();
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Clubs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Vista in sola lettura attivata. A breve colleghiamo la tabella con ricerca e paginazione.
      </p>

      {/* TODO: sostituire questo placeholder con il tuo componente reale.
          Se esistono già, useremo:
          import ClubsClient from '@/components/clubs/ClubsClient';
          return <ClubsClient mode="readOnly" enableCreate={false} />;
      */}
      <div className="rounded-xl border p-4">
        <div className="text-sm opacity-75">Placeholder lista club…</div>
      </div>
    </main>
  );
}
