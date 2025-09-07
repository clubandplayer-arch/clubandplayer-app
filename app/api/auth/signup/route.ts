import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const POST = async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim();
  const password = (body.password ?? '').trim();
  const username = (body.username ?? '').trim();
  if (!email || !password) return jsonError('Email e password sono obbligatorie', 400);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true, user: data.user });
};
