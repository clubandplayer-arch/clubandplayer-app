// app/api/auth/whoami/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function resolveEnv(key: 'URL' | 'ANON_KEY') {
  const envKey = key === 'URL' ? 'SUPABASE_URL' : 'SUPABASE_ANON_KEY';
  const publicKey = key === 'URL' ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
  const direct = process.env[envKey];
  if (direct) return direct;
  const fallback = process.env[publicKey];
  if (fallback) return fallback;
  return null;
}

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}

export async function GET(req: NextRequest) {
  const carrier = new NextResponse();

  const supabaseUrl = resolveEnv('URL');
  const supabaseAnon = resolveEnv('ANON_KEY');

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ user: null, role: 'guest' as const, profile: null });
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          carrier.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          carrier.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json({ user: null, role: 'guest' as const });
    mergeCookies(carrier, out);
    return out;
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('account_type, type, profile_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const raw =
    (prof?.account_type ?? prof?.type ?? prof?.profile_type ?? '')
      .toString()
      .toLowerCase();
  const role: 'club' | 'athlete' | 'guest' =
    raw.startsWith('club') ? 'club' : raw.startsWith('athlet') ? 'athlete' : 'guest';

  const out = NextResponse.json({
    user: { id: user.id, email: user.email ?? undefined },
    role,
    profile: {
      account_type: raw || null,
    },
  });
  mergeCookies(carrier, out);
  return out;
}
