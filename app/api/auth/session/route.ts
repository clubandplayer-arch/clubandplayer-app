// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // "cookieCarrier" raccoglie i Set-Cookie generati da Supabase
  const cookieCarrier = new NextResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieCarrier.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieCarrier.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  try {
    const body = await req.json().catch(() => ({}))

    // Supporta sia { session: {...} } sia { access_token, refresh_token }
    const session = body?.session ?? null
    const access_token: string | null = session?.access_token ?? body?.access_token ?? null
    const refresh_token: string | null = session?.refresh_token ?? body?.refresh_token ?? null

    // Se payload esplicita "clear" o non ci sono token → sign out (pulisce cookie server)
    if (!access_token || !refresh_token || body?.clear === true) {
      await supabase.auth.signOut()
      return new NextResponse(JSON.stringify({ ok: true, cleared: true }), {
        status: 200,
        headers: { ...Object.fromEntries(cookieCarrier.headers), 'content-type': 'application/json' },
      })
    }

    const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
    if (setErr) {
      return new NextResponse(JSON.stringify({ ok: false, error: `setSession: ${setErr.message}` }), {
        status: 401,
        headers: { ...Object.fromEntries(cookieCarrier.headers), 'content-type': 'application/json' },
      })
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      return new NextResponse(JSON.stringify({ ok: false, error: `getUser: ${userErr.message}` }), {
        status: 500,
        headers: { ...Object.fromEntries(cookieCarrier.headers), 'content-type': 'application/json' },
      })
    }

    return new NextResponse(JSON.stringify({ ok: true, user }), {
      status: 200,
      headers: { ...Object.fromEntries(cookieCarrier.headers), 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ ok: false, error: e?.message ?? 'Bad request' }), {
      status: 400,
      headers: { ...Object.fromEntries(cookieCarrier.headers), 'content-type': 'application/json' },
    })
  }
}
