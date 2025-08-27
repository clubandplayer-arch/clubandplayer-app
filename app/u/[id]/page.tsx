'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  id: string
  full_name: string | null
  sport: string | null
  role: string | null
  city: string | null
}

type ApplicationRow = {
  id: string
  created_at: string
  status: string
  opportunity_id: string
  opportunity?: {
    title: string
    club_name: string
    city: string
  }
}

export default function PublicAthleteProfile() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')

      const athleteId = params.id
      if (!athleteId) { router.replace('/'); return }

      // 1) profilo pubblico (le policy permettono SELECT a tutti)
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select('id, full_name, sport, role, city')
        .eq('id', athleteId)
        .limit(1)

      if (perr) { setMsg(`Errore profilo: ${perr.message}`); setLoading(false); return }
      if (!profs || profs.length === 0) { setMsg('Profilo non trovato.'); setLoading(false); return }

      const p = profs[0] as Profile
      setProfile(p)

      // 2) ultime candidature (facoltativo, massimo 5). NB: l’atleta può leggere le proprie candidature;
      // i club owner hanno policy per leggere/applicants; per una pagina puramente pubblica, potresti anche omettere questa sezione.
      // Se la SELECT risultasse vuota per RLS, non è un errore: mostriamo solo il profilo.
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, created_at, status, opportunity_id')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(5)

      const appsTyped = (appsData ?? []) as ApplicationRow[]

      if (appsTyped.length > 0) {
        const oppIds = Array.from(new Set(appsTyped.map(a => a.opportunity_id)))
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id, title, club_name, city')
          .in('id', oppIds)

        const byId = Object.fromEntries((opps ?? []).map(o => [o.id, o]))
        const merged = appsTyped.map(a => ({ ...a, opportunity: byId[a.opportunity_id as keyof typeof byId] }))
        setApps(merged)
      }

      setLoading(false)
    }
    load()
  }, [params.id, router, supabase])

  return (
    <main style={{maxWidth:760, margin:'0 auto', padding:24}}>
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <header style={{display:'flex', gap:16, alignItems:'center', marginBottom:16}}>
            <div style={{width:64, height:64, borderRadius:'50%', background:'#e5e7eb'}} />
            <div>
              <h1 style={{margin:0}}>{profile.full_name ?? 'Atleta'}</h1>
              <p style={{margin:'4px 0', opacity:.8}}>
                {profile.role ?? 'Ruolo n/d'} · {profile.sport ?? 'Sport n/d'} · {profile.city ?? 'Città n/d'}
              </p>
              <p style={{margin:0, fontSize:13, opacity:.7}}>ID: <code>{profile.id}</code></p>
            </div>
          </header>

          <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:12}}>
            <h2 style={{marginTop:0}}>Panoramica</h2>
            <ul style={{marginTop:8}}>
              <li><b>Sport:</b> {profile.sport ?? '—'}</li>
              <li><b>Ruolo:</b> {profile.role ?? '—'}</li>
              <li><b>Città:</b> {profile.city ?? '—'}</li>
            </ul>
          </section>

          <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:12}}>
            <h2 style={{marginTop:0}}>Ultime candidature</h2>
            {apps.length === 0 ? (
              <p>Nessuna candidatura visibile.</p>
            ) : (
              <ul style={{display:'grid', gap:12, marginTop:8}}>
                {apps.map(a => (
                  <li key={a.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
                    <div style={{fontWeight:600}}>{a.opportunity?.title ?? 'Annuncio'}</div>
                    <div style={{fontSize:14, opacity:.8}}>
                      {a.opportunity?.club_name ?? '—'} — {a.opportunity?.city ?? '—'}
                    </div>
                    <div style={{fontSize:12, opacity:.7}}>Stato: {a.status} · {new Date(a.created_at).toLocaleString()}</div>
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
