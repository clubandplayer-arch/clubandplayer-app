'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useEffect, useMemo, useState } from 'react'   // 👈 aggiunto useMemo
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  id: string
  display_name: string | null
  full_name: string | null
  headline: string | null
  bio: string | null
  sport: string | null
  role: string | null
  country: string | null
  region: string | null
  province: string | null
  city: string | null
  avatar_url?: string | null
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

function buildTagline(p: Profile): string {
  const headline = (p.headline ?? '').trim()
  if (headline) return headline
  const role = p.role ?? 'Ruolo n/d'
  const sport = p.sport ?? 'Sport n/d'
  const city = p.city ?? 'Città n/d'
  return `${role} · ${sport} · ${city}`
}

function buildLocation(p: Profile): string | null {
  const parts = [p.city, p.province, p.region, p.country]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export default function PublicAthleteProfile() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])  // 👈 MEMOIZZA il client

  const [profile, setProfile] = useState<Profile | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    let cancelled = false  // 👈 flag di cancellazione

    const load = async () => {
      setLoading(true)
      setMsg('')

      const athleteId = params.id
      if (!athleteId) { router.replace('/'); return }

      // 1) profilo pubblico (le policy permettono SELECT a tutti)
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select(
          'id, display_name, full_name, headline, bio, sport, role, country, region, province, city, avatar_url'
        )
        .eq('id', athleteId)
        .limit(1)

      if (cancelled) return
      if (perr) { setMsg(`Errore profilo: ${perr.message}`); setLoading(false); return }
      if (!profs || profs.length === 0) { setMsg('Profilo non trovato.'); setLoading(false); return }

      const p = profs[0] as Profile
      setProfile(p)

      // 2) ultime candidature (facoltativo, massimo 5)
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, created_at, status, opportunity_id')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (cancelled) return

      const appsTyped = (appsData ?? []) as ApplicationRow[]

      if (appsTyped.length > 0) {
        const oppIds = Array.from(new Set(appsTyped.map(a => a.opportunity_id)))
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id, title, club_name, city')
          .in('id', oppIds)

        if (cancelled) return

        const byId = Object.fromEntries((opps ?? []).map(o => [o.id, o]))
        const merged = appsTyped.map(a => ({ ...a, opportunity: byId[a.opportunity_id as keyof typeof byId] }))
        setApps(merged)
      } else {
        setApps([])
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }  // 👈 cleanup
  }, [params.id, router, supabase])     // ok mantenere supabase: ora è stabile grazie a useMemo

  return (
    <main style={{maxWidth:760, margin:'0 auto', padding:24}}>
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <header style={{display:'flex', gap:16, alignItems:'center', marginBottom:16, justifyContent:'space-between', flexWrap:'wrap'}}>
            <div style={{display:'flex', gap:16, alignItems:'center'}}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? profile.full_name ?? 'Player'}
                  width={64}
                  height={64}
                  style={{borderRadius:'50%', objectFit:'cover'}}
                />
              ) : (
                <div style={{width:64, height:64, borderRadius:'50%', background:'#e5e7eb'}} />
              )}
              <div>
                <h1 style={{margin:0}}>{profile.display_name || profile.full_name || 'Player'}</h1>
                <p style={{margin:'4px 0', opacity:.8}}>{buildTagline(profile)}</p>
                {buildLocation(profile) && (
                  <p style={{margin:'4px 0', fontSize:13, opacity:.7}}>{buildLocation(profile)}</p>
                )}
                <p style={{margin:0, fontSize:13, opacity:.7}}>ID: <code>{profile.id}</code></p>
              </div>
            </div>

            {/* Azioni: Messaggia → */}
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <Link
                href={`/messages?to=${params.id}`}
                style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8}}
              >
                Messaggia →
              </Link>
            </div>
          </header>

          <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:12}}>
            <h2 style={{marginTop:0}}>Bio</h2>
            <p style={{marginTop:8, whiteSpace:'pre-wrap'}}>
              {profile.bio && profile.bio.trim().length > 0 ? profile.bio : 'Nessuna bio disponibile.'}
            </p>
          </section>

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
            <Link href="/opportunities">← Torna alle opportunità</Link>
          </div>
        </>
      )}
    </main>
  )
}
