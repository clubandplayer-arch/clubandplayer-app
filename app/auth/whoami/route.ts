// app/api/auth/whoami/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // useremo questo response per impostare eventuali Set-Cookie
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: resCookiesCarrier.headers,
    });
  }

  return new NextResponse(JSON.stringify({ user_id: user.id, email: user.email }), {
    status: 200,
    headers: resCookiesCarrier.headers,
  });
}
