'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

const sportRoles: Record<string, string[]> = {
  calcio: ['portiere', 'difensore', 'centrocampista', 'attaccante'],
  futsal: ['portiere', 'difensore', 'pivot', 'laterale'],
  basket: ['playmaker', 'guardia', 'ala', 'centro'],
  volley: ['palleggiatore', 'schiacciatore', 'centrale', 'libero']
}

type Opp = {
  id: string
  title: string
  sport: string
  role: string
  region: string | null
  province: string | null
  city: string
  description: string | null
  status: 'aperto' | 'chiuso'
}

export default function EditPostPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [data, setData] = useState<Opp | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setMsg('')
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, sport, role, region, province, city, description, status')
        .eq('id', String(params.id))
        .limit(1)
      if (error) { setMsg(`Errore caricamento: ${error.message}`); return }
      if (!data || !data[0]) { setMsg('Annuncio non trovato'); return }
      setData(data[0] as Opp)
    }
    load()
  }, [supabase, params.id])

  const validate = (d: Opp): string | null => {
    if (!d.title.trim()) return 'Inserisci un titolo.'
    if (!d.sport) return 'Seleziona uno sport.'
    if (!d.role) return 'Seleziona un ruolo.'
    if (!sportRoles[d.sport]?.includes(d.role)) return `Ruolo non valido per ${d.sport}.`
    if (!d.region?.trim()) return 'Inserisci la regione.'
    if (!d.province?.trim()) return 'Inserisci la provincia.'
    if (!d.city.trim()) return 'Inserisci la città.'
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
    const errMsg = validate(data)
    if (errMsg) { setMsg(errMsg); return }

    setSaving(true); setMsg('')
    const { error } = await supabase
      .from('opportunities')
      .update({
        title: data.title,
        sport: data.sport,
        role: data.role,
        region: data.region,
        province: data.province,
        city: data.city,
        description: data.description,
        status: data.status
      })
      .eq('id', data.id)
    setSaving(false)
    if (error) { setMsg(`Errore salvataggio: ${error.message}`); return }
    router.push('/club/posts')
  }

  if (!data) {
    return <main style={{maxWidth:600, margin:'0 auto', padding:24}}><p>Caricamento… {msg && <span style={{color:'#b91c1c'}}>{msg}</span>}</p></main>
  }

  return (
    <main style={{maxWidth:600, margin:'0 auto', padding:24}}>
      <h1>Modifica annuncio</h1>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      <form onSubmit={submit} style={{display:'grid', gap:12}}>
        <input value={data.title} onChange={e=>setData({...data, title:e.target.value})} placeholder="Titolo" />
        <select value={data.sport} onChange={e=>setData({...data, sport:e.target.value, role:''})}>
          <option value="">Sport</option>
          {Object.keys(sportRoles).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={data.role} onChange={e=>setData({...data, role:e.target.value})} disabled={!data.sport}>
          <option value="">Ruolo</option>
          {data.sport && sportRoles[data.sport].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input value={data.region ?? ''} onChange={e=>setData({...data, region:e.target.value})} placeholder="Regione" />
        <input value={data.province ?? ''} onChange={e=>setData({...data, province:e.target.value})} placeholder="Provincia" />
        <input value={data.city} onChange={e=>setData({...data, city:e.target.value})} placeholder="Città" />
        <textarea value={data.description ?? ''} onChange={e=>setData({...data, description:e.target.value})} placeholder="Descrizione" />
        <select value={data.status} onChange={e=>setData({...data, status: e.target.value as 'aperto'|'chiuso'})}>
          <option value="aperto">Aperto</option>
          <option value="chiuso">Chiuso</option>
        </select>
        <div style={{display:'flex', gap:8}}>
          <button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
          <button type="button" onClick={()=>history.back()} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px'}}>Annulla</button>
        </div>
      </form>
    </main>
  )
}
