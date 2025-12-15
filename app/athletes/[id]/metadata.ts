import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  const title = 'Profilo spostato — Club & Player';
  const description = 'Questo profilo ora è disponibile su /players';

  return {
    title,
    description,
    alternates: { canonical: `/players/${id}` },
    robots: { index: false, follow: true },
  };
}
