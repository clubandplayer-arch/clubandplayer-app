mkdir -p "app/u/[id]"
cat > "app/u/[id]/metadata.ts" <<'TS'
// app/u/[id]/metadata.ts
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  const title = 'Profilo — Club & Player';
  const description = 'Profilo pubblico su Club & Player.';

  return {
    title,
    description,
    alternates: { canonical: `/u/${id}` },
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
TS
