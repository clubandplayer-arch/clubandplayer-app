'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser()

      // se manca il "code" nell'URL, torna al login
      const hasCode = new URL(window.location.href).searchParams.has('code')
      if (!hasCode) {
        router.replace('/login')
        return
      }

      // questa è la firma corretta: serve una STRINGA con l'URL completo
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

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
