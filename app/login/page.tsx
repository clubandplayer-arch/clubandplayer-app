'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!ignore) {
        setEmail(user?.email ?? null)
        setLoading(false)
      }
    }
    check()
    return () => { ignore = true }
  }, [supabase])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`, // es. torna alla home o dashboard
        queryParams: { prompt: 'consent' },      // opzionale, forza scelta account
      },
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <p>Caricamento…</p>
      </main>
    )
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Accedi</h1>

        {email ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">Sei già loggato come <strong>{email}</strong>.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/')}
                className="rounded-md bg-black px-4 py-2 text-white"
              >
                Vai alla home
              </button>
              <button
                onClick={logout}
                className="rounded-md border px-4 py-2"
              >
                Esci
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Vuoi cambiare account? Premi “Esci” e poi accedi con Google.
            </p>
          </div>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="w-full rounded-md bg-black px-4 py-2 text-white"
          >
            Continua con Google
          </button>
        )}
      </div>
    </main>
  )
}
