'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

export default function SupabaseSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const pushSession = async (session: Session | null) => {
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session }),
        })
      } catch {
        /* noop */
      }
    }

    ;(async () => {
      const { data }: { data: { session: Session | null } } =
        await supabase.auth.getSession()
      await pushSession(data.session)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        await pushSession(session)
      },
    )

    return () => sub?.subscription.unsubscribe()
  }, [])

  return null
}
