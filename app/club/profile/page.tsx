'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  id: string
  full_name: string | null
  city: string | null
  account_type: string | null
}

type Opp = {
  id: string
  title: string
  city: string
  role: string
  created_at: string
}

export default function ClubProfilePage() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [city, setCity] = useState<string>('')

  const [opps, setOpps] = useState<Opp[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')

      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr) { setMsg(`Errore auth: ${uerr.message}`); setLoading(false); return }
      if (!user) { router.replace('/login'); return }

      // profilo
      const { data: profs, error: perr } = await supabase
        .from('profiles')
        .select('id, full_name, city, account_type')
        .eq('id', user.id)
        .limit(1)

      if (perr) { setMsg(`Errore profilo: ${perr.message}`); setLoading(false); return }
      const p = (profs?.[0] ?? null) as Profile | null
      if (!p) { setMsg('Profilo non trovato.'); setLoading(false); return }

      setProfile(p)
      setDisplayName(p.full_name ?? '')
      setCity(p.city ?? '')

      // annunci appartenenti al club (owner_id = mio id)
      const { data: oppData, error: oerr } = await supabase
        .from('opportunities')
        .select('id, title, city, role, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (oerr) { setMsg(`Errore annunci: ${oerr.message}`); setLoading(false); return }
      setOpps((oppData ?? []) as Opp[])
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const save = async () => {
    if (!profile) return
    setMsg('')
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: displayName.trim() || null,
        city: city.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) { setMsg(`Errore salvataggio: ${error.message}`); return }
    setMsg('Profilo aggiornato.')
    setProfile(prev => prev ? { ...prev, full_name: displayName || null, city: city || null } : prev)
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Profilo Club</h1>

      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{ color: msg.includes('Errore') ? '#b91c1c' : '#065f46' }}>{msg}</p>}

      {!loading && profile && (
        <>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Dettagli</h2>
            <p style={{ marginTop: 4, opacity: .8 }}>
              Account type: <b>{profile.account_type ?? '—'}</b> (per i club dovrebbe essere <code>club</code>)
            </p>

            <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Nome pubblico del club</span>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Es. ASD Carlentini"
                  style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Città</span>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Es. Carlentini"
                  style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
              </label>

              <div>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
                >
                  {saving ? 'Salvataggio…' : 'Salva profilo'}
                </button>
              </div>
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>I miei annunci</h2>
            <div style={{ marginBottom: 8 }}>
              <Link href="/club/post" style={{ textDecoration: 'underline' }}>+ Crea nuovo annuncio</Link>
            </div>
            {opps.length === 0 ? (
              <p>Non hai ancora pubblicato annunci.</p>
            ) : (
              <ul style={{ display: 'grid', gap: 12 }}>
                {opps.map(o => (
                  <li key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{o.title}</div>
                    <div style={{ fontSize: 14, opacity: .8 }}>
                      {o.city} — Ruolo: {o.role}
                    </div>
                    <div style={{ fontSize: 12, opacity: .7 }}>
                      Pubblicato: {new Date(o.created_at).toLocaleString()}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                      <Link href={`/club/post/edit/${o.id}`} style={{ textDecoration: 'underline' }}>Modifica</Link>
                      <Link href={`/c/${profile.id}`} style={{ textDecoration: 'underline' }}>Vedi pagina pubblica</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
