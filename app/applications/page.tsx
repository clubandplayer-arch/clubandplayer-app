'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type OpportunitySummary = {
  id: string
  title: string
  club_name: string
  city: string
  role: string
}

type ApplicationBase = {
  id: string
  status: string
  created_at: string
  opportunity_id: string
}

type ApplicationRow = ApplicationBase & {
  opportunity?: OpportunitySummary
}

export default function MyApplications() {
  const [list, setList] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const supabase = supabaseBrowser()

  useEffect(() => {
    const load = async () => {
      // Utente loggato?
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setMsg('Devi essere loggato.')
        setLoading(false)
        return
      }

      // 1) Prendo le candidature dell'utente (RLS limita già alle sue)
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('id, status, created_at, opportunity_id')
        .order('created_at', { ascending: false })

      if (appsErr) {
        setMsg(`Errore nel caricare le candidature: ${appsErr.message}`)
        setLoading(false)
        return
      }

      const appsTyped = (apps ?? []) as ApplicationBase[]

      if (appsTyped.length === 0) {
        setList([])
        setLoading(false)
        return
      }

      // 2) Prendo le opportunità associate
      const oppIds = Array.from(new Set(appsTyped.map(a => a.opportunity_id)))
      const { data: opps, error: oppsErr } = await supabase
        .from('opportunities')
        .select('id, title, club_name, city, role')
        .in('id', oppIds)

      if (oppsErr) {
        setMsg(`Errore nel caricare gli annunci: ${oppsErr.message}`)
        setLoading(false)
        return
      }

      const oppsTyped = (opps ?? []) as OpportunitySummary[]
      const byId: Record<string, OpportunitySummary> =
        Object.fromEntries(oppsTyped.map(o => [o.id, o]))

      const merged: ApplicationRow[] = appsTyped.map(a => ({
        ...a,
        opportunity: byId[a.opportunity_id]
      }))

      setList(merged)
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
              {a.opportunity?.club_name ?? '—'} — {a.opportunity?.city ?? '—'} — Ruolo: {a.opportunity?.role ?? '—'}
            </p>
            <p style={{fontSize:13}}>Stato: {a.status}</p>
            <p style={{fontSize:12,opacity:.7}}>Inviata: {new Date(a.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
