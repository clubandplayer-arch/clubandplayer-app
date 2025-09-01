'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  // se l'utente è già loggato, vai via
  useEffect(() => {
    let ignore = false
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!ignore && user) router.replace('/') // o '/dashboard'
    }
    check()
    return () => { ignore = true }
  }, [router, supabase])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`, // dove tornare dopo il login
        queryParams: { prompt: 'consent' },      // opzionale
      },
    })
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Accedi</h1>
        <button
          onClick={loginWithGoogle}
          className="w-full rounded-md bg-black px-4 py-2 text-white"
        >
          Continua con Google
        </button>
      </div>
    </main>
  )
}
