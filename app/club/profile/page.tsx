'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Club = {
  id: string
  display_name: string
  city: string | null
  bio: string | null
  logo_url: string | null
}

export default function ClubProfilePage() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [club, setClub] = useState<Club | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setMsg('Devi essere loggato.'); setLoading(false); return }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('clubs')
        .select('id, display_name, city, bio, logo_url')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setMsg(`Errore caricamento: ${error.message}`)
        setLoading(false)
        return
      }

      if (data) {
        setClub(data as Club)
        setDisplayName(data.display_name ?? '')
        setCity(data.city ?? '')
        setBio(data.bio ?? '')
        setLogoUrl(data.logo_url ?? null)
      }
      setLoading(false)
    }
    void load()
  }, [supabase])

  const upsertClub = async () => {
    if (!userId) { setMsg('Devi essere loggato.'); return }
    setMsg('')

    if (!displayName.trim()) {
      setMsg('Inserisci il nome del club.')
      return
    }

    const payload = {
      id: userId,
      display_name: displayName.trim(),
      city: city.trim() || null,
      bio: bio.trim() || null,
      logo_url: logoUrl || null
    }

    // se esiste → update, altrimenti insert
    const { error } = await supabase
      .from('clubs')
      .upsert(payload, { onConflict: 'id' })

    if (error) { setMsg(`Errore salvataggio: ${error.message}`); return }
    setMsg('Profilo salvato ✅')
  }

  const onUploadLogo = async (file: File) => {
    if (!userId) return
    setUploading(true)
    setMsg('')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase
        .storage
        .from('club-logos')
        .upload(path, file, { upsert: true })
      if (upErr) { setMsg(`Errore upload: ${upErr.message}`); setUploading(false); return }

      const { data: pub } = supabase
        .storage
        .from('club-logos')
        .getPublicUrl(path)

      setLogoUrl(pub.publicUrl)
      setMsg('Logo caricato ✅ (ricorda di Salvare)')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main style={{maxWidth:820, margin:'0 auto', padding:24}}>
      <h1>Profilo Club</h1>
      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{color: msg.includes('Errore') ? '#b91c1c' : '#065f46'}}>{msg}</p>}

      {!loading && (
        <div style={{display:'grid', gap:12, border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Nome club *</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Es. ASD Carlentini"
              style={{width:'100%'}}
            />
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Città</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Es. Carlentini"
              style={{width:'100%'}}
            />
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Bio / Descrizione</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              placeholder="Breve presentazione del club, campionati, obiettivi, contatti…"
              style={{width:'100%'}}
            />
          </div>

          <div>
            <label style={{display:'block', fontSize:12, opacity:.7}}>Logo</label>
            <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
              <input
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) void onUploadLogo(f) }}
                disabled={uploading}
              />
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt="Logo club"
                  width={64}
                  height={64}
                  style={{borderRadius:8, objectFit:'cover'}}
                />
              )}
            </div>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button onClick={() => void upsertClub()} style={{padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>
              Salva profilo
            </button>
          </div>
        </div>
      )}

      <div style={{marginTop:16}}>
        <a href="/opportunities">← Torna alle opportunità</a>
      </div>
    </main>
  )
}
