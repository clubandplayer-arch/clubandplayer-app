'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ApplicationRow = {
  id: string
  status: string
  created_at: string
  opportunity_id: string
  opportunity?: {
    title: string
    club_name: string
    city: string
    role: string
  }
}

export default function MyApplications() {
  const [list, setList] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const supabase = supabaseBrowser()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setMsg('Devi essere loggato.'); setLoading(false); return }

      // Se i rapporti non sono “auto-detected”, facciamo due query:
      // 1) prendo le applications dell’utente
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !apps) { setLoading(false); return }

      // 2) per ognuna prendo l’opportunity associata
      const oppIds = Array.from(new Set(apps.map(a => a.opportunity_id)))
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, title, club_name, city, role')
        .in('id', oppIds)

      const byId = Object.fromEntries((opps ?? []).map(o => [o.id, o]))
      const merged = apps.map(a => ({ ...a, opportunity: byId[a.opportunity_id as keyof typeof byId] }))
      setList(merged as any)
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:24}}>
      <h1>Le mie candidature</h1>
      {msg && <p>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && list.length === 0 && <p>Nessuna candidatura inviata.</p>}
      <ul style={{display:'grid',gap:12,marginTop:16}}>
        {list.map(a => (
          <li key={a.id} style={{border:'1px solid #e5e7eb',borderRadius:12,padding:16}}>
            <h2 style={{margin:0}}>{a.opportunity?.title ?? 'Annuncio'}</h2>
            <p style={{margin:'4px 0',fontSize:14,opacity:.8}}>
              {a.opportunity?.club_name} — {a.opportunity?.city} — Ruolo: {a.opportunity?.role}
            </p>
            <p style={{fontSize:13}}>Stato: {a.status}</p>
            <p style={{fontSize:12,opacity:.7}}>Inviata: {new Date(a.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}