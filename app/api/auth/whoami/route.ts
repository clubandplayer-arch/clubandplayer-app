// app/api/auth/whoami/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function headersFrom(res: NextResponse) {
  return Object.fromEntries(res.headers);
}

export async function GET(req: NextRequest) {
  // Response "carrier" per propagare eventuali Set-Cookie del refresh
  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ user: null, role: 'guest' as const }), {
      status: 200,
      headers: { 'content-type': 'application/json', ...headersFrom(res) },
    });
  }

  // deduci ruolo dal profilo
  const { data: prof } = await supabase
    .from('profiles')
    .select('type')
    .eq('user_id', user.id)
    .maybeSingle();

  const raw = (prof?.type ?? '').toString().toLowerCase();
  const role: 'club' | 'athlete' | 'guest' =
    raw.startsWith('club') ? 'club' : raw === 'athlete' ? 'athlete' : 'guest';

  return new NextResponse(
    JSON.stringify({
      user: { id: user.id, email: user.email ?? undefined },
      role,
      profile: { type: raw || null },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json', ...headersFrom(res) },
    }
  );
}
