'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  // DEBUG: cambia questo numero quando vuoi forzare il riconoscimento della build
  const BUILD_TAG = 'login-v3'

  useEffect(() => {
    let ignore = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!ignore) setCurrentEmail(user?.email ?? null)
    })
    return () => { ignore = true }
  }, [supabase])

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    router.replace('/')
  }

  async function signInGoogle() {
    setErr(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`, // es. home o /dashboard
        queryParams: { prompt: 'consent' },      // opzionale: forza scelta account
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCurrentEmail(null)
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Login</h1>
          <span className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600" data-build={BUILD_TAG}>
            {BUILD_TAG}
          </span>
        </div>

        {/* 🔵 Bottone Google SEMPRE visibile */}
        <button
          type="button"
          onClick={signInGoogle}
          className="w-full rounded-md border px-4 py-2"
          data-testid="google-btn"
        >
          Continua con Google
        </button>

        {/* Divider */}
        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">oppure</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Form email/password (opzionale) */}
        <form onSubmit={signInEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        {/* Stato sessione (utile per test) */}
        {currentEmail && (
          <div className="mt-2 text-center text-xs text-gray-600">
            Sei loggato come <strong>{currentEmail}</strong>.{' '}
            <button onClick={signOut} className="underline">Esci</button>
          </div>
        )}
      </div>
    </main>
  )
}
