// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

function makeServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Adattatore cookie per Next 15 + Supabase SSR
  const getClient = async () => {
    const store = await cookies()
    const client = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return store.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Next 15: set({ name, value, ...options })
          store.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          // compat: rimuovi impostando maxAge=0
          store.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
      cookieOptions: { sameSite: 'lax' },
    })
    return client
  }

  return getClient()
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const err =
    url.searchParams.get('error_description') || url.searchParams.get('error')

  const supabase = await makeServerClient()

  if (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing auth code' }, { status: 400 })
  }

  try {
    // Supabase v2 accetta sia la stringa che l’oggetto { authCode }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabase.auth.exchangeCodeForSession(code)
  } catch {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabase.auth.exchangeCodeForSession({ authCode: code })
  }

  // Redirect di post-login: la pagina client /auth/ready decide dove mandare l’utente (club/profile, profile, feed)
  const redirectUrl = new URL('/auth/ready', url.origin)
  return NextResponse.redirect(redirectUrl, { status: 302 })
}
