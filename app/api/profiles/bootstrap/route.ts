// app/api/profiles/bootstrap/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}

export async function POST(req: NextRequest) {
  const carrier = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) {
    const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mergeCookies(carrier, out);
    return out;
  }

  // 1) prova a leggere il profilo
  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readErr) {
    const out = NextResponse.json({ error: readErr.message }, { status: 400 });
    mergeCookies(carrier, out);
    return out;
  }

  if (existing) {
    const out = NextResponse.json({ data: existing });
    mergeCookies(carrier, out);
    return out;
  }

  // 2) se non esiste, crealo (upsert by user_id)
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.email?.split('@')[0] ?? null);

  const insertPayload: Record<string, any> = {
    user_id: user.id,
    full_name: displayName,
    display_name: displayName,
    interest_country: 'IT', // default coerente
  };

  const { data: created, error: upErr } = await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (upErr) {
    const out = NextResponse.json({ error: upErr.message }, { status: 400 });
    mergeCookies(carrier, out);
    return out;
  }

  const out = NextResponse.json({ data: created });
  mergeCookies(carrier, out);
  return out;
}
