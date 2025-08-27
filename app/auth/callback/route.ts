// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge' // opzionale: più rapido su Vercel

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    // nessun code: torna al login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // crea un client server-side leggendo i cookie della request
  const req = request as unknown as { headers: Headers }
  const res = new Response(null, { headers: new Headers() })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.headers.get('cookie') ?? undefined
        },
        set() {/* gestito da NextResponse */},
        remove() {/* gestito da NextResponse */}
      },
    }
  )

  // scambia il "code" per la sessione
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // in caso di errore torna al login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // login ok → vai alla home (o /onboarding se preferisci)
  return NextResponse.redirect(new URL('/', request.url))
}
