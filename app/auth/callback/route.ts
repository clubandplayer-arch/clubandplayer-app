// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)

  // Dopo il login, torna a "/" (o a ?next=...)
  const to = url.searchParams.get('next') || '/'
  const redirectURL = new URL(to, url.origin)
  const res = NextResponse.redirect(redirectURL)

  // In Next 15, req.cookies è asincrono
  const cookieStore = await req.cookies

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const code = url.searchParams.get('code') ?? undefined
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (err: any) {
      res.headers.set('x-auth-error', String(err?.message ?? err))
    }
  }

  return res
}
