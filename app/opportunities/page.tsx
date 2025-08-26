'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  club_name: string
  title: string
  description: string
  sport: string
  role: string
  city: string
}

export default function OpportunitiesPage() {
  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = supabaseBrowser()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
      if (!error && data) setList(data as Opp[])
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:24}}>
      <h1>Opportunità</h1>
      {loading && <p>Caricamento…</p>}
      {!loading && list.length === 0 && <p>Nessun annuncio disponibile.</p>}
      <ul style={{display:'grid',gap:12,marginTop:16}}>
        {list.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <h2 style={{margin:0}}>{o.title}</h2>
            <p style={{margin:'4px 0',fontSize:14,opacity:.8}}>{o.club_name} – {o.city}</p>
            <p>{o.description}</p>
            <p style={{fontSize:13}}>Sport: {o.sport} | Ruolo: {o.role}</p>
            <button style={{marginTop:8,padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>
              Candidati 1-click
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}