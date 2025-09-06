// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    // Response “contenitore” per i Set-Cookie
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

    const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
    if (setErr) {
      return NextResponse.json({ error: `setSession: ${setErr.message}` }, { status: 401 })
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      return new NextResponse(JSON.stringify({ error: `getUser: ${userErr.message}` }), {
        status: 500,
        headers: {
          ...Object.fromEntries(cookieCarrier.headers),
          'content-type': 'application/json',
        },
      })
    }

    return new NextResponse(JSON.stringify({ ok: true, user }), {
      status: 200,
      headers: {
        ...Object.fromEntries(cookieCarrier.headers), // include i Set-Cookie
        'content-type': 'application/json',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 })
  }
}
