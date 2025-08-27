'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  owner_id?: string | null
  club_name: string
  title: string
  description: string | null
  sport: string
  role: string
  city: string
}

function isPgError(e: unknown): e is { code?: string; message?: string } {
  return typeof e === 'object' && e !== null && 'message' in e
}

const LS_KEY = 'opps_filters_v1'

type SavedFilters = {
  role: string
  city: string
}

export default function OpportunitiesPage() {
  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // Filtri UI
  const [qRole, setQRole] = useState<string>('')
  const [qCity, setQCity] = useState<string>('')

  const supabase = supabaseBrowser()

  // Carica filtri da localStorage all’avvio
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as SavedFilters
        setQRole(parsed.role ?? '')
        setQCity(parsed.city ?? '')
      }
    } catch {
      // ignora
    }
  }, [])

  // Carica utente + opportunità (con eventuali filtri)
  const load = async (opts?: { role?: string; city?: string }) => {
    setLoading(true)
    setMsg('')

    const u = await supabase.auth.getUser()
    if (u.error) setMsg(`Errore getUser: ${u.error.message}`)
    setUserId(u.data.user?.id ?? null)

    let query = supabase
      .from('opportunities')
      .select('id, owner_id, club_name, title, description, sport, role, city, created_at')
      .order('created_at', { ascending: false })

    const role = (opts?.role ?? qRole).trim()
    const city = (opts?.city ?? qCity).trim()

    if (role) query = query.ilike('role', `%${role}%`)
    if (city) query = query.ilike('city', `%${city}%`)

    const { data, error } = await query

    if (error) setMsg(`Errore caricamento annunci: ${error.message}`)
    setList((data ?? []) as Opp[])
    setLoading(false)
  }

  // Primo caricamento dati (usa filtri già caricati da LS)
  useEffect(() => {
    // aspetta il primo paint per assicurarsi che qRole/qCity siano quelli di LS
    // poi chiama load() senza argomenti (userà lo stato corrente)
    const t = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Salva i filtri su localStorage quando premo “Filtra”
  const applyFilters = async () => {
    try {
      const toSave: SavedFilters = { role: qRole, city: qCity }
      localStorage.setItem(LS_KEY, JSON.stringify(toSave))
    } catch {
      // ignora errori di storage pieno
    }
    await load()
  }

  const resetFilters = async () => {
    setQRole('')
    setQCity('')
    try { localStorage.removeItem(LS_KEY) } catch { /* noop */ }
    await load({ role: '', city: '' })
  }

  const apply = async (opportunityId: string) => {
    setMsg('')
    setApplyingId(opportunityId)
    try {
      const { data: udata, error: uerr } = await supabase.auth.getUser()
      if (uerr || !udata.user) {
        setMsg(`Devi essere loggato per candidarti: ${uerr?.message ?? ''}`)
        return
      }

      const { error } = await supabase
        .from('applications')
        .insert({ opportunity_id: opportunityId, athlete_id: udata.user.id })

      if (error) {
        if (isPgError(error) && (error.code === '23505' || (error.message ?? '').toLowerCase().includes('duplicate'))) {
          setMsg('Ti sei già candidato a questo annuncio.')
        } else if (isPgError(error)) {
          setMsg(`Errore candidatura: ${error.message}`)
        } else {
          setMsg('Errore candidatura sconosciuto.')
        }
        return
      }

      setMsg('Candidatura inviata! Vai su “Le mie candidature” per vederla.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <main style={{maxWidth:820,margin:'0 auto',padding:24}}>
      <h1>Opportunità</h1>

      {/* Link rapidi per i club */}
      <p style={{margin:'8px 0 12px 0'}}>
        <span style={{opacity:.8, marginRight:8}}>Sei un club?</span>
        <a href="/post" style={{marginRight:12}}>+ Crea annuncio</a>
        <a href="/club/applicants">Candidature ricevute →</a>
      </p>

      {/* Filtri */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0 12px 0'}}>
        <input
          placeholder="Ruolo (es. attaccante)"
          value={qRole}
          onChange={e=>setQRole(e.target.value)}
        />
        <input
          placeholder="Città (es. Carlentini)"
          value={qCity}
          onChange={e=>setQCity(e.target.value)}
        />
        <button onClick={() => void applyFilters()}
          style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>
          Filtra
        </button>
        <button onClick={() => void resetFilters()}
          style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>
          Reset
        </button>
      </div>

      {/* Info utente + messaggi */}
      <div style={{background:'#f8fafc',border:'1px solid #e5e7eb',borderRadius:8,padding:12,margin:'12px 0'}}>
        <div style={{fontSize:12,opacity:.8}}>
          User ID: <code>{userId ?? 'n/d'}</code>
        </div>
        {msg && <div style={{marginTop:8,fontSize:13,color:'#b91c1c'}}>{msg}</div>}
      </div>

      {loading && <p>Caricamento…</p>}
      {!loading && list.length === 0 && <p>Nessun annuncio disponibile.</p>}

      <ul style={{display:'grid',gap:12,marginTop:16}}>
        {list.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <h2 style={{margin:0}}>{o.title}</h2>
            <p style={{margin:'4px 0',fontSize:14,opacity:.8}}>
              {o.club_name} – {o.city}
              {o.owner_id ? <> · <a href={`/c/${o.owner_id}`}>Vedi club →</a></> : null}
            </p>
            {o.description && <p>{o.description}</p>}
            <p style={{fontSize:13}}>Sport: {o.sport} | Ruolo: {o.role}</p>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <button
                onClick={() => void apply(o.id)}
                disabled={applyingId === o.id}
                style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                aria-label={`Candidati all'annuncio ${o.title}`}
              >
                {applyingId === o.id ? 'Invio…' : 'Candidati 1-click'}
              </button>
              <a href="/applications" style={{fontSize:14,alignSelf:'center'}}>Le mie candidature →</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
