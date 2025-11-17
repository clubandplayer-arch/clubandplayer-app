'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Club = {
  id: string
  display_name: string
  city: string | null
  bio: string | null
  logo_url: string | null
}

export default function SearchClubPage() {
  const supabase = supabaseBrowser()

  const [name, setName] = useState<string>('') // filtro per nome club
  const [city, setCity] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')
  const [items, setItems] = useState<Club[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    let q = supabase
      .from('clubs')
      .select('id, display_name, city, bio, logo_url')
      .order('created_at', { ascending: false })

    if (name) q = q.ilike('display_name', `%${name}%`)
    if (city) q = q.ilike('city', `%${city}%`)

    const { data, error } = await q
    if (error) {
      setMsg(`Errore ricerca club: ${error.message}`)
      setItems([])
      setLoading(false)
      return
    }

    setItems((data ?? []) as Club[])
    setLoading(false)
  }, [supabase, name, city])

  useEffect(() => {
    void load()
  }, [load])

  const reset = () => {
    setName('')
    setCity('')
    void load()
  }

  return (
    <main style={{maxWidth:1024, margin:'0 auto', padding:24}}>
      <header style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
        <h1 style={{margin:0}}>Cerca club</h1>
        <div style={{marginLeft:'auto'}}>
          <Link href="/opportunities">← Torna alle opportunità</Link>
        </div>
      </header>

      <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, marginTop:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12}}>
          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Nome club</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Es. ASD Carlentini"
              style={{width:'100%'}}
            />
          </div>
          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Città</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Es. Carlentini"
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
        {items.length === 0 && !loading && !msg && <p>Nessun club trovato.</p>}
        {items.map(c => (
          <div key={c.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
            <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap'}}>
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                {c.logo_url ? (
                  <Image src={c.logo_url} alt={c.display_name} width={56} height={56} style={{borderRadius:8, objectFit:'cover'}} />
                ) : (
                  <div style={{width:56, height:56, borderRadius:8, background:'#e5e7eb'}} />
                )}
                <div>
                  <div style={{fontWeight:600}}>{c.display_name}</div>
                  <div style={{fontSize:14, opacity:.8}}>{c.city ?? '—'}</div>
                </div>
              </div>
              <div>
                <Link href={`/c/${c.id}`}>Vedi profilo club →</Link>
              </div>
            </div>

            {c.bio && (
              <p style={{margin:'8px 0 0 0', fontSize:14, opacity:.85, whiteSpace:'pre-wrap'}}>
                {c.bio}
              </p>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}
