'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  club_name: string
  title: string
  description: string | null
  sport: string
  role: string
  city: string
}

function isPgError(e: unknown): e is { code?: string; message?: string } {
  return typeof e === 'object' && e !== null && 'message' in e
}

export default function OpportunitiesPage() {
  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const supabase = supabaseBrowser()

  // carico utente + annunci
  useEffect(() => {
    const load = async () => {
      setMsg('')
      const u = await supabase.auth.getUser()
      if (u.error) setMsg(`Errore getUser: ${u.error.message}`)
      setUserId(u.data.user?.id ?? null)

      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) setMsg(`Errore caricamento annunci: ${error.message}`)
      if (data) setList(data as Opp[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const apply = async (opportunityId: string) => {
    setMsg('')
    setApplyingId(opportunityId)
    try {
      const { data: udata, error: uerr } = await supabase.auth.getUser()
      if (uerr || !udata.user) {
        setMsg(`Non sei loggato: ${uerr?.message ?? 'user null'}`)
        return
      }

      console.log('Applying with', { opportunityId, athlete_id: udata.user.id })

      const { error } = await supabase
        .from('applications')
        .insert({ opportunity_id: opportunityId, athlete_id: udata.user.id })

      if (error) {
        console.error('Insert error', error)
        if (isPgError(error) && (error.code === '23505' || (error.message ?? '').toLowerCase().includes('duplicate'))) {
          setMsg('Ti sei già candidato a questo annuncio.')
        } else if (isPgError(error)) {
          setMsg(`Errore candidatura: ${error.message}`)
        } else {
          setMsg('Errore candidatura sconosciuto.')
        }
        return
      }

      setMsg('Candidatura inviata! Vai su “Le mie candidature” per vederla.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:24}}>
      <h1>Opportunità</h1>
<p style={{marginTop:8}}>
  Sei un club? <a href="/post">Crea un annuncio →</a>
</p>
      <div style={{background:'#f8fafc',border:'1px solid #e5e7eb',borderRadius:8,padding:12,margin:'12px 0'}}>
        <div style={{fontSize:12,opacity:.8}}>
          User ID: <code>{userId ?? 'n/d'}</code>
        </div>
        {msg && <div style={{marginTop:8,fontSize:13,color:'#b91c1c'}}>{msg}</div>}
      </div>

      {loading && <p>Caricamento…</p>}
      {!loading && list.length === 0 && <p>Nessun annuncio disponibile.</p>}

      <ul style={{display:'grid',gap:12,marginTop:16}}>
        {list.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <h2 style={{margin:0}}>{o.title}</h2>
            <p style={{margin:'4px 0',fontSize:14,opacity:.8}}>
              {o.club_name} – {o.city}
            </p>
            {o.description && <p>{o.description}</p>}
            <p style={{fontSize:13}}>Sport: {o.sport} | Ruolo: {o.role}</p>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <button
                onClick={() => apply(o.id)}
                disabled={applyingId === o.id}
                style={{padding:'6px 12px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}
                aria-label={`Candidati all'annuncio ${o.title}`}
              >
                {applyingId === o.id ? 'Invio…' : 'Candidati 1-click'}
              </button>
              <a href="/applications" style={{fontSize:14,alignSelf:'center'}}>Le mie candidature →</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
