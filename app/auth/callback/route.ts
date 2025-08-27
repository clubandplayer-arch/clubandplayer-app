// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs' // usa i cookie mutabili in modo sicuro

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // se manca il code -> torna al login
  if (!code) return NextResponse.redirect(new URL('/login', request.url))

  // client server-side con gestione cookie
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set(name, value, options)
        },
        remove(name, options) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // 1) scambia il code per la sessione
  const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchErr) return NextResponse.redirect(new URL('/login', request.url))

  // 2) recupera utente e profilo
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: prof } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  // 3) redirect intelligente
  const hasType = !!prof?.account_type
  const dest = hasType ? '/opportunities' : '/onboarding'
  return NextResponse.redirect(new URL(dest, request.url))
}
