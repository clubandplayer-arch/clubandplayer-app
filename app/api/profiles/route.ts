import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function norm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s === '[object Object]') return null;
    return s;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.label === 'string' && any.label) ||
      (typeof any.name === 'string' && any.name) ||
      (typeof any.description === 'string' && any.description) ||
      '';
    const out = String(s).trim();
    return out ? out : null;
  }
  return String(v).trim() || null;
}

/** POST /api/profiles  (upsert del profilo dell’utente loggato) */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'profiles:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => ({}));

  const type = norm((body as any).type) as 'athlete' | 'club' | null;
  const display_name = norm((body as any).display_name);

  if (!type || (type !== 'athlete' && type !== 'club'))
    return jsonError('Invalid profile type', 400);
  if (!display_name) return jsonError('Display name is required', 400);

  const payload: any = {
    user_id: user.id,
    type,
    display_name,
    headline: norm((body as any).headline),
    bio: norm((body as any).bio),
    country: norm((body as any).country),
    region: norm((body as any).region),
    province: norm((body as any).province),
    city: norm((body as any).city),
    avatar_url: norm((body as any).avatar_url) || null,
  };

  // links (oggetto safe)
  const linksRaw = (body as any).links;
  if (linksRaw && typeof linksRaw === 'object') {
    const l: Record<string, string | null> = {};
    for (const k of ['website', 'instagram', 'facebook', 'x', 'linkedin']) {
      const v = norm((linksRaw as any)[k]);
      if (v) l[k] = v;
    }
    payload.links = Object.keys(l).length ? l : null;
  } else {
    payload.links = null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
