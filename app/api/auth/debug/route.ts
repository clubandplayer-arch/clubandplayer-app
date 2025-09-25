// app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const resCookiesCarrier = new NextResponse(null);
  const cookieStore = await req.cookies;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            resCookiesCarrier.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const cookies = cookieStore.getAll().map((c) => ({
    name: c.name,
    value: (c.value ?? '').slice(0, 16) + '…',
  }));

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return new NextResponse(
    JSON.stringify({
      cookies,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message ?? null,
    }),
    { status: 200, headers: resCookiesCarrier.headers },
  );
}
