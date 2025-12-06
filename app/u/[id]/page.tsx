'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useEffect, useMemo, useState } from 'react'   // 👈 aggiunto useMemo
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import ProfileHeader from '@/components/profiles/ProfileHeader'
import { buildCountsMap, buildEndorsedSet, normalizeProfileSkills } from '@/lib/profiles/skills'
import { ProfileSkill } from '@/types/profile'

type Profile = {
  id: string
  user_id?: string | null
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
  skills?: ProfileSkill[] | null
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
  return `${role} · ${sport}`
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
  const [skills, setSkills] = useState<ProfileSkill[]>([])
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [meId, setMeId] = useState<string | null>(null)
  const [endorsingSkill, setEndorsingSkill] = useState<string | null>(null)

  const isOwner = useMemo(() => {
    if (!profile || !meId) return false
    return meId === profile.id || meId === profile.user_id
  }, [meId, profile])

  async function toggleEndorse(skill: ProfileSkill) {
    if (!profile) return
    if (!meId) { setMsg('Devi accedere per endorsare una competenza.'); return }
    if (isOwner) { setMsg('Non puoi endorsare il tuo profilo.'); return }

    const action = skill.endorsedByMe ? 'remove' : 'endorse'
    setEndorsingSkill(skill.name)

    try {
      const res = await fetch(`/api/profiles/${profile.id}/skills/endorse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: skill.name, action }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setMsg(json?.message || 'Errore durante l\'endorsement')
        return
      }

      const newCount = typeof json.endorsementsCount === 'number' ? json.endorsementsCount : undefined
      setSkills((prev) => prev.map((s) => {
        if (s.name !== skill.name) return s
        const delta = action === 'endorse' ? 1 : -1
        const fallback = Math.max(0, (s.endorsementsCount ?? 0) + delta)
        return {
          ...s,
          endorsedByMe: action === 'endorse',
          endorsementsCount: newCount ?? fallback,
        }
      }))
    } finally {
      setEndorsingSkill(null)
    }
  }

  useEffect(() => {
    let cancelled = false  // 👈 flag di cancellazione

    const load = async () => {
      setLoading(true)
      setMsg('')

      const athleteId = params.id
      if (!athleteId) { router.replace('/'); return }

      const auth = await supabase.auth.getUser()
      setMeId(auth?.data?.user?.id ?? null)

      // 1) profilo pubblico (le policy permettono SELECT a tutti)
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select(
          'id, user_id, display_name, full_name, headline, bio, sport, role, country, region, province, city, avatar_url, skills'
        )
        .eq('id', athleteId)
        .limit(1)

      if (cancelled) return
      if (perr) { setMsg(`Errore profilo: ${perr.message}`); setLoading(false); return }
      if (!profs || profs.length === 0) { setMsg('Profilo non trovato.'); setLoading(false); return }

      const p = profs[0] as Profile
      setProfile(p)

      const normalizedSkills = normalizeProfileSkills(Array.isArray((p as any)?.skills) ? (p as any).skills : [])

      const { data: countsRows } = await supabase
        .from('profile_skill_endorsements')
        .select('skill_name, endorsements_count:count(*)')
        .eq('profile_id', athleteId)
        .group('skill_name')

      if (cancelled) return

      const countsMap = buildCountsMap(countsRows ?? [])

      let endorsedSet = new Set<string>()
      if (auth?.data?.user?.id) {
        const { data: mine } = await supabase
          .from('profile_skill_endorsements')
          .select('skill_name')
          .eq('endorser_profile_id', auth.data.user.id)
          .eq('profile_id', athleteId)

        if (cancelled) return

        endorsedSet = buildEndorsedSet(mine ?? [])
      }

      const mergedSkills: ProfileSkill[] = normalizedSkills.map((skill) => ({
        ...skill,
        endorsementsCount: countsMap.get(skill.name.toLowerCase()) ?? 0,
        endorsedByMe: endorsedSet.has(skill.name.toLowerCase()),
      }))

      setSkills(mergedSkills)

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
          <ProfileHeader
            profileId={profile.id}
            displayName={profile.display_name || profile.full_name || 'Player'}
            accountType="athlete"
            avatarUrl={profile.avatar_url}
            subtitle={buildTagline(profile)}
            locationLabel={buildLocation(profile)}
            showMessageButton
            showFollowButton={!(meId && (meId === profile.id || meId === profile.user_id))}
            messageLabel="Messaggia"
          />

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

        {skills.length > 0 ? (
          <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:12}}>
            <h2 style={{marginTop:0}}>Competenze</h2>
            <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:8}}>
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  style={{
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    gap:12,
                    border:'1px solid #e5e7eb',
                    borderRadius:12,
                    padding:'8px 10px',
                    background:'#f8fafc',
                  }}
                >
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontWeight:600}}>{skill.name}</span>
                    <span style={{
                      display:'inline-flex',
                      alignItems:'center',
                      gap:4,
                      padding:'2px 8px',
                      borderRadius:9999,
                      background:'#e0f2fe',
                      color:'#0369a1',
                      fontSize:12,
                      fontWeight:600,
                    }}>
                      {skill.endorsementsCount}
                    </span>
                  </div>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => toggleEndorse(skill)}
                      disabled={endorsingSkill === skill.name || !meId}
                      style={{
                        border:'1px solid',
                        borderColor: skill.endorsedByMe ? '#0ea5e9' : '#cbd5e1',
                        background: skill.endorsedByMe ? '#0ea5e9' : '#fff',
                        color: skill.endorsedByMe ? '#fff' : '#0f172a',
                        borderRadius:9999,
                        padding:'6px 12px',
                        fontSize:13,
                        cursor: endorsingSkill === skill.name || !meId ? 'not-allowed' : 'pointer',
                        opacity: endorsingSkill === skill.name || (!meId && !skill.endorsedByMe) ? 0.7 : 1,
                      }}
                    >
                      {skill.endorsedByMe ? 'Rimuovi endorsement' : (meId ? 'Endorsa' : 'Accedi per endorsare')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          isOwner && (
              <section style={{border:'1px solid #e5e7eb', borderRadius:12, padding:16, marginTop:12}}>
                <h2 style={{marginTop:0}}>Competenze</h2>
                <p style={{marginTop:8, fontSize:14, color:'#475569'}}>
                  Aggiungi le tue competenze dal pannello "Modifica profilo" per mostrarle qui.
                </p>
              </section>
            )
          )}

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
