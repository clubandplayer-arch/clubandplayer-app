// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

function makeServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Next 15: cookies() è async → attendi e poi adatta le 3 funzioni get/set/remove
  const getClient = async () => {
    const store = await cookies()
    const client = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return store.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Next 15 accetta object { name, value, ...options }
          store.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          store.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
      // opzionale ma utile: cookie con SameSite=Lax
      cookieOptions: { sameSite: 'lax' },
    })
    return client
  }

  return getClient()
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error_description') || url.searchParams.get('error')

  const supabase = await makeServerClient()

  if (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing auth code' }, { status: 400 })
  }

  try {
    // Le versioni di auth-js hanno due firme diverse: usiamo una chiamata “tollerante”.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – accetta sia exchangeCodeForSession(code) sia ({ authCode: code })
    await supabase.auth.exchangeCodeForSession(code)
  } catch {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabase.auth.exchangeCodeForSession({ authCode: code })
  }

  // Se siamo qui, i cookie sb-* sono stati scritti sulla preview corrente
  const redirectTo = `${url.origin}/`
  return NextResponse.redirect(redirectTo, { status: 302 })
}
