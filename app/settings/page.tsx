'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  id: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  account_type: 'athlete' | 'club' | null
}

export default function SettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')

      const { data: ures } = await supabase.auth.getUser()
      const uid = ures?.user?.id ?? null
      if (!uid) {
        router.replace('/login')
        return
      }
      setUserId(uid)

      // profilo
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url, account_type')
        .eq('id', uid)
        .maybeSingle()

      if (error) {
        setMsg(`Errore caricamento profilo: ${error.message}`)
        setLoading(false)
        return
      }

      const p = (data ?? {}) as Partial<Profile>
      setFullName(p.full_name ?? '')
      setBio(p.bio ?? '')
      setAvatarUrl(p.avatar_url ?? '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const onUploadAvatar = async (file: File) => {
    if (!userId) return
    setSaving(true)
    setMsg('')

    try {
      // path unico per evitare cache (timestamp)
      const path = `public/${userId}-${Date.now()}-${file.name}`

      // upload (bucket pubblico per MVP)
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (upErr) {
        setMsg(`Errore upload avatar: ${upErr.message}`)
        setSaving(false)
        return
      }

      // url pubblico
      const { data: pub } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const publicUrl = pub?.publicUrl ?? ''
      if (!publicUrl) {
        setMsg('Errore nel generare il link pubblico dell’avatar.')
        setSaving(false)
        return
      }

      // salva nel profilo
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updErr) {
        setMsg(`Errore aggiornamento profilo: ${updErr.message}`)
        setSaving(false)
        return
      }

      setAvatarUrl(publicUrl)
      setMsg('Avatar aggiornato.')
    } catch (e) {
      setMsg('Errore imprevisto durante l’upload.')
    } finally {
      setSaving(false)
    }
  }

  const onSave = async () => {
    if (!userId) return
    setSaving(true)
    setMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', userId)

    setSaving(false)
    if (error) {
      setMsg(`Errore salvataggio: ${error.message}`)
      return
    }
    setMsg('Profilo aggiornato correttamente.')
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
        <h1>Impostazioni</h1>
        <p>Caricamento…</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <h1>Impostazioni</h1>

      {msg && (
        <p style={{ marginTop: 8, color: msg.toLowerCase().includes('errore') ? '#b91c1c' : '#065f46' }}>
          {msg}
        </p>
      )}

      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#f3f4f6',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              flex: '0 0 auto',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </div>
          <div>
            <label
              htmlFor="avatarInput"
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Carico…' : (avatarUrl ? 'Cambia avatar' : 'Carica avatar')}
            </label>
            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadAvatar(f)
              }}
              disabled={saving}
            />
            {avatarUrl && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Dimensioni consigliate: quadrato ≥ 256px.
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Nome completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Es. Mario Rossi"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta qualcosa su di te (max 500 caratteri)…"
            rows={5}
            maxLength={500}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
            {bio.length}/500
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
          >
            {saving ? 'Salvo…' : 'Salva modifiche'}
          </button>
          <a href="/u/me" style={{ marginLeft: 'auto' }}>Vedi il mio profilo pubblico →</a>
        </div>
      </section>
    </main>
  )
}
