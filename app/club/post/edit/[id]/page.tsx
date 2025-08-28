'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opportunity = {
  id: string
  title: string | null
  location: string | null
  contract_type: 'full-time' | 'part-time' | 'trial' | null
  description: string | null
  club_id: string | null
}

export default function EditOpportunityPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [opp, setOpp] = useState<Opportunity | null>(null)

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [contractType, setContractType] = useState<'full-time' | 'part-time' | 'trial' | ''>('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Devi essere loggato come club')
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('opportunities')
        .select('id,title,location,contract_type,description,club_id')
        .eq('id', params.id)
        .maybeSingle()

      if (error || !data) {
        console.error(error)
        alert('Annuncio non trovato')
        router.push('/opportunities')
        return
      }

      // Associa al mio club se manca
      const { data: myClub } = await supabase
        .from('clubs')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!data.club_id && myClub?.id) {
        await supabase.from('opportunities').update({ club_id: myClub.id }).eq('id', data.id)
        data.club_id = myClub.id
      }

      setOpp(data)
      setTitle(data.title ?? '')
      setLocation(data.location ?? '')
      setContractType((data.contract_type as any) ?? '')
      setDescription(data.description ?? '')
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opp) return

    const { data: { user } } = await supabase.auth.getUser()
    let myClubId: string | null = null
    if (user) {
      const { data: myClub } = await supabase
        .from('clubs')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
      myClubId = myClub?.id ?? null
    }

    const payload: Record<string, any> = {
      title: title.trim() || null,
      location: location.trim() || null,
      contract_type: contractType || null,
      description: description.trim() || null,
      ...(myClubId ? { club_id: myClubId } : {})
    }

    const { error } = await supabase.from('opportunities').update(payload).eq('id', opp.id)
    if (error) {
      console.error(error)
      alert('Errore nel salvataggio')
      return
    }
    router.push('/opportunities')
  }

  if (loading) return <div className="p-6">Caricamento…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Modifica opportunità</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Titolo</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Località</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Tipo contratto</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={contractType}
            onChange={(e) => setContractType(e.target.value as any)}
          >
            <option value="">—</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="trial">Prova</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Descrizione</label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white"
          >
            Salva
          </button>
        </div>
      </form>
    </div>
  )
}

