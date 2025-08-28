'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Club = {
  id: string
  display_name: string
  city: string | null
  bio: string | null
  logo_url: string | null
}

type Opp = {
  id: string
  title: string
  club_name: string
  city: string
  role: string
  sport: string | null
  created_at: string
}

export default function PublicClubPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [club, setClub] = useState<Club | null>(null)
  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')
      const clubId = params.id
      if (!clubId) { router.replace('/'); return }

      // 1) profilo club (pubblico)
      const { data: clubRow, error: e1 } = await supabase
        .from('clubs')
        .select('id, display_name, city, bio, logo_url')
        .eq('id', clubId)
        .maybeSingle()

      if (e1) { setMsg(`Errore club: ${e1.message}`); setLoading(false); return }
      setClub((clubRow ?? null) as Club | null)

      // 2) annunci del club
      const { data: opps, error: e2 } = await supabase
        .from('opportunities')
        .select('id, title, club_name, city, role, sport, created_at')
        .eq('owner_id', clubId)
        .order('created_at', { ascending: false })

      if (e2) { setMsg(`Errore annunci: ${e2.message}`); setLoading(false); return }
      setList((opps ?? []) as Opp[])
      setLoading(false)
    }
    void load()
  }, [params.id, router, supabase])

  const clubName = useMemo<string>(() => {
    if (club?.display_name) return club.display_name
    if (list.length > 0) return list[0].club_name
    return 'Club'
  }, [club, list])

  return (
    <main style={{maxWidth:820, margin:'0 auto', padding:24}}>
      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}

      {!loading && !msg && (
        <>
          <header style={{display:'flex', gap:16, alignItems:'center', marginBottom:16}}>
            {club?.logo_url ? (
              <Image src={club.logo_url} alt={clubName} width={72} height={72} style={{borderRadius:12, objectFit:'cover'}} />
            ) : (
              <div style={{width:72, height:72, borderRadius:12, background:'#e5e7eb'}} />
            )}
            <div>
              <h1 style={{margin:0}}>{clubName}</h1>
              <p style={{margin:'4px 0', opacity:.8}}>
                {club?.city ?? 'Città n/d'} · Annunci pubblicati: {list.length}
              </p>
              <p style={{margin:0, fontSize:12, opacity:.7}}>ID club: <code>{params.id}</code></p>
            </div>
          </header>

          {club?.bio && (
            <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginBottom:12}}>
              <h2 style={{margin:'0 0 8px 0'}}>Chi siamo</h2>
              <p style={{margin:0, whiteSpace:'pre-wrap'}}>{club.bio}</p>
            </section>
          )}

          <section>
            <h2 style={{margin:'0 0 8px 0'}}>Annunci del club</h2>
            {list.length === 0 ? (
              <p>Nessun annuncio pubblicato da questo club.</p>
            ) : (
              <ul style={{display:'grid', gap:12}}>
                {list.map(o => (
                  <li key={o.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
                    <h3 style={{margin:'0 0 4px 0'}}>{o.title}</h3>
                    <p style={{margin:'0 0 6px 0', fontSize:14, opacity:.8}}>
                      {o.club_name} — {o.city} — Ruolo: {o.role} {o.sport ? `— ${o.sport}` : ''}
                    </p>
                    <p style={{margin:0, fontSize:12, opacity:.7}}>
                      Pubblicato: {new Date(o.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div style={{marginTop:16}}>
            <a href="/opportunities">← Torna alle opportunità</a>
          </div>
        </>
      )}
    </main>
  )
}
