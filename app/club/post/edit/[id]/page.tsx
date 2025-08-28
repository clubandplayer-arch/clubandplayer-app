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
  club_id: string
}

export default function ClubEditOpportunityPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [opp, setOpp] = useState<Opportunity | null>(null)

  // form fields
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [contractType, setContractType] = useState<'full-time' | 'part-time' | 'trial' | ''>('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Devi essere loggato')
        router.push('/login')
        return
      }
      setMe({ id: user.id })

      // carica annuncio
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error(error)
        alert('Errore nel caricamento')
        router.push('/opportunities')
        return
      }
      if (!data) {
        alert('Annuncio non trovato')
        router.push('/opportunities')
        return
      }

      setOpp(data as Opportunity)
      setTitle(data.title ?? '')
      setLocation(data.location ?? '')
      setContractType((data.contract_type as any) ?? '')
      setDescription(data.description ?? '')
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opp) return
    setLoading(true)

    const updates = {
      title: title.trim() || null,
      location: location.trim() || null,
      contract_type: (contractType || null) as Opportunity['contract_type'],
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', opp.id)

    setLoading(false)

    if (error) {
      console.error(error)
      alert('Errore nel salvataggio')
      return
    }
    router.push('/opportunities')
  }

  const handleDelete = async () => {
    if (!opp) return
    if (!confirm('Eliminare definitivamente questo annuncio?')) return
    setLoading(true)
    const { error } = await supabase.from('opportunities').delete().eq('id', opp.id)
    setLoading(false)
    if (error) {
      console.error(error)
      alert('Errore nella cancellazione')
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
          <label className="block text-sm mb-1">Titolo *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
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

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            Salva
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 rounded border border-red-500 text-red-600 disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </form>
    </div>
  )
}
