'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import FollowButton from '@/components/clubs/FollowButton'
import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed'

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

export default function AthletePublicProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [meId, setMeId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')

      // id dell'URL
      const athleteId = params.id
      if (!athleteId) { router.replace('/'); return }

      // prendo anche il mio id, per capire se sto guardando me stesso
      const { data: userRes } = await supabase.auth.getUser()
      setMeId(userRes?.user?.id ?? null)

      // 1) profilo pubblico
      const profileRes = await fetch(
        `/api/profiles/public?ids=${encodeURIComponent(athleteId)}`,
        { cache: 'no-store' }
      )
      let fetchedProfile: Profile | null = null

      if (profileRes.ok) {
        const json = await profileRes.json().catch(() => ({}))
        const first = Array.isArray(json?.data) ? json.data[0] : null
        fetchedProfile = (first ?? null) as Profile | null
      }

      // Fallback: prova l'endpoint autenticato che usa il client admin se necessario
      if (!fetchedProfile) {
        const res = await fetch(`/api/profiles/${athleteId}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json().catch(() => ({}))
          fetchedProfile = (json?.data ?? null) as Profile | null
        }
      }

      if (!fetchedProfile) {
        const txt = profileRes.ok
          ? ''
          : await profileRes.text().catch(() => '')
        setMsg(txt ? `Profilo non trovato: ${txt}` : 'Profilo non trovato.')
        setLoading(false)
        return
      }

      setProfile(fetchedProfile)

      // 2) (facoltativo) ultime candidature visibili solo all’atleta stesso
      if (userRes?.user?.id === athleteId) {
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
          const merged = appsTyped.map(a => ({
            ...a,
            opportunity: byId[a.opportunity_id as keyof typeof byId]
          }))
          setApps(merged)
        } else {
          setApps([])
        }
      } else {
        setApps([]) // per i visitatori non mostriamo candidature
      }

      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const isMe = useMemo(() => !!meId && !!profile && meId === profile.id, [meId, profile])

  const profileName = profile?.display_name || profile?.full_name || 'Player'
  const profileTagline = useMemo(() => {
    if (!profile) return ''
    const headline = (profile.headline ?? '').trim()
    if (headline) return headline
    const role = profile.role ?? 'Ruolo n/d'
    const sport = profile.sport ?? 'Sport n/d'
    const city = profile.city ?? 'Città n/d'
    return `${role} · ${sport} · ${city}`
  }, [profile])

  const profileLocation = useMemo(() => {
    if (!profile) return ''
    const parts = [profile.city, profile.province, profile.region, profile.country]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
    return parts.join(' · ')
  }, [profile])

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          <header className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profileName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover ring-1 ring-neutral-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-neutral-200 ring-1 ring-neutral-200" />
              )}
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h1 className="heading-h1 text-2xl md:text-3xl">{profileName}</h1>
                  <p className="text-sm text-neutral-600">{profileTagline}</p>
                  {profileLocation && (
                    <p className="text-xs text-neutral-500">{profileLocation}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span>ID: <code>{profile.id}</code></span>
                    <Link href={`/messages/${profile.id}`} className="font-semibold text-blue-700 underline-offset-4 hover:underline">
                      Messaggia →
                    </Link>
                    {isMe && (
                      <Link href="/settings" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
                        Modifica profilo →
                      </Link>
                    )}
                  </div>
                </div>
                {!isMe && (
                  <FollowButton
                    id={profile.id}
                    targetType="player"
                    name={profileName}
                    labelFollow="Segui"
                    labelFollowing="Seguo"
                    size="md"
                  />
                )}
              </div>
            </div>
          </header>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="heading-h2 text-xl">Bio</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {profile.bio && profile.bio.trim().length > 0 ? profile.bio : 'Nessuna bio disponibile.'}
            </p>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="heading-h2 text-xl">Panoramica</h2>
            <ul className="mt-3 space-y-1 text-sm text-neutral-800">
              <li><b>Sport:</b> {profile.sport ?? '—'}</li>
              <li><b>Ruolo:</b> {profile.role ?? '—'}</li>
              <li><b>Città:</b> {profileLocation || '—'}</li>
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="heading-h2 text-xl">Bacheca</h2>
              <span className="text-xs font-semibold text-blue-700">Aggiornamenti del player</span>
            </div>
            <PublicAuthorFeed authorId={profile.id} />
          </section>

          {isMe && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="heading-h2 text-xl">Le mie ultime candidature</h2>
              {apps.length === 0 ? (
                <p className="text-sm text-neutral-700">Nessuna candidatura recente.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {apps.map(a => (
                    <li key={a.id} className="rounded-xl border border-neutral-200 p-3">
                      <div className="font-semibold">{a.opportunity?.title ?? 'Annuncio'}</div>
                      <div className="text-sm text-neutral-600">
                        {a.opportunity?.club_name ?? '—'} — {a.opportunity?.city ?? '—'}
                      </div>
                      <div className="text-[12px] text-neutral-500">
                        Stato: {a.status} · {new Date(a.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/opportunities" className="text-blue-700 underline-offset-4 hover:underline">← Torna alle opportunità</Link>
            <Link href="/favorites" className="text-blue-700 underline-offset-4 hover:underline">I miei preferiti</Link>
          </div>
        </>
      )}
    </main>
  )
}
