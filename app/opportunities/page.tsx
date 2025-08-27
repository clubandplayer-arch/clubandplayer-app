'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

// ---------- Tipi ----------
type Opportunity = {
  id: string
  title: string
  club_name: string
  sport: string
  role: string
  region: string | null
  province: string | null
  city: string
  owner_id: string | null
  created_at: string
}

type FavoriteRow = { opportunity_id: string }
type ApplicationRow = { opportunity_id: string }

type Sport = 'calcio' | 'futsal' | 'basket' | 'volley'
const isSport = (v: string): v is Sport =>
  v === 'calcio' || v === 'futsal' || v === 'basket' || v === 'volley'

// ruoli per sport (minimali per MVP)
const ROLES: Record<Sport, string[]> = {
  calcio: ['portiere', 'difensore', 'centrocampista', 'attaccante'],
  futsal: ['portiere', 'difensore', 'pivot', 'laterale'],
  basket: ['playmaker', 'guardia', 'ala', 'centro'],
  volley: ['palleggiatore', 'schiacciatore', 'centrale', 'libero'],
}

// ---------- Componente ----------
export default function OpportunitiesPage() {
  const supabase = supabaseBrowser()

  // UI state
  const [loading, setLoading] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')

  // Filtri
  const [sport, setSport] = useState<Sport | ''>('')
  const [role, setRole] = useState<string>('') // dipende da sport
  const [region, setRegion] = useState<string>('')   // opzionale
  const [province, setProvince] = useState<string>('') // opzionale
  const [city, setCity] = useState<string>('') // testo libero

  // Dati
  const [list, setList] = useState<Opportunity[]>([])

  // Utente + preferiti + candidature già inviate
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())     // opportunity_id salvati
  const [applied, setApplied] = useState<Set<string>>(new Set()) // opportunity_id già candidati

  // Carica info utente, preferiti, candidature
  useEffect(() => {
    const bootstrap = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const u = userData.user
      if (!u) return
      setUserId(u.id)

      // preferiti dell'utente
      const { data: favs } = await supabase
        .from('favorites')
        .select('opportunity_id')
      const favIds = new Set((favs ?? []).map((r: FavoriteRow) => r.opportunity_id))
      setSaved(favIds)

      // candidature dell'utente
      const { data: apps } = await supabase
        .from('applications')
        .select('opportunity_id')
        .eq('athlete_id', u.id)
      const appIds = new Set((apps ?? []).map((r: ApplicationRow) => r.opportunity_id))
      setApplied(appIds)
    }
    void bootstrap()
  }, [supabase])

  // Carica opportunità in base ai filtri
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    let query = supabase
      .from('opportunities')
      .select('id, title, club_name, sport, role, region, province, city, owner_id, created_at')
      .order('created_at', { ascending: false })

    if (sport) query = query.eq('sport', sport)
    if (role) query = query.eq('role', role)
    if (region) query = query.eq('region', region)
    if (province) query = query.eq('province', province)
    if (city) query = query.ilike('city', `%${city}%`)

    const { data, error } = await query

    if (error) {
      setMsg(`Errore caricamento annunci: ${error.message}`)
      setList([])
      setLoading(false)
      return
    }

    setList((data ?? []) as Opportunity[])
    setLoading(false)
  }, [supabase, sport, role, region, province, city])

  useEffect(() => {
    void load()
  }, [load])

  // Salva/Rimuovi preferiti
  const toggleFavorite = useCallback(async (opportunityId: string) => {
    if (!userId) { alert('Devi essere loggato'); return }

    if (saved.has(opportunityId)) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ athlete_id: userId, opportunity_id: opportunityId })
      if (error) { alert(`Errore rimozione: ${error.message}`); return }
      setSaved(prev => {
        const next = new Set(prev)
        next.delete(opportunityId)
        return next
      })
      return
    }

    const { error } = await supabase
      .from('favorites')
      .insert({ athlete_id: userId, opportunity_id: opportunityId })
    if (error) { alert(`Errore salvataggio: ${error.message}`); return }
    setSaved(prev => {
      const next = new Set(prev)
      next.add(opportunityId)
      return next
    })
  }, [saved, supabase, userId])

  // Candidatura 1-click
  const handleApply = useCallback(async (opportunityId: string) => {
    if (!userId) { alert('Devi essere loggato'); return }
    if (applied.has(opportunityId)) { return }

    const { error } = await supabase
      .from('applications')
      .insert({ opportunity_id: opportunityId, athlete_id: userId, status: 'inviata' })
    if (error) { alert(`Errore candidatura: ${error.message}`); return }

    setApplied(prev => {
      const next = new Set(prev)
      next.add(opportunityId)
      return next
    })
    alert('Candidatura inviata!')
  }, [applied, supabase, userId])

  const resetFilters = () => {
    setSport('')
    setRole('')
    setRegion('')
    setProvince('')
    setCity('')
  }

  // Ruoli coerenti con sport selezionato
  const roleOptions: string[] = sport ? ROLES[sport] : []

  return (
    <main style={{maxWidth:1024, margin:'0 auto', padding:24}}>
      <header style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
        <h1 style={{margin:0}}>Opportunità</h1>
        <div style={{marginLeft:'auto', display:'flex', gap:12, flexWrap:'wrap'}}>
          <Link href="/post">+ Crea annuncio</Link>
          <Link href="/club/applicants">Candidature ricevute →</Link>
          <Link href="/search/athletes">Sei un club? Cerca atleti →</Link>
          <Link href="/favorites">Preferiti</Link>
        </div>
      </header>

      {/* Filtri */}
      <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginTop:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12}}>
          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Sport</label>
            <select
              value={sport}
              onChange={e => { const v = e.target.value; setSport(isSport(v) ? v : ''); setRole('') }}
              style={{width:'100%'}}
            >
              <option value="">—</option>
              <option value="calcio">Calcio</option>
              <option value="futsal">Futsal</option>
              <option value="basket">Basket</option>
              <option value="volley">Volley</option>
            </select>
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Ruolo</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              disabled={!sport}
              style={{width:'100%'}}
            >
              <option value="">{sport ? '— seleziona —' : 'Seleziona sport prima'}</option>
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Regione</label>
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder="es. Sicilia"
              style={{width:'100%'}}
            />
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Provincia</label>
            <input
              value={province}
              onChange={e => setProvince(e.target.value)}
              placeholder="es. SR"
              style={{width:'100%'}}
            />
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Città</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="es. Carlentini"
              style={{width:'100%'}}
            />
          </div>
        </div>

        <div style={{display:'flex', gap:8, marginTop:12}}>
          <button
            onClick={() => void load()}
            style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}
          >
            Filtra
          </button>
          <button
            onClick={() => { resetFilters(); void load() }}
            style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}
          >
            Reset
          </button>
        </div>
      </section>

      {msg && <p style={{color:'#b91c1c', marginTop:12}}>{msg}</p>}
      {loading && <p style={{marginTop:12}}>Caricamento…</p>}

      {/* Lista opportunità */}
      <section style={{display:'grid', gap:12, marginTop:12}}>
        {list.length === 0 && !loading && !msg && (
          <p>Nessun annuncio disponibile.</p>
        )}

        {list.map(o => (
          <div key={o.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:600}}>{o.title}</div>
                <div style={{fontSize:14, opacity:.8}}>
                  {o.club_name} — {o.city} — Ruolo: {o.role} {o.sport ? `— ${o.sport}` : ''}
                </div>
                <div style={{fontSize:12, opacity:.6, marginTop:4}}>
                  Pubblicato: {new Date(o.created_at).toLocaleString()}
                </div>
                {o.owner_id && (
                  <div style={{marginTop:4}}>
                    <Link href={`/c/${o.owner_id}`}>Vedi club →</Link>
                  </div>
                )}
              </div>

              <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                <button
                  onClick={() => void handleApply(o.id)}
                  disabled={applied.has(o.id)}
                  style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}
                >
                  {applied.has(o.id) ? 'Candidatura inviata' : 'Candidati 1-click'}
                </button>

                <button
                  onClick={() => void toggleFavorite(o.id)}
                  style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}
                  aria-pressed={saved.has(o.id)}
                >
                  {saved.has(o.id) ? 'Rimuovi dai preferiti' : 'Salva tra i preferiti'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
