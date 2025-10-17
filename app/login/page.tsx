'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SocialLogin from '@/components/auth/SocialLogin'

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const HAS_ENV   = Boolean(SUPA_URL && SUPA_ANON)

/** domini su cui permettiamo l’OAuth (oltre a *.vercel.app) */
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

  const BUILD_TAG = 'login-v5 Google+Email cookie-sync'

  const origin   = typeof window !== 'undefined' ? window.location.origin   : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

  /** abilito il bottone Google su localhost, su *.vercel.app e sui domini whitelisit */
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

  const oauthReady = HAS_ENV && oauthAllowedHere

  // Pre-carica utente (client-only)
  useEffect(() => {
    let active = true
    if (!HAS_ENV) return
    ;(async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)
      const { data: { user } } = await supabase.auth.getUser()
      if (active) setCurrentEmail(user?.email ?? null)
    })()
    return () => { active = false }
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

      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email, password,
      })
      if (error) throw error
      if (!session) throw new Error('Sessione mancante dopo login')

      // 🔁 Sync cookie SSR per le API Route Handlers
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.error || 'Sync cookie fallito')
      }

      router.replace('/')
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Errore login')
    } finally {
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
          <span className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600" title={BUILD_TAG}>
            {BUILD_TAG}
          </span>
        </div>

        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti:
            <pre className="mt-1 whitespace-pre-wrap text-xs">
{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY`}
            </pre>
          </div>
        )}

        {/* Google OAuth */}
        {oauthReady ? (
          <div className="space-y-3">
            <SocialLogin />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-200" />
              <span>oppure</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
            Google OAuth non abilitato su questo dominio (<code>{origin || 'n/d'}</code>).
          </div>
        )}

        {errorMsg && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        {/* Email + Password */}
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
            <button onClick={signOut} className="underline">Esci</button>
          </div>
        )}
      </div>
    </main>
  )
}
