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
    // La versione canonica è /u/[id]
    alternates: { canonical: `/u/${id}` },
    // Evitiamo l’indicizzazione della rotta duplicata
    robots: { index: false, follow: true },
    openGraph: {
      url: `/u/${id}`,
      title,
      description,
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Club & Player' }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.jpg'],
    },
  };
}
