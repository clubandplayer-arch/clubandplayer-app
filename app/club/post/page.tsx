'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseBrowser'

type Club = {
  id: string
  name: string | null
  logo_url: string | null
  bio: string | null
  owner_id: string
}

export default function ClubCreateOpportunityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [club, setClub] = useState<Club | null>(null)

  // campi form
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
      setMe({ id: user.id })

      // carica il club dell’owner (utente loggato)
      const { data: myClub, error } = await supabase
        .from('clubs')
        .select('id,name,logo_url,bio,owner_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (error) {
        console.error(error)
        alert('Errore nel caricare il tuo club')
        router.push('/')
        return
      }
      if (!myClub) {
        alert('Non hai ancora creato il profilo club.')
        router.push('/club/profile')
        return
      }
      setClub(myClub)
      setLoading(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me || !club) {
      alert('Profilo non pronto')
      return
    }
    if (!title.trim()) {
      alert('Titolo obbligatorio')
      return
    }
    setLoading(true)

    const payload: Record<string, any> = {
      title: title.trim(),
      location: location.trim() || null,
      contract_type: contractType || null,
      description: description.trim() || null,
      club_id: club.id,          // <- SYNC AUTOMATICA CON IL CLUB
      created_by: me.id          // se la colonna esiste nel tuo schema
    }

    const { error } = await supabase.from('opportunities').insert(payload)
    setLoading(false)

    if (error) {
      console.error(error)
      alert('Errore nel salvataggio annuncio')
      return
    }
    router.push('/opportunities')
  }

  if (loading) return <div className="p-6">Caricamento…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Pubblica opportunità</h1>

      <div className="text-sm text-gray-600">
        Pubblicherai come: <span className="font-medium">{club?.name ?? 'Il tuo club'}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Titolo *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es. Attaccante 2007"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Località</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Es. Milano"
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
            placeholder="Dettagli sull’opportunità…"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            Pubblica
          </button>
        </div>
      </form>
    </div>
  )
}
