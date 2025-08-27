'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

const sportRoles: Record<string, string[]> = {
  calcio: ['portiere', 'difensore', 'centrocampista', 'attaccante'],
  futsal: ['portiere', 'difensore', 'pivot', 'laterale'],
  basket: ['playmaker', 'guardia', 'ala', 'centro'],
  volley: ['palleggiatore', 'schiacciatore', 'centrale', 'libero']
}

export default function PostPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [sport, setSport] = useState('')
  const [role, setRole] = useState('')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): string | null => {
    if (!title.trim()) return 'Inserisci un titolo.'
    if (!sport) return 'Seleziona uno sport.'
    if (!role) return 'Seleziona un ruolo.'
    if (!sportRoles[sport]?.includes(role))
      return `Ruolo non valido per ${sport}.`
    if (!region.trim()) return 'Inserisci la regione.'
    if (!province.trim()) return 'Inserisci la provincia.'
    if (!city.trim()) return 'Inserisci la città.'
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')

    const errorMsg = validate()
    if (errorMsg) {
      setMsg(errorMsg)
      return
    }

    setLoading(true)

    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) {
      setMsg('Devi accedere per creare un annuncio.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        owner_id: u.data.user.id,
        title,
        sport,
        role,
        region,
        province,
        city,
        description,
        club_name: u.data.user.user_metadata?.club_name ?? 'Club'
      })
      .select('id')

    if (error) {
      setMsg(`Errore salvataggio: ${error.message}`)
      setLoading(false)
      return
    }

    const oppId = data?.[0]?.id as string | undefined
    if (oppId) {
      try {
        await fetch('/api/notify-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportunityId: oppId })
        })
      } catch {
        // ignora errori notifica per l’MVP
      }
    }

    setLoading(false)
    setMsg('Annuncio creato con successo!')
    router.push('/opportunities')
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>Nuovo annuncio</h1>
      {msg && <p style={{ color: msg.includes('successo') ? 'green' : '#b91c1c' }}>{msg}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="Titolo"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <select value={sport} onChange={e => { setSport(e.target.value); setRole('') }} required>
          <option value="">Sport</option>
          {Object.keys(sportRoles).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          required
          disabled={!sport}
        >
          <option value="">Ruolo</option>
          {sport && sportRoles[sport].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          placeholder="Regione"
          value={region}
          onChange={e => setRegion(e.target.value)}
          required
        />
        <input
          placeholder="Provincia"
          value={province}
          onChange={e => setProvince(e.target.value)}
          required
        />
        <input
          placeholder="Città"
          value={city}
          onChange={e => setCity(e.target.value)}
          required
        />
        <textarea
          placeholder="Descrizione"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Salvataggio…' : 'Crea annuncio'}
        </button>
      </form>
    </main>
  )
}
