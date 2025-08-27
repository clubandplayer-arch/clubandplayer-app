// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs' // cookie mutabili su Vercel/Node

// Tipi minimi per le opzioni dei cookie (evitiamo any)
type CookieSetOptions = {
  name?: string
  domain?: string
  sameSite?: 'lax' | 'strict' | 'none'
  path?: string
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  maxAge?: number
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // Response che useremo per: (1) salvare i cookie della sessione; (2) fare il redirect
  const res = NextResponse.redirect(new URL('/', request.url)) // Location la aggiorniamo sotto

  if (!code) {
    res.headers.set('Location', new URL('/login', request.url).toString())
    return res // non tocchiamo res.status (read-only)
  }

  // Lettore cookie dalla request (compatibile edge/node)
  const getCookieFromHeader = (name: string): string | undefined => {
    const header = request.headers.get('cookie') ?? ''
    if (!header) return undefined
    const match = header.split('; ').find(c => c.startsWith(`${name}=`))
    return match ? decodeURIComponent(match.split('=')[1]) : undefined
  }

  // Adapter cookie tipizzato (niente any)
  const cookieAdapter: {
    get: (name: string) => string | undefined
    set: (name: string, value: string, options?: CookieSetOptions) => void
    remove: (name: string, options?: CookieSetOptions) => void
  } = {
    get: (name) => getCookieFromHeader(name),
    set: (name, value, options) => res.cookies.set(name, value, options),
    remove: (name, options) => res.cookies.set(name, '', { ...(options ?? {}), maxAge: 0 }),
  }

  // Cast sicuro per soddisfare entrambe le firme di SSR (evita any)
  const clientOptions = { cookies: cookieAdapter } as unknown as Parameters<
    typeof createServerClient
  >[2]

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    clientOptions
  )

  // 1) Scambia il code per la sessione (imposterà i cookie su `res`)
  const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchErr) {
    res.headers.set('Location', new URL('/login', request.url).toString())
    return res
  }

  // 2) Recupera profilo per decidere la destinazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    res.headers.set('Location', new URL('/login', request.url).toString())
    return res
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  const dest = prof?.account_type ? '/opportunities' : '/onboarding'
  res.headers.set('Location', new URL(dest, request.url).toString())
  return res
}
