// app/u/[id]/metadata.ts
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;

  const title = 'Profilo — Club and Player';
  const description = 'Profilo pubblico su Club and Player.';

  return {
    title,
    description,
    alternates: { canonical: `/u/${id}` },
    openGraph: {
      title,
      description,
      url: `/u/${id}`,
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Club and Player' }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.jpg'],
    },
    robots: { index: true, follow: true },
  };
}
