import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/clubs'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/players'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/opportunities'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/legal/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/legal/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const supabase = await getSupabaseServerClient();
    const [clubsRes, playersRes, oppsRes] = await Promise.all([
      supabase.from('profiles').select('id,updated_at').eq('status', 'active').or('account_type.eq.club,type.eq.club').limit(1000),
      supabase.from('profiles').select('id,updated_at').eq('status', 'active').or('account_type.in.(athlete,staff),type.in.(athlete,staff)').limit(1000),
      supabase.from('opportunities').select('id,updated_at,status').in('status', ['open', 'published', 'active']).limit(1000),
    ]);

    const clubs = (clubsRes.data ?? []).map((row) => ({ url: absoluteUrl(`/clubs/${row.id}`), lastModified: row.updated_at ? new Date(row.updated_at) : now }));
    const players = (playersRes.data ?? []).map((row) => ({ url: absoluteUrl(`/players/${row.id}`), lastModified: row.updated_at ? new Date(row.updated_at) : now }));
    const opportunities = (oppsRes.data ?? []).map((row) => ({ url: absoluteUrl(`/opportunities/${row.id}`), lastModified: row.updated_at ? new Date(row.updated_at) : now }));

    return [...baseEntries, ...clubs, ...players, ...opportunities];
  } catch {
    return baseEntries;
  }
}
