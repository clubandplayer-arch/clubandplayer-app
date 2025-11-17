import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getPublicProfilesMap } from '@/lib/profiles/publicLookup';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'profiles:PUBLIC', limit: 180, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids')?.trim();
  if (!idsParam) return NextResponse.json({ data: [] });

  const ids = idsParam
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (!ids.length) return NextResponse.json({ data: [] });

  try {
    const admin = getSupabaseAdminClientOrNull();
    const supabase = admin ?? (await getSupabaseServerClient());
    const map = await getPublicProfilesMap(ids, supabase, { fallbackToAdmin: !admin });
    const data = ids
      .map((id) => map.get(id) ?? null)
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    return NextResponse.json({ data });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Errore profili';
    return jsonError(message, 400);
  }
}
