'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser()

      // Scambia il "code" presente nell'URL per una sessione valida
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

      if (error) {
        console.error('OAuth error:', error)
        alert('Errore login: ' + error.message)
        router.replace('/login')
        return
      }

      // Ora la sessione è presente (niente più "Auth session missing")
      router.replace('/onboarding')
    }
    run()
  }, [router])

  return <main style={{padding:24}}>Autenticazione in corso…</main>
}
