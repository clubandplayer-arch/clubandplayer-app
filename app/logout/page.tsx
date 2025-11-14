'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LogoutPage() {
  const router = useRouter()
  useEffect(() => {
    const run = async () => {
      await supabaseBrowser().auth.signOut()
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        })
      } catch {
        // ignoriamo eventuali errori di rete: il sync periodico li coprirà
      }
      router.replace('/signup')
    }
    run()
  }, [router])
  return <p className="p-6">Uscita in corso…</p>
}
