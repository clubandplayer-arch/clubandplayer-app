'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type AthleteProfile = {
  id: string
  full_name: string | null
  sport: string | null
  role: string | null
  city: string | null
  account_type: string | null
}

type Sport = 'calcio' | 'futsal' | 'basket' | 'volley'
const isSport = (v: string): v is Sport =>
  v === 'calcio' || v === 'futsal' || v === 'basket' || v === 'volley'

const ROLES: Record<Sport, string[]> = {
  calcio: ['portiere', 'difensore', 'centrocampista', 'attaccante'],
  futsal: ['portiere', 'difensore', 'pivot', 'laterale'],
  basket: ['playmaker', 'guardia', 'ala', 'centro'],
  volley: ['palleggiatore', 'schiacciatore', 'centrale', 'libero']
}

export default function SearchAthletesPage() {
  const supabase = supabaseBrowser()

  // filtri base
  const [sport, setSport] = useState<Sport | ''>('')
  const [role, setRole] = useState<string>('') // dipende dallo sport
  const [city, setCity] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')
  const [items, setItems] = useState<AthleteProfile[]>([])

  const roleOptions = sport ? ROLES[sport] : []

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    let q = supabase
      .from('profiles')
      .select('id, full_name, sport, role, city, account_type')
      .eq('account_type', 'athlete')
      .order('created_at', { ascending: false })

    if (sport) q = q.eq('sport', sport)
    if (role) q = q.eq('role', role)
    if (city) q = q.ilike('city', `%${city}%`)

    const { data, error } = await q
    if (error) {
      setMsg(`Errore ricerca atleti: ${error.message}`)
      setItems([])
      setLoading(false)
      return
    }

    setItems((data ?? []) as AthleteProfile[])
    setLoading(false)
  }, [supabase, sport, role, city])

  useEffect(() => {
    void load()
  }, [load])

  const reset = () => {
    setSport('')
    setRole('')
    setCity('')
    void load()
  }

  return (
    <main style={{maxWidth:1024, margin:'0 auto', padding:24}}>
      <header style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
        <h1 style={{margin:0}}>Cerca atleti</h1>
        <div style={{marginLeft:'auto'}}>
          <Link href="/opportunities">← Torna alle opportunità</Link>
        </div>
      </header>

      <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginTop:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12}}>
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
          <button onClick={() => void load()} style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>Filtra</button>
          <button onClick={reset} style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>Reset</button>
        </div>
      </section>

      {msg && <p style={{color:'#b91c1c', marginTop:12}}>{msg}</p>}
      {loading && <p style={{marginTop:12}}>Caricamento…</p>}

      <section style={{display:'grid', gap:12, marginTop:12}}>
        {items.length === 0 && !loading && !msg && <p>Nessun atleta trovato.</p>}
        {items.map(p => (
          <div key={p.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:600}}>{p.full_name ?? 'Atleta'}</div>
                <div style={{fontSize:14, opacity:.8}}>
                  {p.role ?? '—'} · {p.sport ?? '—'} · {p.city ?? '—'}
                </div>
              </div>
              <div>
                <Link href={`/u/${p.id}`}>Vedi profilo →</Link>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
