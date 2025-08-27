// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs' // cookie mutabili su Vercel

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Prepara una response che useremo anche per impostare i cookie
  const res = NextResponse.redirect(new URL('/', request.url)) // aggiorniamo la Location più sotto

  // Parser semplice dei cookie in ingresso
  const parseIncomingCookies = (): { name: string; value: string }[] => {
    const header = request.headers.get('cookie') ?? ''
    if (!header) return []
    return header.split('; ').map(pair => {
      const eq = pair.indexOf('=')
      const name = eq >= 0 ? pair.slice(0, eq) : pair
      const value = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1)) : ''
      return { name, value }
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ Versione compatibile: getAll/set/remove
        getAll() {
          return parseIncomingCookies()
        },
        set(name, value, options) {
          res.cookies.set(name, value, options)
        },
        remove(name, options) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // 1) Scambia il code per la sessione (imposta i cookie su `res`)
  const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchErr) {
    res.headers.set('Location', new URL('/login', request.url).toString())
    res.status = 302
    return res
  }

  // 2) Recupera profilo per decidere la destinazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    res.headers.set('Location', new URL('/login', request.url).toString())
    res.status = 302
    return res
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  const dest = prof?.account_type ? '/opportunities' : '/onboarding'
  res.headers.set('Location', new URL(dest, request.url).toString())
  res.status = 302
  return res
}
