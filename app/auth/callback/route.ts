// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// ⚠️ niente "as const" qui
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nextPath = url.searchParams.get('next') || '/'

  // codice OAuth restituito da Supabase dopo Google
  const code = url.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login?err=nocode', req.url))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // In questa versione serve passare esplicitamente il code
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?err=oauth', req.url))
  }

  // Rimani sulla stessa origin (preview resta preview)
  return NextResponse.redirect(new URL(nextPath, req.url))
}
