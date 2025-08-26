'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser()

      // prendi il "code" dall'URL
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (!code) {
        // niente code nell'URL -> torna al login
        alert('Login non valido: parametro "code" mancante. Riprova.')
        router.replace('/login')
        return
      }

      // scambia il code per una sessione; il code_verifier è in localStorage
      const { error } = await supabase.auth.exchangeCodeForSession({ code })

      if (error) {
        console.error('OAuth error:', error)
        alert('Errore login: ' + error.message)
        router.replace('/login')
        return
      }

      router.replace('/onboarding')
    }
    run()
  }, [router])

  return <main style={{padding:24}}>Autenticazione in corso…</main>
}
