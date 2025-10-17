'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const run = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const err = params.get('error') || params.get('error_description')
      if (err) {
        router.replace(`/login?error=${encodeURIComponent(err)}`)
        return
      }

      // scambia il codice nell'URL per la sessione
      // @ts-ignore: l'SDK accetta stringa oppure legge da location
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.get('code') || undefined)
      if (error || !data?.session) {
        router.replace(`/login?error=${encodeURIComponent(error?.message || 'exchange failed')}`)
        return
      }

      // scrive i cookie server-side per le API Route Handlers
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      }).catch(() => {})

      router.replace('/')
    }

    run()
  }, [router, params])

  return (
    <main className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="rounded-xl border px-4 py-3 text-sm text-gray-600">
        Autenticazione in corso…
      </div>
    </main>
  )
}
