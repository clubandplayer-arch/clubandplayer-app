'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useRouter } from 'next/navigation'

export default function PostOpportunity() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [clubName, setClubName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('calcio')
  const [role, setRole] = useState('attaccante')
  const [city, setCity] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setMsg('')
    setSaving(true)

    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if (uerr || !user) { setSaving(false); setMsg('Devi essere loggato.'); return }

    const { error } = await supabase
      .from('opportunities')
      .insert({
        owner_id: user.id,
        club_name: clubName,
        title,
        description,
        sport,
        role,
        city
      })

    setSaving(false)
    if (error) { setMsg(`Errore: ${error.message}`); return }
    router.replace('/opportunities')
  }

  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:24}}>
      <h1>Crea annuncio</h1>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      <div style={{display:'grid',gap:12,marginTop:12}}>
        <input placeholder="Nome società" value={clubName} onChange={e=>setClubName(e.target.value)} />
        <input placeholder="Titolo (es. Cerchiamo attaccante)" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea placeholder="Descrizione" value={description} onChange={e=>setDescription(e.target.value)} />
        <input placeholder="Sport (es. calcio)" value={sport} onChange={e=>setSport(e.target.value)} />
        <input placeholder="Ruolo (es. attaccante)" value={role} onChange={e=>setRole(e.target.value)} />
        <input placeholder="Città" value={city} onChange={e=>setCity(e.target.value)} />
        <button onClick={submit} disabled={saving}
          style={{padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer'}}>
          {saving ? 'Salvataggio…' : 'Pubblica annuncio'}
        </button>
      </div>
    </main>
  )
}
