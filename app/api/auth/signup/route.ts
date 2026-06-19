import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function normalizeName(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function resolveEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return { url, anon };
}

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'auth:SIGNUP_EMAIL', limit: 12, window: '1m' } as any);
  } catch {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const fullName = normalizeName(body.name ?? body.full_name);
  const emailRedirectTo = typeof body.emailRedirectTo === 'string' ? body.emailRedirectTo : undefined;

  if (!fullName) return NextResponse.json({ error: 'Il nome è obbligatorio.' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Email obbligatoria.' }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: 'La password deve contenere almeno 8 caratteri.' }, { status: 400 });
  }

  const { url, anon } = resolveEnv();
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { user: data.user ? { id: data.user.id, email: data.user.email } : null } });
}
