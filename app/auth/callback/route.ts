import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

async function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const store = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: any) =>
        store.set({ name, value, ...options }),
      remove: (name: string, options: any) =>
        store.set({ name, value: '', ...options, maxAge: 0 }),
    } as any,
    cookieOptions: { sameSite: 'lax' },
  });

  return supabase;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const err =
    url.searchParams.get('error_description') || url.searchParams.get('error');

  if (err) return NextResponse.json({ error: String(err) }, { status: 400 });
  if (!code) return NextResponse.json({ error: 'Missing auth code' }, { status: 400 });

  const supabase = await getServerSupabase();

  // Firma “tollerante”
  try {
    // @ts-ignore – alcune versioni accettano direttamente la stringa
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    // @ts-ignore – fallback a oggetto opzioni
    await supabase.auth.exchangeCodeForSession({ authCode: code });
  }

  return NextResponse.redirect(`${url.origin}/feed`, { status: 302 });
}
