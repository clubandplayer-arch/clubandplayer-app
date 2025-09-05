// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)

  // Dove atterrare dopo il login (default: "/")
  const to = url.searchParams.get('next') || '/'
  const redirectURL = new URL(to, url.origin)

  // Preparo SUBITO la response così posso settare i cookie su di lei
  const res = NextResponse.redirect(redirectURL)

  // In Next 15 i cookies su req sono async
  const cookieStore = await req.cookies

  // Client SSR di Supabase con adapter cookies get/set/remove
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
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

  // Scambia il "code" OAuth con la sessione (scriverà i cookie sulla response)
  const code = url.searchParams.get('code') ?? undefined
  if (code) {
    await supabase.auth
      .exchangeCodeForSession(code)
      .catch((err) => res.headers.set('x-auth-error', String(err?.message ?? err)))
  }

  return res
}
