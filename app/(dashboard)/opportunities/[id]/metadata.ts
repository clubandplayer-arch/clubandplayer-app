import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE, absoluteUrl } from '@/lib/seo/site';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const canonical = `/opportunities/${params.id}`;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from('opportunities')
      .select('title,description,status')
      .eq('id', params.id)
      .maybeSingle();

    const title = data?.title ? `${data.title} · Opportunità sportiva` : 'Opportunità sportiva';
    const description = (data?.description || 'Opportunità sportiva pubblica su Club & Player.').slice(0, 180);
    const indexable = data?.status === 'open' || data?.status === 'published' || data?.status === 'active';

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'article', images: [{ url: DEFAULT_OG_IMAGE }] },
      twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_OG_IMAGE] },
      robots: { index: indexable, follow: true },
    };
  } catch {
    return { title: 'Opportunità sportiva', description: 'Opportunità sportiva su Club & Player.', alternates: { canonical: absoluteUrl(canonical) } };
  }
}
