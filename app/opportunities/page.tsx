'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  owner_id: string | null
  club_name: string
  title: string
  description: string | null
  sport: string
  role: string
  region: string | null
  province: string | null
  city: string
  created_at: string
}

type Filters = {
  sport: string
  gender: '' | 'M' | 'F'
  role: string
  ageBand: '' | '17-20' | '20-25' | '25-30' | '30+'
  region: string
  province: string
  city: string
}

const defaultFilters: Filters = {
  sport: '',
  gender: '',
  role: '',
  ageBand: '',
  region: '',
  province: '',
  city: ''
}

export default function OpportunitiesPage() {
  const supabase = supabaseBrowser()
  const [f, setF] = useState<Filters>(defaultFilters)
  const [rows, setRows] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true); setMsg('')
    const q = supabase.from('opportunities')
      .select('id, owner_id, club_name, title, description, sport, role, region, province, city, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (f.sport) q.eq('sport', f.sport)
    if (f.role) q.eq('role', f.role)
    if (f.region) q.eq('region', f.region)
    if (f.province) q.eq('province', f.province)
    if (f.city) q.eq('city', f.city)

    const { data, error } = await q
    if (error) { setMsg(`Errore caricamento: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as Opp[])
    setLoading(false)
  }, [supabase, f])

  useEffect(() => { void load() }, [load])

  const reset = () => setF(defaultFilters)

  const saveAlert = async () => {
    setMsg('')
    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) { setMsg('Devi accedere per salvare un avviso.'); return }
    if (!f.sport) { setMsg('Seleziona almeno lo sport per salvare un avviso.'); return }

    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: u.data.user.id,
        sport: f.sport,
        role: f.role || null,
        region: f.region || null,
        province: f.province || null,
        city: f.city || null
      })
    if (error) { setMsg(`Errore salvataggio avviso: ${error.message}`); return }
    setMsg('Avviso salvato! Riceverai una email quando usciranno annunci che combaciano.')
  }

  return (
    <main style={{maxWidth:960, margin:'0 auto', padding:24}}>
      <h1>Opportunità</h1>

      <div style={{display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', alignItems:'end', marginTop:12}}>
        <div>
          <label>Sport</label>
          <select value={f.sport} onChange={e=>setF({...f, sport:e.target.value, role:''})}>
            <option value="">—</option>
            <option value="calcio">Calcio</option>
            <option value="futsal">Futsal</option>
            <option value="basket">Basket</option>
            <option value="volley">Volley</option>
          </select>
        </div>

        <div>
          <label>Genere</label>
          <select value={f.gender} onChange={e=>setF({...f, gender:e.target.value as Filters['gender']})}>
            <option value="">—</option>
            <option value="M">Maschile</option>
            <option value="F">Femminile</option>
          </select>
        </div>

        <div>
          <label>Ruolo</label>
          <select value={f.role} onChange={e=>setF({...f, role:e.target.value})} disabled={!f.sport}>
            <option value="">—</option>
            {f.sport === 'calcio' && (
              <>
                <option value="portiere">Portiere</option>
                <option value="difensore">Difensore</option>
                <option value="centrocampista">Centrocampista</option>
                <option value="attaccante">Attaccante</option>
              </>
            )}
            {f.sport === 'futsal' && (
              <>
                <option value="portiere">Portiere</option>
                <option value="ultimo">Ultimo</option>
                <option value="laterale">Laterale</option>
                <option value="pivot">Pivot</option>
              </>
            )}
            {f.sport === 'basket' && (
              <>
                <option value="playmaker">Playmaker</option>
                <option value="guardia">Guardia</option>
                <option value="ala">Ala</option>
                <option value="centro">Centro</option>
              </>
            )}
            {f.sport === 'volley' && (
              <>
                <option value="palleggiatore">Palleggiatore</option>
                <option value="schiacciatore">Schiacciatore</option>
                <option value="opposto">Opposto</option>
                <option value="centrale">Centrale</option>
                <option value="libero">Libero</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label>Fascia età</label>
          <select value={f.ageBand} onChange={e=>setF({...f, ageBand: e.target.value as Filters['ageBand']})}>
            <option value="">—</option>
            <option value="17-20">17/20</option>
            <option value="20-25">20/25</option>
            <option value="25-30">25/30</option>
            <option value="30+">30 in sù</option>
          </select>
        </div>

        <div>
          <label>Regione</label>
          <input value={f.region} onChange={e=>setF({...f, region:e.target.value, province:'', city:''})} placeholder="es. Sicilia" />
        </div>

        <div>
          <label>Provincia</label>
          <input value={f.province} onChange={e=>setF({...f, province:e.target.value, city:''})} placeholder="es. Siracusa" />
        </div>

        <div>
          <label>Città</label>
          <input value={f.city} onChange={e=>setF({...f, city:e.target.value})} placeholder="es. Carlentini" />
        </div>

        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>{ void load() }} style={{padding:'8px 12px'}}>Filtra</button>
          <button onClick={reset} style={{padding:'8px 12px'}}>Reset</button>
        </div>

        <div style={{justifySelf:'end'}}>
          <button onClick={()=>{ void saveAlert() }} style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8}}>
            Salva ricerca
          </button>
        </div>
      </div>

      {msg && <p style={{color:'#b91c1c', marginTop:8}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && rows.length === 0 && <p>Nessun annuncio disponibile.</p>}

      <ul style={{display:'grid', gap:12, marginTop:16}}>
        {rows.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
              <div>
                <div style={{fontWeight:600}}>{o.title}</div>
                <div style={{fontSize:14, opacity:.8}}>
                  {o.club_name} — {o.city} {o.province ? `(${o.province})` : ''} — Ruolo: {o.role}
                  {' · '}<Link href={`/c/${o.owner_id ?? ''}`}>Vedi club →</Link>
                </div>
                <div style={{fontSize:12, opacity:.7}}>
                  Pubblicato: {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
              <div style={{alignSelf:'center'}}>
                <form action="/apply" method="post">
                  {/* Placeholder: il tuo bottone 1-click */}
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p style={{marginTop:12}}>
        Sei un club? <Link href="/post">+ Crea annuncio</Link>
        {' '}· <Link href="/alerts">I miei avvisi</Link>
      </p>
    </main>
  )
}
