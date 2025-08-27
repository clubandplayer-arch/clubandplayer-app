'use client'
import { useEffect, useState } from 'react'
import { getAthletes, AthleteRow } from '@/lib/profiles'

export default function AthletesPage() {
  const [rows, setRows] = useState<AthleteRow[]>([])
  const [sport, setSport] = useState('')
  const [role, setRole] = useState('')
  const [city, setCity] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    setMsg('')
    try {
      const data = await getAthletes({
        sport: sport || undefined,
        role: role || undefined,
        city: city || undefined,
        limit: 50
      })
      setRows(data)
    } catch (e: any) {
      setMsg(e.message ?? 'Errore caricamento')
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <main style={{maxWidth:820, margin:'0 auto', padding:24}}>
      <h1>Atleti</h1>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8}}>
        <select value={sport} onChange={e=>{ setSport(e.target.value); setRole('') }}>
          <option value="">Sport</option>
          <option value="calcio">Calcio</option>
          <option value="futsal">Futsal</option>
          <option value="basket">Basket</option>
          <option value="volley">Volley</option>
        </select>
        <select value={role} onChange={e=>setRole(e.target.value)} disabled={!sport}>
          <option value="">Ruolo</option>
          {sport==='calcio' && ['portiere','difensore','centrocampista','attaccante'].map(r=><option key={r} value={r}>{r}</option>)}
          {sport==='futsal' && ['portiere','difensore','pivot','laterale'].map(r=><option key={r} value={r}>{r}</option>)}
          {sport==='basket' && ['playmaker','guardia','ala','centro'].map(r=><option key={r} value={r}>{r}</option>)}
          {sport==='volley' && ['palleggiatore','schiacciatore','centrale','libero'].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <input placeholder="Città" value={city} onChange={e=>setCity(e.target.value)} />
        <div>
          <button onClick={load}>Filtra</button>
        </div>
      </div>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      <ul style={{display:'grid', gap:8, marginTop:12}}>
        {rows.map(a => (
          <li key={a.id} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:10}}>
            {a.full_name ?? 'Atleta'} — {a.sport ?? '—'} · {a.role ?? '—'} · {a.city ?? '—'}
          </li>
        ))}
      </ul>
    </main>
  )
}
