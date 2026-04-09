'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useEffect, useMemo, useState } from 'react'   // 👈 aggiunto useMemo
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import ProfileHeader from '@/components/profiles/ProfileHeader'
import { buildPlayerDisplayName } from '@/lib/displayName'
import { ProfileLinks } from '@/types/profile'
import { getCountryName } from '@/lib/geo/countries'
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations'
import { useProvinceAbbreviations } from '@/hooks/useProvinceAbbreviations'

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
  birth_date?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  foot?: string | null
  interest_country?: string | null
  interest_region?: string | null
  interest_province?: string | null
  interest_city?: string | null
  links?: ProfileLinks
  account_type?: string | null
  type?: string | null
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

function buildLocation(p: Profile, provinceAbbreviations: Record<string, string>): string | null {
  const countryCode = p.interest_country ?? p.country
  const countryLabel = getCountryName(countryCode) ?? (countryCode ?? '')
  const parts = [
    p.interest_city ?? p.city,
    provinceDisplayValue(p.interest_province ?? p.province, provinceAbbreviations),
    p.interest_region ?? p.region,
    countryLabel,
  ]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function getAgeLabel(birthDate?: string | null): string {
  const raw = (birthDate ?? '').trim()
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  let age = now.getUTCFullYear() - date.getUTCFullYear()
  const hasBirthdayPassed =
    now.getUTCMonth() > date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() >= date.getUTCDate())
  if (!hasBirthdayPassed) age -= 1
  return age >= 0 ? `${age}` : '—'
}

export default function PublicAthleteProfile() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])  // 👈 MEMOIZZA il client

  const [profile, setProfile] = useState<Profile | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')
  const [meId, setMeId] = useState<string | null>(null)
  const provinceAbbreviations = useProvinceAbbreviations()

  useEffect(() => {
    let cancelled = false  // 👈 flag di cancellazione

    const load = async () => {
      setLoading(true)
      setMsg('')

      const athleteId = params.id
      if (!athleteId) { router.replace('/'); return }

      const auth = await supabase.auth.getUser()
      setMeId(auth?.data?.user?.id ?? null)

      // 1) profilo pubblico via lookup server-side condiviso (allineato al club public profile)
      const publicProfileRes = await fetch(`/api/profiles/public?ids=${encodeURIComponent(athleteId)}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const publicProfileJson = await publicProfileRes.json().catch(() => ({ data: [] }))
      const profs = Array.isArray(publicProfileJson?.data) ? publicProfileJson.data : []

      if (cancelled) return
      if (!publicProfileRes.ok) {
        setMsg(publicProfileJson?.error || 'Errore profilo')
        setLoading(false)
        return
      }
      if (profs.length === 0) { setMsg('Profilo non trovato.'); setLoading(false); return }

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
    <main className="mx-auto max-w-4xl px-6 py-6">
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <ProfileHeader
            profileId={profile.id}
            displayName={buildPlayerDisplayName(profile.full_name, profile.display_name)}
            accountType="athlete"
            avatarUrl={profile.avatar_url}
            subtitle={buildTagline(profile)}
            locationLabel={buildLocation(profile, provinceAbbreviations)}
            socialLinks={profile.links}
            showMessageButton
            showFollowButton={!(meId && (meId === profile.id || meId === profile.user_id))}
            messageLabel="Messaggia"
          />

          <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Bio</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {profile.bio && profile.bio.trim().length > 0 ? profile.bio : 'Nessuna bio disponibile.'}
            </p>
          </section>

          <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Dati player</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-neutral-800 sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Età</dt>
                <dd className="font-semibold text-neutral-900">{getAgeLabel(profile.birth_date)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Altezza</dt>
                <dd className="font-semibold text-neutral-900">{profile.height_cm ? `${profile.height_cm} cm` : '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Peso</dt>
                <dd className="font-semibold text-neutral-900">{profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Piede</dt>
                <dd className="font-semibold text-neutral-900">{profile.foot ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Sport</dt>
                <dd className="font-semibold text-neutral-900">{profile.sport ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Ruolo</dt>
                <dd className="font-semibold text-neutral-900">{profile.role ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Zona di interesse</dt>
                <dd className="font-semibold text-neutral-900">
                  {buildLocation(profile, provinceAbbreviations) ?? '—'}
                </dd>
              </div>
            </dl>
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
