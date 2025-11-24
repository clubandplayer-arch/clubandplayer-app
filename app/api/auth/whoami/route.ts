// app/api/auth/whoami/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isClubsAdminUser } from '@/lib/api/admin';

function resolveEnv() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return { url, anon };
}

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}

type Role = 'guest' | 'athlete' | 'club';

function normRole(v: unknown): 'club' | 'athlete' | null {
  const s = (typeof v === 'string' ? v : '').trim().toLowerCase();
  if (s === 'club') return 'club';
  if (s === 'athlete') return 'athlete';
  return null;
}

export async function GET(req: NextRequest) {
  const carrier = new NextResponse();
  const { url, anon } = resolveEnv();

  const supabase = createServerClient(url, anon, {
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
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json({
      user: null,
      role: 'guest' as const,
      profile: null,
    });
    mergeCookies(carrier, out);
    return out;
  }

  // 1) profiles.account_type (nuovo), 2) profiles.type (legacy)
  let accountType: 'club' | 'athlete' | null = null;
  let legacyType: string | null = null;

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('account_type,type')
      .eq('user_id', user.id)
      .maybeSingle();

    accountType = normRole((prof as any)?.account_type);
    legacyType =
      typeof (prof as any)?.type === 'string'
        ? (prof as any)!.type.trim().toLowerCase()
        : null;

    if (!accountType) accountType = normRole(legacyType);
  } catch {
    // ignore
  }

  // 3) Fallback: metadati auth
  if (!accountType) {
    const meta = (user.user_metadata?.role ?? '')
      .toString()
      .toLowerCase();
    accountType = normRole(meta);
  }

  // 4) Fallback: se ha creato opportunità => club (legacy su created_by)
  if (!accountType) {
    try {
      const { count } = await supabase
        .from('opportunities')
        .select('id', { head: true, count: 'exact' })
        .eq('created_by', user.id);
      if ((count ?? 0) > 0) accountType = 'club';
    } catch {
      // ignore
    }
  }

  const role: Role = accountType ?? 'guest';
  const clubsAdmin = await isClubsAdminUser(supabase, user);

  const out = NextResponse.json({
    user: { id: user.id, email: user.email ?? undefined },
    role,
    profile: { account_type: accountType, type: legacyType },
    clubsAdmin,
  });
  mergeCookies(carrier, out);
  return out;
}
