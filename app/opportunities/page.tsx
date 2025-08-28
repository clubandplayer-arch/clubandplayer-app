'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opportunity = {
  id: string
  title: string
  club_name: string
  city: string
  region: string | null
  province: string | null
  role: string | null
  sport: string | null
  created_at: string
  owner_id: string
}

type Favorite = { id: string; opportunity_id: string }

type Filters = {
  sport: string
  gender: string
  ageRange: string
  region: string
  province: string
  city: string
}

const initialFilters: Filters = {
  sport: '',
  gender: '',
  ageRange: '',
  region: '',
  province: '',
  city: '',
}

export default function OpportunitiesPage() {
  const supabase = supabaseBrowser()

  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [list, setList] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')

  // preferiti
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  // carica user + preferiti all’avvio
  useEffect(() => {
    const loadFavs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('favorites').select('opportunity_id')
      const ids = new Set((data ?? []).map((f: Favorite) => f.opportunity_id))
      setSaved(ids)
    }
    loadFavs()
  }, [supabase])

  const toggleFavorite = async (opportunityId: string) => {
    if (!userId) { alert('Devi essere loggato'); return }
    if (saved.has(opportunityId)) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ athlete_id: userId, opportunity_id: opportunityId })
      if (!error) setSaved(prev => { const n = new Set(prev); n.delete(opportunityId); return n })
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ athlete_id: userId, opportunity_id: opportunityId })
      if (!error) setSaved(prev => new Set(prev).add(opportunityId))
    }
  }

  // carica lista annunci
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    let query = supabase
      .from('opportunities')
      .select('id, title, club_name, city, region, province, role, sport, created_at, owner_id')
      .order('created_at', { ascending: false })

    if (filters.sport) query = query.eq('sport', filters.sport)
    if (filters.region) query = query.eq('region', filters.region)
    if (filters.province) query = query.eq('province', filters.province)
    if (filters.city) query = query.ilike('city', `%${filters.city}%`)
    // gender e ageRange sono campi logici: se li gestisci davvero a DB, aggiungi le eq qui.

    const { data, error } = await query
    if (error) {
      setMsg(`Errore caricamento annunci: ${error.message}`)
      setList([])
    } else {
      setList((data ?? []) as Opportunity[])
    }
    setLoading(false)
  }, [filters, supabase])

  useEffect(() => { load() }, [load])

  const resetFilters = () => setFilters(initialFilters)

  // apply 1-click
  const applyQuick = async (opportunityId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Devi essere loggato'); return }

    const { error } = await supabase.from('applications').insert({
      opportunity_id: opportunityId,
      athlete_id: user.id,
      status: 'inviata'
    })

    if (error) alert(`Errore candidatura: ${error.message}`)
    else alert('Candidatura inviata!')
  }

  // segnala annuncio
  const reportOpportunity = async (opp: Opportunity) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Devi essere loggato'); return }

    // scelta rapida del motivo
    const preset = window.prompt(
      'Motivo segnalazione (es. spam, contenuto scorretto, duplicato). Scrivi il motivo:',
      'spam'
    )
    if (!preset) return

    const comment = window.prompt('Dettagli aggiuntivi (opzionale):', '') ?? ''

    // insert diretta (RLS: authenticated può inserire)
    const { error } = await supabase.from('reports').insert({
      target_type: 'opportunity',
      target_id: opp.id,
      reason: preset,
      comment
    })

    if (error) alert(`Errore segnalazione: ${error.message}`)
    else alert('Grazie! La tua segnalazione è stata inviata.')
  }

  const hasList = useMemo(() => list.length > 0, [list])

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h1 style={{margin:0}}>Opportunità</h1>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <Link href="/club/post">Sei un club?&nbsp;<b>+ Crea annuncio</b></Link>
          <Link href="/applications">Candidature ricevute →</Link>
          <Link href="/search/athletes">Sei un club? Cerca atleti →</Link>
        </div>
      </div>

      {/* F I L T R I */}
      <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16,marginTop:12}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <div>
            <label>Sport</label>
            <select value={filters.sport} onChange={e=>setFilters(s=>({...s,sport:e.target.value}))}>
              <option value="">—</option>
              <option value="calcio">Calcio</option>
              <option value="basket">Basket</option>
              <option value="volley">Volley</option>
            </select>
          </div>

          <div>
            <label>Genere</label>
            <select value={filters.gender} onChange={e=>setFilters(s=>({...s,gender:e.target.value}))}>
              <option value="">—</option>
              <option value="maschile">Maschile</option>
              <option value="femminile">Femminile</option>
              <option value="misto">Misto</option>
            </select>
          </div>

          <div>
            <label>Fascia età</label>
            <select value={filters.ageRange} onChange={e=>setFilters(s=>({...s,ageRange:e.target.value}))}>
              <option value="">—</option>
              <option value="u15">U15</option>
              <option value="u17">U17</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          <div>
            <label>Regione</label>
            <input
              value={filters.region}
              onChange={e=>setFilters(s=>({...s,region:e.target.value}))}
              placeholder="es. Sicilia"
            />
          </div>

          <div>
            <label>Provincia</label>
            <input
              value={filters.province}
              onChange={e=>setFilters(s=>({...s,province:e.target.value}))}
              placeholder="es. SR"
            />
          </div>

          <div>
            <label>Città (es. Carlentini)</label>
            <input
              value={filters.city}
              onChange={e=>setFilters(s=>({...s,city:e.target.value}))}
              placeholder="Città"
            />
          </div>
        </div>

        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={load} style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>Filtra</button>
          <button onClick={resetFilters} style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>Reset</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading && <p>Caricamento…</p>}
        {!!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
        {!loading && !msg && !hasList && <p>Nessun annuncio disponibile.</p>}
      </div>

      {/* L I S T A  A N N U N C I */}
      <ul style={{display:'grid',gap:12,marginTop:8}}>
        {list.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:700, fontSize:18}}>{o.title}</div>
                <div style={{fontSize:14,opacity:.85}}>
                  {o.club_name} — {o.city} {o.province ? `(${o.province})` : ''} {o.region ? `· ${o.region}` : ''} {o.role ? `· Ruolo: ${o.role}` : ''} {o.sport ? `· Sport: ${o.sport}` : ''}
                </div>
                <div style={{fontSize:12,opacity:.7,marginTop:4}}>
                  Pubblicato: {new Date(o.created_at).toLocaleString()} ·{' '}
                  <Link href={`/c/${o.owner_id}`}>Vai al profilo club</Link>
                </div>
              </div>

              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <button
                  onClick={() => applyQuick(o.id)}
                  style={{padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                >
                  Candidati 1-click
                </button>

                <button
                  onClick={() => toggleFavorite(o.id)}
                  style={{padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                >
                  {saved.has(o.id) ? '★ Salvato' : '☆ Salva'}
                </button>

                <button
                  onClick={() => reportOpportunity(o)}
                  title="Segnala questo annuncio allo staff"
                  style={{padding:'6px 10px',border:'1px solid #f97316',color:'#9a3412',background:'#fff7ed',borderRadius:8,cursor:'pointer'}}
                >
                  Segnala
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
