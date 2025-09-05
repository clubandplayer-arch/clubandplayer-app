// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // Prepara una response di redirect ALLA STESSA ORIGIN della richiesta
  const backTo = new URL('/', req.url)
  const res = NextResponse.redirect(backTo)

  // Client SSR con gestione cookie su questa response
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

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url))
  }

  try {
    // Scambia il code per la sessione e setta i cookie su questa ORIGIN
    await supabase.auth.exchangeCodeForSession(code)
  } catch (e) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', req.url))
  }

  // opzionale: potresti leggere l’utente e decidere la rotta
  // const { data: { user } } = await supabase.auth.getUser()

  return res
}
