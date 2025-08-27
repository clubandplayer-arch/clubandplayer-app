import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: () => {},    // Next gestisce i cookie nel response
        remove: () => {}, // (non serve qui)
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Non loggato → manda al login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Loggato → controlla se ha account_type
  const { data: prof } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  if (!prof?.account_type) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  return res
}

// Applica il middleware solo a queste route
export const config = {
  matcher: ['/opportunities/:path*', '/search/:path*'],
}
