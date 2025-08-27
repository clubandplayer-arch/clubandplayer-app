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

  // Response che useremo anche per impostare i cookie
  const res = NextResponse.redirect(new URL('/', request.url)) // aggiorneremo la Location più sotto

  // Lettura cookie dalla request (compatibile edge/node)
  const getCookieFromHeader = (name: string): string | undefined => {
    const header = request.headers.get('cookie') ?? ''
    if (!header) return undefined
    const match = header.split('; ').find(c => c.startsWith(`${name}=`))
    return match ? decodeURIComponent(match.split('=')[1]) : undefined
  }

  // ⚠️ Blocchetto cookies compatibile con entrambe le firme (cast a any)
  const cookiesAdapter: any = {
    get: (name: string) => getCookieFromHeader(name),
    set: (name: string, value: string, options?: any) => res.cookies.set(name, value, options),
    remove: (name: string, options?: any) => res.cookies.set(name, '', { ...(options ?? {}), maxAge: 0 }),
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter }
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
