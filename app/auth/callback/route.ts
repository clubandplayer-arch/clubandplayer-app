// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs' // usa cookie mutabili

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // se manca il code torna al login
  if (!code) return NextResponse.redirect(new URL('/login', request.url))

  // Prepariamo una response che useremo anche per impostare i cookie
  const res = NextResponse.redirect(new URL('/', request.url)) // placeholder; lo aggiorniamo sotto

  // Helper per leggere un cookie dalla request
  const getCookieFromHeader = (name: string): string | undefined => {
    const cookie = request.headers.get('cookie') ?? ''
    const match = cookie.split('; ').find(c => c.startsWith(`${name}=`))
    return match ? decodeURIComponent(match.split('=')[1]) : undefined
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => getCookieFromHeader(name),
        set: (name, value, options) => res.cookies.set(name, value, options),
        remove: (name, options) => res.cookies.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  )

  // 1) Scambia il code per la sessione (imposterà i cookie su `res`)
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