// app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const res = NextResponse.json({}) // placeholder
  const cookieStore = await req.cookies

  const cookies = cookieStore.getAll().map(c => ({
    name: c.name,
    // non stampiamo tutto il valore per sicurezza
    value: c.value?.slice(0, 16) + '…',
  }))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o, maxAge: 0 }),
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  return NextResponse.json({
    cookies,
    user: user ? { id: user.id, email: user.email } : null,
    error: error?.message ?? null,
  })
}
