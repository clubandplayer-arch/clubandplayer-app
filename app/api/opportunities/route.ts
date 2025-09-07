// app/api/opportunities/route.ts (solo la parte POST, il GET lascialo com'è)
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }

  // Verifica ruolo = club
  const { data: me } = await supabase.from('profiles').select('type,display_name').eq('user_id', user.id).single();
  if (!me || me.type !== 'club') return jsonError('Only clubs can create opportunities', 405);

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? '').trim();
  if (!title) return jsonError('Title is required', 400);

  const payload = {
    title,
    description: (body.description ?? '').trim() || null,
    created_by: user.id,
    country: (body.country ?? '').trim() || null,
    region: (body.region ?? '').trim() || null,
    province: (body.province ?? '').trim() || null,
    city: (body.city ?? '').trim() || null,
    sport: (body.sport ?? '').trim() || null,
    role: (body.role ?? '').trim() || null,
    club_name: me.display_name ?? null,
  };

  const age = (body.age_bracket ?? '').trim();
  if (age === '17-20') Object.assign(payload, { age_min: 17, age_max: 20 });
  else if (age === '21-25') Object.assign(payload, { age_min: 21, age_max: 25 });
  else if (age === '26-30') Object.assign(payload, { age_min: 26, age_max: 30 });
  else if (age === '31+') Object.assign(payload, { age_min: 31, age_max: null });

  const { data, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
