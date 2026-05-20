'use client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Claim = {
  id: string
  claim_status: string
  submitted_at: string
  profile_id: string
  registry_club_id: string
  registry_clubs:
    | {
        name: string
        source_club_id: string
        region: string | null
        province: string | null
        municipality: string | null
      }
    | null
  profiles:
    | {
        id: string
        display_name: string | null
        account_type: string | null
      }
    | null
}

type MeProfile = {
  id: string
  is_admin: boolean
}

function normalizeClaim(claim: Claim): Claim {
  return {
    ...claim,
    registry_clubs: Array.isArray(claim.registry_clubs)
      ? claim.registry_clubs[0] ?? null
      : claim.registry_clubs,
    profiles: Array.isArray(claim.profiles)
      ? claim.profiles[0] ?? null
      : claim.profiles,
  }
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error
  }

  return fallback
}

export default function RegistryClaimsAdminPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [me, setMe] = useState<MeProfile | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')

  const loadClaims = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token

      if (!token) {
        setError('Sessione non disponibile. Effettua nuovamente il login.')
        setClaims([])
        return
      }

      const res = await fetch('/api/admin/registry/claims', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = (await res.json().catch(() => null)) as unknown

      if (!res.ok) {
        setError(
          getErrorMessage(
            json,
            `Errore caricamento richieste. Status HTTP: ${res.status}`
          )
        )
        setClaims([])
        return
      }

      if (
        !json ||
        typeof json !== 'object' ||
        !('ok' in json) ||
        json.ok !== true
      ) {
        setError('Risposta non valida dal server.')
        setClaims([])
        return
      }

      const items = 'items' in json && Array.isArray(json.items) ? json.items : []

      setClaims(
        (items as Claim[])
          .map(normalizeClaim)
          .filter((claim) => ['pending', 'in_review'].includes(claim.claim_status))
      )
    } catch (err) {
      console.error(err)
      setError('Errore imprevisto durante il caricamento delle richieste.')
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const reviewClaim = async (claimId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'approvare' : 'rifiutare'

    if (!confirm(`Vuoi davvero ${label} questa richiesta?`)) {
      return
    }

    setSavingId(claimId)
    setError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token

      if (!token) {
        setError('Sessione admin non valida. Effettua nuovamente il login.')
        return
      }

      const res = await fetch(
        `/api/admin/registry/claims/${claimId}/${action}`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const json = (await res.json().catch(() => null)) as unknown

      if (!res.ok) {
        setError(
          getErrorMessage(
            json,
            `Errore aggiornamento richiesta. Status HTTP: ${res.status}`
          )
        )
        return
      }

      if (
        !json ||
        typeof json !== 'object' ||
        !('ok' in json) ||
        json.ok !== true
      ) {
        setError('Risposta non valida dal server durante l’aggiornamento.')
        return
      }

      setClaims((current) => current.filter((claim) => claim.id !== claimId))

      await loadClaims()
    } catch (err) {
      console.error(err)
      setError('Errore imprevisto durante l’aggiornamento della richiesta.')
    } finally {
      setSavingId('')
    }
  }

  useEffect(() => {
    let active = true

    const loadMe = async () => {
      setLoadingMe(true)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user

      if (!active) return

      if (!user) {
        setMe(null)
        setLoadingMe(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return

      setMe((data as MeProfile) ?? null)
      setLoadingMe(false)
    }

    loadMe()

    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (loadingMe || !me?.is_admin) return

    loadClaims()
  }, [loadingMe, loadClaims, me?.is_admin])

  if (loadingMe) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Caricamento...
          </div>
        </div>
      </main>
    )
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-100">
            Devi essere loggato per accedere a questa pagina.
          </div>
        </div>
      </main>
    )
  }

  if (!me.is_admin) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-100">
            Non sei autorizzato ad accedere a questa pagina.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wide text-cyan-400">
          Admin Registry
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Richieste società in verifica
        </h1>

        <p className="mt-2 text-neutral-400">
          Approva o rifiuta le richieste dei Club che vogliono collegarsi al
          Registro CONI.
        </p>

        <section className="mt-8 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
              Caricamento richieste...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-100">
              {error}
            </div>
          ) : null}

          {!loading && !error && !claims.length ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
              Nessuna richiesta in verifica.
            </div>
          ) : null}

          {claims.map((claim) => {
            const club = claim.registry_clubs
            const profile = claim.profiles
            const saving = savingId === claim.id

            return (
              <article
                key={claim.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="rounded-full border border-yellow-700 bg-yellow-950/50 px-3 py-1 text-xs font-semibold text-yellow-100">
                      Verifica in corso
                    </span>

                    <h2 className="mt-4 text-xl font-bold">
                      {club?.name || 'Società senza nome'}
                    </h2>

                    <p className="mt-1 text-sm text-neutral-400">
                      ID CONI: {club?.source_club_id || '-'} •{' '}
                      {club?.region || '-'} • {club?.province || '-'} •{' '}
                      {club?.municipality || '-'}
                    </p>

                    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-sm text-neutral-400">
                        Profilo richiedente
                      </p>

                      <p className="mt-1 font-semibold">
                        {profile?.display_name || 'Profilo senza nome'}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        Tipo account: {profile?.account_type || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-52">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => reviewClaim(claim.id, 'approve')}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                    >
                      {saving ? 'Salvataggio...' : 'Approva richiesta'}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => reviewClaim(claim.id, 'reject')}
                      className="rounded-xl border border-red-700 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-60"
                    >
                      {saving ? 'Salvataggio...' : 'Rifiuta richiesta'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}