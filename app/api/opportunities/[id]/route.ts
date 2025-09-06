import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';
const extractId = (req: NextRequest) => new URL(req.url).pathname.split('/').filter(Boolean).at(-1) ?? null;

function bracketToRange(code?: string): { age_min: number | null; age_max: number | null } {
  switch ((code || '').trim()) {
    case '17-20': return { age_min: 17, age_max: 20 };
    case '21-25': return { age_min: 21, age_max: 25 };
    case '26-30': return { age_min: 26, age_max: 30 };
    case '31+':   return { age_min: 31, age_max: null };
    default:      return { age_min: null, age_max: null };
  }
}

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'opps:PATCH', limit: 40, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }
  const id = extractId(req); if (!id) return jsonError('Missing id', 400);
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, any> = {};
  for (const k of ['title','description','country','region','province','city','sport','role','club_name'] as const) {
    if (k in body) {
      const v = (body[k] ?? '').toString().trim();
      patch[k] = v || null;
    }
  }
  if ('age_bracket' in body) Object.assign(patch, bracketToRange(body.age_bracket));
  if ('title' in patch && !patch.title) return jsonError('Title is required', 400);
  if (patch.sport === 'Calcio' && 'role' in patch && !patch.role) return jsonError('Role is required for Calcio', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .update(patch)
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const id = extractId(req); if (!id) return jsonError('Missing id', 400);
  const { data, error } = await supabase
    .from('opportunities')
    .select('id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name')
    .eq('id', id).single();
  if (error) return jsonError(error.message, 404);
  return NextResponse.json({ data });
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'opps:DELETE', limit: 40, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }
  const id = extractId(req); if (!id) return jsonError('Missing id', 400);
  const { error } = await supabase.from('opportunities').delete().eq('id', id).eq('created_by', user.id);
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
