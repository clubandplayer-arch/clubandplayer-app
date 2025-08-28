'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ReportRow = {
  id: string
  user_id: string
  created_at: string
  status: 'open' | 'closed'
  reason: 'spam' | 'illecito' | 'offensivo' | 'altro'
  description: string | null
  target_type: 'opportunity'
  target_id: string
}

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  is_admin: boolean
}

type Opportunity = { id: string; title: string }

export default function AdminReportsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [opps, setOpps] = useState<Record<string, Opportunity>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg('')

      // chi sono io?
      const { data: ures } = await supabase.auth.getUser()
      const user = ures?.user ?? null
      if (!user) {
        setErrorMsg('Devi essere loggato')
        setLoading(false)
        return
      }

      const { data: myp, error: meErr } = await supabase
        .from('profiles')
        .select('id, full_name, username, is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (meErr || !myp) {
        setErrorMsg('Impossibile leggere il profilo')
        setLoading(false)
        return
      }
      if (!myp.is_admin) {
        setErrorMsg('Non sei autorizzato ad accedere a questa pagina.')
        setLoading(false)
        return
      }

      // carica tutti i report
      const { data: reps, error } = await supabase
        .from('reports')
        .select('id, user_id, created_at, status, reason, description, target_type, target_id')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMsg(`Errore caricamento reports: ${error.message}`)
        setLoading(false)
        return
      }

      const rows = (reps ?? []) as ReportRow[]
      setReports(rows)

      // preload profili dei segnalatori
      const userIds = Array.from(new Set(rows.map(r => r.user_id)))
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username, is_admin')
          .in('id', userIds)

        const map: Record<string, Profile> = {}
        for (const p of (profs ?? []) as Profile[]) map[p.id] = p
        setProfiles(map)
      }

      // preload opportunità
      const oppIds = Array.from(
        new Set(rows.filter(r => r.target_type === 'opportunity').map(r => r.target_id))
      )
      if (oppIds.length) {
        const { data: o } = await supabase
          .from('opportunities')
          .select('id, title')
          .in('id', oppIds)

        const om: Record<string, Opportunity> = {}
        for (const it of (o ?? []) as Opportunity[]) om[it.id] = it
        setOpps(om)
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const setStatus = async (id: string, status: 'open' | 'closed') => {
    setErrorMsg('')
    const idx = reports.findIndex(r => r.id === id)
    if (idx === -1) return

    // optimistic UI
    const prev = [...reports]
    const next = [...reports]
    next[idx] = { ...next[idx], status }
    setReports(next)

    const { error } = await supabase.from('reports').update({ status }).eq('id', id)
    if (error) {
      setReports(prev)
      setErrorMsg(`Errore aggiornamento: ${error.message}`)
    }
  }

  const filtered = reports.filter(r =>
    statusFilter === 'all' ? true : r.status === statusFilter
  )

  const badge = (s: ReportRow['status']) => {
    const color =
      s === 'open'
        ? { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' }
        : { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }
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
        {s === 'open' ? 'Aperta' : 'Chiusa'}
      </span>
    )
  }

  const reasonLabel = (r: ReportRow['reason']) => {
    switch (r) {
      case 'spam': return 'Spam / promozionale'
      case 'illecito': return 'Contenuto illecito'
      case 'offensivo': return 'Contenuto offensivo'
      default: return 'Altro'
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '8px 0 12px' }}>Moderazione – Segnalazioni</h1>

      {loading && <p>Caricamento…</p>}
      {!loading && errorMsg && (
        <p style={{ color: '#b91c1c' }}>{errorMsg}</p>
      )}
      {!loading && !errorMsg && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <label>Filtro stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
            >
              <option value="all">Tutti</option>
              <option value="open">Aperti</option>
              <option value="closed">Chiusi</option>
            </select>
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
              Totale: {filtered.length}
            </span>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Stato</th>
                  <th style={th}>Motivo</th>
                  <th style={th}>Segnalatore</th>
                  <th style={th}>Target</th>
                  <th style={th}>Descrizione</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const p = profiles[r.user_id]
                  const opp = r.target_type === 'opportunity' ? opps[r.target_id] : undefined
                  const created = new Date(r.created_at)
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={td}>{created.toLocaleString()}</td>
                      <td style={td}>{badge(r.status)}</td>
                      <td style={td}>{reasonLabel(r.reason)}</td>
                      <td style={td}>
                        {p ? (
                          <>
                            {p.full_name || p.username || p.id.slice(0, 8)}{' '}
                            <Link href={`/u/${p.id}`} className="underline">profilo</Link>
                          </>
                        ) : r.user_id.slice(0, 8)}
                      </td>
                      <td style={td}>
                        {r.target_type === 'opportunity' ? (
                          opp ? (
                            <Link href={`/opportunities?focus=${opp.id}`} className="underline">
                              {opp.title}
                            </Link>
                          ) : (
                            r.target_id
                          )
                        ) : (
                          `${r.target_type}:${r.target_id}`
                        )}
                      </td>
                      <td style={{ ...td, maxWidth: 320 }}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {r.description || '—'}
                        </div>
                      </td>
                      <td style={td}>
                        {r.status === 'open' ? (
                          <button onClick={() => setStatus(r.id, 'closed')} style={btn}>
                            Chiudi
                          </button>
                        ) : (
                          <button onClick={() => setStatus(r.id, 'open')} style={btnGhost}>
                            Riapri
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  fontSize: 14,
  borderBottom: '1px solid #e5e7eb',
}

const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
  fontSize: 14,
}

const btn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  ...btn,
  opacity: 0.8,
}
