'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const HAS_ENV = Boolean(SUPA_URL && SUPA_ANON)

// Origini autorizzate (prod + localhost) — le preview .vercel.app vengono permesse sotto
const FIXED_ALLOWED = new Set<string>([
  'https://clubandplayer-app.vercel.app',
  'http://localhost:3000',
])

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  const BUILD_TAG = 'login-v3.9-allow-vercel-previews'

  // Origin corrente
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

  // Permette OAuth su:
  // - prod
  // - localhost
  // - QUALSIASI *.vercel.app (tutte le preview)
  const oauthAllowedHere = useMemo(() => {
    try {
      if (!origin) return false
      if (FIXED_ALLOWED.has(origin)) return true
      if (hostname.endsWith('.vercel.app')) return true
      return false
    } catch {
      return false
    }
  }, [origin, hostname])

  // Lazy-load supabase-js SOLO lato client
  useEffect(() => {
    let active = true
    if (!HAS_ENV) return

    ;(async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (active) setCurrentEmail(user?.email ?? null)
    })()

    return () => {
      active = false
    }
  }, [])

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!HAS_ENV) {
      setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*')
      return
    }
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/')
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Errore login')
    } finally {
      setLoading(false)
    }
  }

  async function signInGoogle() {
    setErrorMsg(null)

    if (!HAS_ENV) {
      setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*')
      return
    }

    // Mostra un avviso se l’origine non è tra le consentite,
    // ma NON bloccare il click: al massimo Supabase rifiuterà il redirect se non whitelisted
    if (!oauthAllowedHere) {
      console.warn(
        '[OAuth] Origin non riconosciuta. Assicurati che questo dominio sia nei Redirect URLs di Supabase:',
        origin
      )
    }

    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)

      // 👇 MODIFICA: callback dedicata
      const callbackUrl = `${window.location.origin}/auth/callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl, // ⬅️ prima era "origin"
          queryParams: { prompt: 'consent' },
        },
      })
      if (error) throw error

      if (data?.url) {
        window.location.assign(data.url)
      } else {
        // Fallback “manuale”
        const authorize = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
          callbackUrl
        )}`
        window.location.assign(authorize)
      }
    } catch (err: any) {
      console.error('OAuth error:', err)
      setErrorMsg(err?.message ?? 'Errore OAuth')
      setLoading(false)
    }
  }

  async function signOut() {
    if (!HAS_ENV) return
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPA_URL, SUPA_ANON)
    await supabase.auth.signOut()
    setCurrentEmail(null)
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Login</h1>
          <span
            className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600"
            data-build={BUILD_TAG}
            title={BUILD_TAG}
          >
            {BUILD_TAG}
          </span>
        </div>

        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti per questa build:
            <pre className="mt-1 whitespace-pre-wrap text-xs">
{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY`}
            </pre>
          </div>
        )}

        {!oauthAllowedHere && (
          <div className="rounded-md border border-blue-300 bg-blue-50 p-2 text-xs text-blue-800">
            Per il login con Google assicurati che <code>{origin}</code> sia nei{' '}
            <strong>Redirect URLs</strong> di Supabase (Auth → Settings → URL Configuration).
          </div>
        )}

        <button
          type="button"
          onClick={signInGoogle}
          disabled={!HAS_ENV || loading}
          className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
          data-testid="google-btn"
          id="google-btn"
          aria-label="Continua con Google"
        >
          Continua con Google
        </button>

        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">oppure</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {errorMsg && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        <form onSubmit={signInEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            disabled={loading || !HAS_ENV}
            className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        {currentEmail && (
          <div className="mt-2 text-center text-xs text-gray-600">
            Sei loggato come <strong>{currentEmail}</strong>.{' '}
            <button onClick={signOut} className="underline">
              Esci
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
