// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // dove tornare dopo il login (home o /profile)
  const redirectTo = new URL('/', req.url)

  // prepara subito una response mutabile per scrivere i cookie
  const res = NextResponse.redirect(redirectTo)

  if (!code) {
    // niente code -> torno alla home senza sessione
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // 👇 scambia il code per una sessione e scrive i cookie
  await supabase.auth.exchangeCodeForSession(code)

  return res
}
