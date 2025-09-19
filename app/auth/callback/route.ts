// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

/**
 * Next 15: cookies() è async. Inoltre tra le versioni di @supabase/ssr
 * cambia la tipizzazione dei metodi cookie. Usiamo un cast a `any`
 * per evitare errori di typing senza toccare la logica runtime.
 */
async function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const store = await cookies()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: any) =>
        store.set({ name, value, ...options }),
      remove: (name: string, options: any) =>
        store.set({ name, value: '', ...options, maxAge: 0 }),
    } as any,
    cookieOptions: { sameSite: 'lax' },
  })

  return supabase
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const err =
    url.searchParams.get('error_description') || url.searchParams.get('error')

  if (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
  if (!code) {
    return NextResponse.json({ error: 'Missing auth code' }, { status: 400 })
  }

  const supabase = await getServerSupabase()

  // Diverse versioni di supabase-js supportano firme diverse.
  try {
    // @ts-ignore – firma 1: exchangeCodeForSession(code)
    await supabase.auth.exchangeCodeForSession(code)
  } catch {
    // @ts-ignore – firma 2: exchangeCodeForSession({ authCode: code })
    await supabase.auth.exchangeCodeForSession({ authCode: code })
  }

  // Cookie di sessione scritti: reindirizza all'home (o change se vuoi)
  const redirectTo = `${url.origin}/`
  return NextResponse.redirect(redirectTo, { status: 302 })
}
