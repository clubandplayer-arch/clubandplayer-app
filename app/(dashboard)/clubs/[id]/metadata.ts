import type { Metadata } from 'next';
import { absoluteUrl, DEFAULT_OG_IMAGE } from '@/lib/seo/site';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  const canonical = `/clubs/${id}`;

  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from('profiles')
      .select('full_name,display_name,bio,avatar_url,status,account_type,type')
      .eq('id', id)
      .eq('status', 'active')
      .or('account_type.eq.club,type.eq.club')
      .maybeSingle();

    const name = data?.full_name || data?.display_name || 'Club';
    const description = (data?.bio || 'Profilo pubblico Club su Club & Player.').slice(0, 180);
    const image = data?.avatar_url || DEFAULT_OG_IMAGE;

    return {
      title: `${name} · Club`,
      description,
      alternates: { canonical },
      openGraph: { title: `${name} · Club`, description, url: canonical, type: 'profile', images: [{ url: image }] },
      twitter: { card: 'summary_large_image', title: `${name} · Club`, description, images: [image] },
      robots: { index: true, follow: true },
    };
  } catch {
    return {
      title: 'Profilo Club',
      description: 'Profilo pubblico Club su Club & Player.',
      alternates: { canonical: absoluteUrl(canonical) },
      robots: { index: true, follow: true },
    };
  }
}
