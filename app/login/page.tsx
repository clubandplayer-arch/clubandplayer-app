'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// forza Next a non cacheare la pagina
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Env pubbliche
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const HAS_ENV = Boolean(SUPA_URL && SUPA_ANON)

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  // Client Supabase opzionale (solo se le env esistono)
  const supabase = HAS_ENV ? createClient(SUPA_URL, SUPA_ANON) : null

  // Tag di debug per riconoscere la build a schermo
  const BUILD_TAG = 'login-v3.4'

  useEffect(() => {
    let ignore = false
    if (!supabase) return // niente env → niente chiamate

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!ignore) setCurrentEmail(user?.email ?? null)
    })

    return () => { ignore = true }
  }, [supabase])

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!supabase) { setErrorMsg('Configurazione mancante: NEXT_PUBLIC_SUPABASE_*'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErrorMsg(error.message); return }
    router.replace('/')
  }

  async function signInGoogle() {
    setErrorMsg(null)
    if (!supabase) { setErrorMsg('Configurazione mancante: NEXT_PUBLIC_SUPABASE_*'); return }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: { prompt: 'consent' },
      },
    })
  }

  async function signOut() {
    if (!supabase) return
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

        {/* Avviso chiaro se mancano le env (niente 500) */}
        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti per questa build. Imposta su Vercel (Preview/Production):
            <pre className="mt-1 whitespace-pre-wrap text-xs">
{`NEXT_PUBLIC_SUPABASE_URL = https://izzfjrcabtixxsrnkzro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <Anon Key>`}
            </pre>
          </div>
        )}

        {/* Bottone Google sempre visibile (disabilitato se env mancanti) */}
        <button
          type="button"
          onClick={signInGoogle}
          disabled={!HAS_ENV}
          className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
          data-testid="google-btn"
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
