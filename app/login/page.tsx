'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const HAS_ENV   = Boolean(SUPA_URL && SUPA_ANON)

const BUILD_TAG = 'login-v4.0-callback-fix'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  // Abilita OAuth su localhost, prod e QUALSIASI *.vercel.app (preview)
  const oauthAllowedHere = useMemo(() => {
    if (typeof window === 'undefined') return false
    const h = window.location.hostname
    if (h === 'localhost') return true
    if (h === 'clubandplayer-app.vercel.app') return true
    if (h.endsWith('.vercel.app')) return true
    return false
  }, [])

  // Lazy-load supabase-js e leggi l’utente client-side (solo display)
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
    if (!HAS_ENV) { setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*'); return }
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/')
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Errore login')
    } finally { setLoading(false) }
  }

  async function signInGoogle() {
    setErrorMsg(null)
    if (!HAS_ENV) { setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*'); return }
    if (!oauthAllowedHere) { setErrorMsg('Per usare Google, apri la versione Production o la Preview .vercel.app.'); return }

    setLoading(true)
    try {
      const origin = window.location.origin
      const redirectTo = `${origin}/auth/callback?next=/profile`
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(SUPA_URL, SUPA_ANON)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'consent' } },
      })
      if (error) throw error

      // fallback manuale
      if (data?.url) window.location.assign(data.url)
      else window.location.assign(
        `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
      )
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
          <span className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600" title={BUILD_TAG}>
            {BUILD_TAG}
          </span>
        </div>

        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
          </div>
        )}

        {!oauthAllowedHere && (
          <div className="rounded-md border border-blue-300 bg-blue-50 p-2 text-xs text-blue-800">
            Per il login con Google usa una Preview <code>.vercel.app</code> o la Production.
          </div>
        )}

        <button
          type="button"
          onClick={signInGoogle}
          disabled={!HAS_ENV || !oauthAllowedHere || loading}
          className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
        >
          Continua con Google
        </button>

        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">oppure</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {errorMsg && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{errorMsg}</p>
        )}

        <form onSubmit={signInEmail} className="space-y-3">
          <input type="email" placeholder="Email" className="w-full rounded-md border px-3 py-2"
                 value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full rounded-md border px-3 py-2"
                 value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={loading || !HAS_ENV} className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50">
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
