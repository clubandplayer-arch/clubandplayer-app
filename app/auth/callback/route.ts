// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs' as const
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)

  // dove vuoi andare dopo l’accesso (di default home)
  const nextPath = url.searchParams.get('next') || '/'

  // il codice OAuth restituito da Google → Supabase
  const code = url.searchParams.get('code')
  if (!code) {
    // non c'è il codice: torna alla login della STESSA origin con un flag d’errore
    return NextResponse.redirect(new URL('/login?err=nocode', req.url))
  }

  // Next 15+: cookies() è async
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

  // Scambia il code per la sessione e scrive i cookie
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?err=oauth', req.url))
  }

  // 🔑 RESTA sulla STESSA ORIGIN della richiesta (preview→preview, prod→prod)
  return NextResponse.redirect(new URL(nextPath, req.url))
}
