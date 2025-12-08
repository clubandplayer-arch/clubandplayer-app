import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbError, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return createClient(url, anon);
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('opportunities')
      .select('country,region,province,city,sport,role,required_category,club_name');

    if (error) return dbError(error.message);

    const uniq = (arr: (string | null | undefined)[]) =>
      Array.from(new Set((arr ?? []).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

    const rows = data ?? [];
    return successResponse({
      country: uniq(rows.map((r) => r.country)),
      region: uniq(rows.map((r) => r.region)),
      province: uniq(rows.map((r) => r.province)),
      city: uniq(rows.map((r) => r.city)),
      sport: uniq(rows.map((r) => r.sport)),
      role: uniq(rows.map((r) => r.role)),
      required_category: uniq(rows.map((r: any) => r.required_category)),
      club_name: uniq(rows.map((r) => r.club_name)),
    });
  } catch (err: any) {
    return unknownError({ endpoint: 'opportunities/filter', error: err });
  }
}
