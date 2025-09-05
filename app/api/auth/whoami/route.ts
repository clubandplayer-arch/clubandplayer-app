// app/api/auth/whoami/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

async function getServerClient() {
  const store = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          store.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          store.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
      cookieOptions: { sameSite: 'lax' },
    }
  )
  return client
}

export async function GET(_req: NextRequest) {
  const supabase = await getServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = data
  return NextResponse.json({
    id: user.id,
    email: user.email,
  })
}
