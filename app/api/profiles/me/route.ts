import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

const FIELDS: Record<string, 'text' | 'number' | 'json'> = {
  // anagrafica
  full_name: 'text',
  display_name: 'text',
  bio: 'text',
  birth_year: 'number',
  height_cm: 'number',
  weight_kg: 'number',
  dominant_foot: 'text',
  // localizzazione
  country: 'text',
  region: 'text',
  province: 'text',
  city: 'text',
};

export const GET = withAuth(async (_req: NextRequest, { supabase, user }: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  await rateLimit(req as any, { key: 'profiles:PATCH', limit: 20, window: '1m' } as any);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonError('Invalid body', 400);

  const update: Record<string, any> = {};
  for (const [key, type] of Object.entries(FIELDS)) {
    if (!(key in body)) continue;
    const val = (body as any)[key];
    if (val === null || val === undefined || val === '') {
      update[key] = null;
      continue;
    }
    if (type === 'number') {
      const n = Number(val);
      if (Number.isNaN(n)) return jsonError(`Field ${key} must be a number`, 400);
      update[key] = n;
    } else if (type === 'json') {
      update[key] = val;
    } else {
      update[key] = String(val);
    }
  }

  // upsert (se il profilo non esiste ancora)
  const { data: saved, error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: saved });
});
