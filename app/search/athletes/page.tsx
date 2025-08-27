'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { sports, rolesBySport, SportKey } from '@/data/roles'
import { regions, provincesByRegion, Region } from '@/data/geo'

type Profile = {
  id: string
  full_name: string | null
  sport: string | null
  role: string | null
  gender: 'M' | 'F' | null
  birth_year: number | null
  region: string | null
  province: string | null
  city: string | null
}

const thisYear = new Date().getFullYear()

export default function SearchAthletes() {
  const supabase = supabaseBrowser()

  const [list, setList] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const [qSport, setQSport] = useState<SportKey | ''>('')
  const [qGender, setQGender] = useState<'M' | 'F' | ''>('')
  const [qRole, setQRole] = useState<string>('')
  const [qAgeBand, setQAgeBand] = useState<'' | '17-20' | '20-25' | '25-30' | '30+' >('')
  const [qRegion, setQRegion] = useState<Region | ''>('')
  const [qProvince, setQProvince] = useState<string>('')
  const [qCity, setQCity] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setMsg('')

    let query = supabase
      .from('profiles')
      .select('id, full_name, sport, role, gender, birth_year, region, province, city')
      .order('created_at', { ascending: false })

    if (qSport) query = query.eq('sport', qSport.toLowerCase())
    if (qGender) query = query.eq('gender', qGender)
    if (qRole) query = query.ilike('role', `%${qRole}%`)
    if (qRegion) query = query.eq('region', qRegion)
    if (qProvince) query = query.eq('province', qProvince)
    if (qCity) query = query.ilike('city', `%${qCity}%`)

    // Fascia d'età -> converto in range di birth_year
    if (qAgeBand) {
      let minAge = 0, maxAge = 100
      if (qAgeBand === '17-20') { minAge = 17; maxAge = 20 }
      if (qAgeBand === '20-25') { minAge = 20; maxAge = 25 }
      if (qAgeBand === '25-30') { minAge = 25; maxAge = 30 }
      if (qAgeBand === '30+')   { minAge = 30; maxAge = 99 }
      const minYear = thisYear - maxAge
      const maxYear = thisYear - minAge
      query = query.gte('birth_year', minYear).lte('birth_year', maxYear)
    }

    const { data, error } = await query
    if (error) setMsg(`Errore ricerca: ${error.message}`)
    setList((data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => { void load() }, []) // eslint-disable-line

  const rolesForSport = qSport ? rolesBySport[qSport] : []

  return (
    <main style={{maxWidth:920,margin:'0 auto',padding:24}}>
      <h1>Ricerca atleti</h1>

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

        <select value={qAgeBand} onChange={e=>setQAgeBand(e.target.value as any)}>
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

        <input placeholder="Città" value={qCity} onChange={e=>setQCity(e.target.value)} />
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <button onClick={() => void load()} style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>Cerca</button>
        <a href="/post" style={{marginLeft:'auto'}}>+ Crea annuncio</a>
      </div>

      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && list.length === 0 && <p>Nessun atleta trovato.</p>}

      <ul style={{display:'grid',gap:12,marginTop:16}}>
        {list.map(p => (
          <li key={p.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:600}}>{p.full_name ?? 'Atleta'}</div>
                <div style={{fontSize:14,opacity:.8}}>
                  {p.role ?? '—'} · {p.sport ?? '—'} · {p.city ?? '—'}
                </div>
                <div style={{fontSize:12,opacity:.7}}>
                  {p.gender ? (p.gender === 'M' ? 'Maschile' : 'Femminile') : 'Genere n/d'}
                  {p.birth_year ? ` · Età ~ ${thisYear - p.birth_year}` : ''}
                </div>
              </div>
              <div style={{alignSelf:'center'}}>
                <a href={`/u/${p.id}`}>Vedi profilo →</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
