'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function Onboarding() {
  const supabase = supabaseBrowser()
  const [sport, setSport] = useState('')
  const [role, setRole] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) setMessage(`Errore getUser: ${error.message}`)
      setUserId(data?.user?.id ?? null)
    }
    load()
  }, [supabase])

  const save = async () => {
    setMessage('')
    setSaving(true)

    const { data: udata, error: uerr } = await supabase.auth.getUser()
    if (uerr || !udata.user) {
      setSaving(false)
      setMessage(`Non sei loggato: ${uerr?.message ?? 'user null'}`)
      return
    }

    const payload = { id: udata.user.id, sport, role, city }

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })

    setSaving(false)

    if (upsertErr) {
      setMessage(`Errore salvataggio: ${upsertErr.message}`)
      return
    }

    setMessage('Profilo salvato! Ti porto alle opportunità…')
    window.location.href = '/opportunities'
  }

  return (
    <main style={{maxWidth:520,margin:'0 auto',padding:24}}>
      <h1>Onboarding</h1>
      <p>Inserisci i dati base per personalizzare le opportunità.</p>

      <div style={{background:'#f8fafc',border:'1px solid #e5e7eb',borderRadius:8,padding:12,margin:'12px 0'}}>
        <div style={{fontSize:12,opacity:.8}}>
          User ID: <code>{userId ?? 'n/d'}</code>
        </div>
        {message && <div style={{marginTop:8,fontSize:13,color:'#b91c1c'}}>{message}</div>}
      </div>

      <div style={{display:'grid',gap:12,marginTop:12}}>
        <input placeholder="Sport (es. calcio)" value={sport} onChange={e=>setSport(e.target.value)} />
        <input placeholder="Ruolo (es. attaccante)" value={role} onChange={e=>setRole(e.target.value)} />
        <input placeholder="Città (es. Carlentini)" value={city} onChange={e=>setCity(e.target.value)} />
        <button onClick={save} disabled={saving}
          style={{padding:'10px 14px',borderRadius:8,border:'1px solid #e5e7eb',cursor:'pointer'}}>
          {saving ? 'Salvataggio…' : 'Conferma'}
        </button>
      </div>
    </main>
  )
}