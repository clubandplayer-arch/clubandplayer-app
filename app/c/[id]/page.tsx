'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  title: string
  club_name: string
  city: string
  role: string
  created_at: string
}

export default function PublicClubPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')
      const clubId = params.id
      if (!clubId) { router.replace('/'); return }

      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, club_name, city, role, created_at')
        .eq('owner_id', clubId)
        .order('created_at', { ascending: false })

      if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
      setList((data ?? []) as Opp[])
      setLoading(false)
    }
    load()
  }, [params.id, router, supabase])

  const clubName = useMemo<string>(() => {
    if (list.length === 0) return 'Club'
    // prendi il nome dal più recente
    return list[0].club_name || 'Club'
  }, [list])

  return (
    <main style={{maxWidth:820, margin:'0 auto', padding:24}}>
      <header style={{display:'flex', gap:16, alignItems:'center', marginBottom:16}}>
        <div style={{width:72, height:72, borderRadius:'50%', background:'#e5e7eb'}} />
        <div>
          <h1 style={{margin:0}}>{clubName}</h1>
          <p style={{margin:'4px 0', opacity:.8}}>
            Annunci pubblicati: {list.length}
          </p>
          <p style={{margin:0, fontSize:12, opacity:.7}}>ID club: <code>{params.id}</code></p>
        </div>
      </header>

      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}

      {!loading && !msg && (
        <>
          {list.length === 0 ? (
            <p>Nessun annuncio pubblicato da questo club.</p>
          ) : (
            <ul style={{display:'grid', gap:12, marginTop:8}}>
              {list.map(o => (
                <li key={o.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
                  <h2 style={{margin:'0 0 4px 0'}}>{o.title}</h2>
                  <p style={{margin:'0 0 8px 0', fontSize:14, opacity:.8}}>
                    {o.club_name} — {o.city} — Ruolo: {o.role}
                  </p>
                  <p style={{margin:0, fontSize:12, opacity:.7}}>
                    Pubblicato: {new Date(o.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div style={{marginTop:16}}>
        <a href="/opportunities">← Torna alle opportunità</a>
      </div>
    </main>
  )
}
