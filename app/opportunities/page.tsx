'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import ReportButton from '@/components/ReportButton'

type Opp = {
  id: string
  title: string
  club_name: string
  city: string
  role: string
  sport: string
  created_at: string
  owner_id: string
}

type FavoriteRow = { opportunity_id: string }

export default function OpportunitiesPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [list, setList] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  // favorites
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setMsg('')
    setLoading(true)

    // user & favorites
    const { data: ures } = await supabase.auth.getUser()
    const user = ures?.user ?? null
    if (user) {
      setUserId(user.id)
      const { data: favs } = await supabase
        .from('favorites')
        .select('opportunity_id')
      const ids = new Set((favs ?? []).map((f: FavoriteRow) => f.opportunity_id))
      setSaved(ids)
    } else {
      setUserId(null)
      setSaved(new Set())
    }

    // opportunities
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, club_name, city, role, sport, created_at, owner_id')
      .order('created_at', { ascending: false })

    if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
    setList((data ?? []) as Opp[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async (opportunityId: string) => {
    if (!userId) { alert('Devi essere loggato'); return }
    if (saved.has(opportunityId)) {
      const { error } = await supabase.from('favorites').delete().match({ athlete_id: userId, opportunity_id: opportunityId })
      if (!error) setSaved(prev => { const n = new Set(prev); n.delete(opportunityId); return n })
    } else {
      const { error } = await supabase.from('favorites').insert({ athlete_id: userId, opportunity_id: opportunityId })
      if (!error) setSaved(prev => new Set(prev).add(opportunityId))
    }
  }

  const applyOneClick = async (opportunityId: string) => {
    const { data: ures } = await supabase.auth.getUser()
    const user = ures?.user ?? null
    if (!user) { alert('Devi essere loggato'); return }

    // evita doppie candidature
    const { data: exists } = await supabase
      .from('applications')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('opportunity_id', opportunityId)
      .maybeSingle()

    if (exists) {
      alert('Hai già inviato la tua candidatura per questo annuncio.')
      return
    }

    const { error } = await supabase
      .from('applications')
      .insert({ athlete_id: user.id, opportunity_id: opportunityId, status: 'inviata' })

    if (error) {
      alert(`Errore candidatura: ${error.message}`)
      return
    }

    alert('Candidatura inviata!')
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Opportunità</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/favorites">Preferiti</Link>
        </div>
      </header>

      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}

      {!loading && !msg && (
        <>
          {list.length === 0 ? (
            <p>Nessun annuncio disponibile.</p>
          ) : (
            <ul style={{ display: 'grid', gap: 12, marginTop: 8 }}>
              {list.map(o => (
                <li key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ margin: '0 0 4px 0' }}>{o.title}</h2>
                      <p style={{ margin: '0 0 8px 0', fontSize: 14, opacity: .8 }}>
                        {o.club_name} — {o.city} — Ruolo: {o.role} — Sport: {o.sport}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, opacity: .7 }}>
                        Pubblicato: {new Date(o.created_at).toLocaleString()}{' '}
                        · Club:{' '}
                        <Link href={`/c/${o.owner_id}`}>profilo</Link>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => applyOneClick(o.id)}
                        style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
                      >
                        Candidati 1-click
                      </button>

                      <button
                        onClick={() => toggleFavorite(o.id)}
                        style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
                      >
                        {saved.has(o.id) ? '★ Salvato' : '☆ Salva'}
                      </button>

                      {/* nuovo bottone Segnala */}
                      <ReportButton targetType="opportunity" targetId={o.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
