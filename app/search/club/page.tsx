'use client'
import { useEffect, useState } from 'react'
import { getClubs, ClubRow } from '@/lib/profiles'

export default function ClubsPage() {
  const [rows, setRows] = useState<ClubRow[]>([])
  const [city, setCity] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    setMsg('')
    try {
      const data = await getClubs({ city: city || undefined, limit: 50 })
      setRows(data)
    } catch (e: any) {
      setMsg(e.message ?? 'Errore caricamento')
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <main style={{maxWidth:720, margin:'0 auto', padding:24}}>
      <h1>Club</h1>
      <div style={{display:'flex', gap:8}}>
        <input placeholder="Filtra per città" value={city} onChange={e=>setCity(e.target.value)} />
        <button onClick={load}>Cerca</button>
      </div>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      <ul style={{marginTop:12, display:'grid', gap:8}}>
        {rows.map(c => (
          <li key={c.id} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:10}}>
            {c.display_name ?? 'Club'} — {c.city ?? 'n/d'}
          </li>
        ))}
      </ul>
    </main>
  )
}
