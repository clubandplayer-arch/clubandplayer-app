'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opportunity = { id: string; title: string; city: string }
type Application = { id: string; opportunity_id: string; athlete_id: string; status: string; created_at: string }
type Profile = { id: string; sport: string | null; role: string | null; city: string | null }

type Row = {
  application_id: string
  created_at: string
  status: string
  opportunity_title: string
  opportunity_city: string
  athlete_id: string
  athlete_sport: string | null
  athlete_role: string | null
  athlete_city: string | null
}

type StatusFilter = 'tutte' | 'inviata' | 'valutazione' | 'scartata'
const isStatus = (v: string): v is StatusFilter =>
  v === 'tutte' || v === 'inviata' || v === 'valutazione' || v === 'scartata'

export default function ClubApplicants() {
  const supabase = supabaseBrowser()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [filter, setFilter] = useState<StatusFilter>('tutte')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setMsg('')
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setMsg('Devi essere loggato.'); setLoading(false); return }

      const { data: myOpps, error: e1 } = await supabase
        .from('opportunities')
        .select('id, title, city')
        .eq('owner_id', user.id)

      if (e1) { setMsg(`Errore annunci: ${e1.message}`); setLoading(false); return }
      const opps = (myOpps ?? []) as Opportunity[]
      const oppIds = opps.map(o => o.id)
      if (oppIds.length === 0) { setRows([]); setLoading(false); return }

      const { data: apps, error: e2 } = await supabase
        .from('applications')
        .select('id, opportunity_id, athlete_id, status, created_at')
        .in('opportunity_id', oppIds)
        .order('created_at', { ascending: false })

      if (e2) { setMsg(`Errore candidature: ${e2.message}`); setLoading(false); return }
      const applications = (apps ?? []) as Application[]
      if (applications.length === 0) { setRows([]); setLoading(false); return }

      const athleteIds = Array.from(new Set(applications.map(a => a.athlete_id)))
      const { data: profs, error: e3 } = await supabase
        .from('profiles')
        .select('id, sport, role, city')
        .in('id', athleteIds)

      if (e3) { setMsg(`Errore profili: ${e3.message}`); setLoading(false); return }

      const profiles = (profs ?? []) as Profile[]
      const profById: Record<string, Profile> = Object.fromEntries(profiles.map(p => [p.id, p]))
      const oppById: Record<string, Opportunity> = Object.fromEntries(opps.map(o => [o.id, o]))

      const merged: Row[] = applications.map(a => ({
        application_id: a.id,
        created_at: a.created_at,
        status: a.status,
        opportunity_title: oppById[a.opportunity_id]?.title ?? 'Annuncio',
        opportunity_city: oppById[a.opportunity_id]?.city ?? '—',
        athlete_id: a.athlete_id,
        athlete_sport: profById[a.athlete_id]?.sport ?? null,
        athlete_role: profById[a.athlete_id]?.role ?? null,
        athlete_city: profById[a.athlete_id]?.city ?? null
      }))

      setRows(merged)
      setLoading(false)
    }
    void load()
  }, [supabase])

  const filtered = useMemo(() => {
    if (filter === 'tutte') return rows
    return rows.filter(r => r.status === filter)
  }, [rows, filter])

  const updateStatus = async (applicationId: string, status: 'valutazione' | 'scartata') => {
    setMsg('')
    setUpdatingId(applicationId)
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
    setUpdatingId(null)
    if (error) { setMsg(`Errore aggiornamento: ${error.message}`); return }
    setRows(prev => prev.map(r => r.application_id === applicationId ? { ...r, status } : r))
  }

  return (
    <main style={{maxWidth:960,margin:'0 auto',padding:24}}>
      <h1>Candidature ricevute</h1>

      <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
        <span>Filtro stato:</span>
        <select
          value={filter}
          onChange={e => {
            const v = e.target.value
            if (isStatus(v)) setFilter(v)
          }}
        >
          <option value="tutte">tutte</option>
          <option value="inviata">inviata</option>
          <option value="valutazione">valutazione</option>
          <option value="scartata">scartata</option>
        </select>
        <a href="/post" style={{marginLeft:'auto'}}>+ Crea nuovo annuncio</a>
        <Link href="/messages" style={{marginLeft:8}}>Messaggi →</Link>
      </div>

      {msg && <p style={{color:'#b91c1c',marginTop:8}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && filtered.length === 0 && <p>Nessuna candidatura trovata (per il filtro selezionato).</p>}

      <div style={{display:'grid',gap:12,marginTop:16}}>
        {filtered.map(r => (
          <div key={r.application_id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:600}}>
                  {r.opportunity_title} — {r.opportunity_city}
                </div>
                <div style={{fontSize:14,opacity:.8}}>
                  Atleta: <a href={`/u/${r.athlete_id}`}>{r.athlete_role ?? 'profilo'}</a> · {r.athlete_sport ?? '—'} · {r.athlete_city ?? '—'} ·{' '}
                  <Link href={`/messages/${r.athlete_id}`}>Messaggia →</Link>
                </div>
                <div style={{fontSize:12,opacity:.7,marginTop:4}}>
                  Ricevuta: {new Date(r.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:13}}>Stato: <b>{r.status}</b></span>
                <button
                  onClick={() => updateStatus(r.application_id, 'valutazione')}
                  disabled={updatingId === r.application_id}
                  style={{padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                >
                  {updatingId === r.application_id ? '…' : 'Valuta'}
                </button>
                <button
                  onClick={() => updateStatus(r.application_id, 'scartata')}
                  disabled={updatingId === r.application_id}
                  style={{padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                >
                  {updatingId === r.application_id ? '…' : 'Scarta'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
