'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ReportRow = {
  id: string
  created_at: string
  status: 'open' | 'closed'
  reason: 'spam' | 'illecito' | 'offensivo' | 'altro'
  description: string | null
  target_type: 'opportunity'
  target_id: string
}

type Opportunity = {
  id: string
  title: string
}

export default function ReportsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [oppsMap, setOppsMap] = useState<Record<string, Opportunity>>({})
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg('')

      const { data: ures } = await supabase.auth.getUser()
      const user = ures?.user ?? null
      if (!user) {
        setUserId(null)
        setReports([])
        setOppsMap({})
        setLoading(false)
        return
      }
      setUserId(user.id)

      // prendi le segnalazioni dell’utente
      const { data: reps, error: e1 } = await supabase
        .from('reports')
        .select(
          'id, created_at, status, reason, description, target_type, target_id'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (e1) {
        setErrorMsg(`Errore caricamento: ${e1.message}`)
        setLoading(false)
        return
      }

      const rows = (reps ?? []) as ReportRow[]
      setReports(rows)

      // se ci sono target "opportunity", estrai i titoli in un’unica query
      const oppIds = Array.from(
        new Set(
          rows
            .filter((r) => r.target_type === 'opportunity')
            .map((r) => r.target_id)
        )
      )

      if (oppIds.length > 0) {
        const { data: opps, error: e2 } = await supabase
          .from('opportunities')
          .select('id, title')
          .in('id', oppIds)

        if (!e2 && opps) {
          const map: Record<string, Opportunity> = {}
          for (const o of opps as Opportunity[]) {
            map[o.id] = o
          }
          setOppsMap(map)
        }
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const closeReport = async (id: string) => {
    setErrorMsg('')
    const idx = reports.findIndex((r) => r.id === id)
    if (idx === -1) return
    const current = reports[idx]
    if (current.status !== 'open') return

    // ottimistic UI
    const prev = [...reports]
    const next = [...reports]
    next[idx] = { ...current, status: 'closed' }
    setReports(next)

    const { error } = await supabase
      .from('reports')
      .update({ status: 'closed' })
      .eq('id', id)

    if (error) {
      // rollback
      setReports(prev)
      setErrorMsg(`Errore chiusura: ${error.message}`)
    }
  }

  const badge = (status: ReportRow['status']) => {
    const color =
      status === 'open'
        ? { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' } // indigo
        : { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' } // green
    const label = status === 'open' ? 'Aperta' : 'Chiusa'
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 999,
          background: color.bg,
          color: color.text,
          border: `1px solid ${color.border}`,
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {label}
      </span>
    )
  }

  const reasonLabel = (r: ReportRow['reason']) => {
    switch (r) {
      case 'spam':
        return 'Spam / promozionale'
      case 'illecito':
        return 'Contenuto illecito'
      case 'offensivo':
        return 'Contenuto offensivo'
      default:
        return 'Altro'
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
        <h1 style={{ margin: '8px 0 12px' }}>Le mie segnalazioni</h1>
        <p>Caricamento…</p>
      </main>
    )
  }

  if (!userId) {
    return (
      <main style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
        <h1 style={{ margin: '8px 0 12px' }}>Le mie segnalazioni</h1>
        <p>Devi effettuare il login per vedere le tue segnalazioni.</p>
        <Link href="/login" className="underline">
          Vai al login
        </Link>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '8px 0 12px' }}>Le mie segnalazioni</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Qui trovi lo storico delle segnalazioni che hai inviato.
      </p>

      {errorMsg && (
        <p style={{ color: '#b91c1c', marginTop: 8, marginBottom: 16 }}>
          {errorMsg}
        </p>
      )}

      {reports.length === 0 ? (
        <div
          style={{
            border: '1px dashed #e5e7eb',
            borderRadius: 12,
            padding: 16,
            background: '#fafafa',
          }}
        >
          <p style={{ margin: 0 }}>Non hai ancora inviato segnalazioni.</p>
          <p style={{ margin: '4px 0 0' }}>
            Puoi segnalarle dal pulsante <b>“Segnala”</b> presente sulle
            opportunità.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {reports.map((r) => {
            const created = new Date(r.created_at)
            const opp =
              r.target_type === 'opportunity' ? oppsMap[r.target_id] : undefined

            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {badge(r.status)}
                    <span style={{ fontSize: 13, opacity: 0.7 }}>
                      {created.toLocaleString()}
                    </span>
                  </div>

                  {r.status === 'open' && (
                    <button
                      onClick={() => closeReport(r.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Chiudi segnalazione
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Motivo: {reasonLabel(r.reason)}
                  </div>
                  {r.description && (
                    <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>
                      {r.description}
                    </p>
                  )}

                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
                    Target: {r.target_type === 'opportunity' ? 'Annuncio' : r.target_type}{' '}
                    {opp ? (
                      <>
                        — <Link href={`/opportunities?focus=${opp.id}`} className="underline">
                          {opp.title}
                        </Link>
                      </>
                    ) : (
                      r.target_id
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
