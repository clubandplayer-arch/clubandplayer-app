'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { sports, rolesBySport, SportKey } from '@/data/roles'
import { regions, provincesByRegion, Region } from '@/data/geo'

type Opp = {
  id: string
  owner_id?: string | null
  club_name: string
  title: string
  description: string | null
  sport: string
  role: string
  city: string
  region?: string | null
  province?: string | null
  target_gender?: 'M' | 'F' | null
  min_birth_year?: number | null
  max_birth_year?: number | null
}

const LS_KEY = 'opps_filters_v2'

type AgeBand = '' | '17-20' | '20-25' | '25-30' | '30+'
const isAgeBand = (v: string): v is AgeBand =>
  v === '' || v === '17-20' || v === '20-25' || v === '25-30' || v === '30+'

type SavedFilters = {
  sport: SportKey | ''
  gender: 'M' | 'F' | ''
  role: string
  ageBand: AgeBand
  region: Region | ''
  province: string
  city: string
}

export default function OpportunitiesPage() {
  const supabase = supabaseBrowser()

  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // Filtri UI
  const [qSport, setQSport] = useState<SportKey | ''>('')
  const [qGender, setQGender] = useState<'M' | 'F' | ''>('')
  const [qRole, setQRole] = useState<string>('')
  const [qAgeBand, setQAgeBand] = useState<AgeBand>('')
  const [qRegion, setQRegion] = useState<Region | ''>('')
  const [qProvince, setQProvince] = useState<string>('')
  const [qCity, setQCity] = useState<string>('')

  // Carica filtri da LS
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const f = JSON.parse(raw) as SavedFilters
        setQSport((f.sport as SportKey) ?? '')
        setQGender((f.gender as 'M' | 'F') ?? '')
        setQRole(f.role ?? '')
        setQAgeBand(isAgeBand(f.ageBand) ? f.ageBand : '')
        setQRegion((f.region as Region) ?? '')
        setQProvince(f.province ?? '')
        setQCity(f.city ?? '')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    const u = await supabase.auth.getUser()
    if (u.error) setMsg(`Errore getUser: ${u.error.message}`)
    setUserId(u.data.user?.id ?? null)

    let query = supabase
      .from('opportunities')
      .select('id, owner_id, club_name, title, description, sport, role, city, region, province, target_gender, min_birth_year, max_birth_year, created_at')
      .order('created_at', { ascending: false })

    if (qSport) query = query.eq('sport', qSport.toLowerCase())
    if (qGender) query = query.eq('target_gender', qGender)
    if (qRole) query = query.ilike('role', `%${qRole}%`)
    if (qRegion) query = query.eq('region', qRegion)
    if (qProvince) query = query.eq('province', qProvince)
    if (qCity) query = query.ilike('city', `%${qCity}%`)

    const { data, error } = await query
    if (error) setMsg(`Errore caricamento annunci: ${error.message}`)
    setList((data ?? []) as Opp[])
    setLoading(false)
  }, [supabase, qSport, qGender, qRole, qRegion, qProvince, qCity])

  // primo load
  useEffect(() => { void load() }, [load])

  const applyFilters = async () => {
    try {
      const toSave: SavedFilters = {
        sport: qSport, gender: qGender, role: qRole, ageBand: qAgeBand,
        region: qRegion, province: qProvince, city: qCity
      }
      localStorage.setItem(LS_KEY, JSON.stringify(toSave))
    } catch { /* ignore */ }
    await void load()
  }

  const resetFilters = async () => {
    setQSport(''); setQGender(''); setQRole(''); setQAgeBand('')
    setQRegion(''); setQProvince(''); setQCity('')
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    await void load()
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
        const message = (error as { message?: string }).message ?? ''
        if (message.toLowerCase().includes('duplicate') || message.includes('23505')) {
          setMsg('Ti sei già candidato a questo annuncio.')
        } else {
          setMsg(`Errore candidatura: ${message}`)
        }
        return
      }

      setMsg('Candidatura inviata! Vai su “Le mie candidature”.')
    } finally {
      setApplyingId(null)
    }
  }

  const rolesForSport = qSport ? rolesBySport[qSport] : []

  return (
    <main style={{maxWidth:920,margin:'0 auto',padding:24}}>
      <h1>Opportunità</h1>

      <p style={{margin:'8px 0 12px 0'}}>
        <span style={{opacity:.8, marginRight:8}}>Sei un club?</span>
        <a href="/post" style={{marginRight:12}}>+ Crea annuncio</a>
        <a href="/club/applicants">Candidature ricevute →</a>
      </p>

      <p style={{marginTop:4}}>
        Sei un club? <a href="/search/athletes">Cerca atleti →</a>
      </p>

      {/* Filtri */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,margin:'8px 0 12px 0'}}>
        <select value={qSport} onChange={e=>setQSport(e.target.value as SportKey | '')}>
          <option value="">Sport</option>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={qGender} onChange={e=>setQGender(e.target.value as 'M'|'F'|'')}>
          <option value="">Genere</option>
          <option value="M">Maschile</option>
          <option value="F">Femminile</option>
        </select>

        <select value={qRole} onChange={e=>setQRole(e.target.value)}>
          <option value="">{qSport ? 'Ruolo' : 'Seleziona sport prima'}</option>
          {rolesForSport.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={qAgeBand} onChange={e => {
          const v = e.target.value
          if (isAgeBand(v)) setQAgeBand(v)
        }}>
          <option value="">Fascia età</option>
          <option value="17-20">17/20</option>
          <option value="20-25">20/25</option>
          <option value="25-30">25/30</option>
          <option value="30+">30 in sù</option>
        </select>

        <select value={qRegion} onChange={e=>setQRegion(e.target.value as Region | '')}>
          <option value="">Regione</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={qProvince} onChange={e=>setQProvince(e.target.value)} disabled={!qRegion}>
          <option value="">{qRegion ? 'Provincia' : 'Seleziona regione prima'}</option>
          {qRegion && provincesByRegion[qRegion].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <input
          placeholder="Città (es. Carlentini)"
          value={qCity}
          onChange={e=>setQCity(e.target.value)}
        />
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <button onClick={() => { void applyFilters() }} style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>Filtra</button>
        <button onClick={() => { void resetFilters() }} style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>Reset</button>
      </div>

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
                onClick={() => { void apply(o.id) }}
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
