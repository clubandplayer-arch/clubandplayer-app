// app/athletes/[id]/metadata.ts
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  const title = 'Profilo — Club & Player';
  const description = 'Profilo pubblico su Club & Player.';

  return {
    title,
    description,
    // Dichiariamo come canonica la versione corta /u/[id]
    alternates: { canonical: `/u/${id}` },
    // Opzionale: se vuoi spingere ancora di più la versione canonica:
    robots: { index: false, follow: true },
    openGraph: {
      url: `/u/${id}`,
      title,
      description,
      type: 'profile',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
}
