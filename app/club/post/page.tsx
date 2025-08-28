'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Club = {
  id: string
  name: string | null
  owner_id: string
}

type Opportunity = {
  id: string
  title: string | null
  location: string | null
  contract_type: string | null
  published?: boolean | null
  created_at?: string | null
  club_id: string
}

const PAGE_SIZE = 10

export default function ClubMyPostsPage() {
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [club, setClub] = useState<Club | null>(null)
  const [rows, setRows] = useState<Opportunity[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1) Trova il club dell’utente (owner_id = user.id)
      const { data: clubRow, error: clubErr } = await supabase
        .from('clubs')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (clubErr) {
        console.error(clubErr)
        alert('Errore nel caricamento del profilo club')
        setLoading(false)
        return
      }

      if (!clubRow) {
        // Non ha ancora creato il profilo club
        setClub(null)
        setRows([])
        setTotal(0)
        setLoading(false)
        return
      }
      setClub(clubRow as Club)

      // 2) Carica le opportunità del club, con count per paginazione
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact' })
        .eq('club_id', clubRow.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error(error)
        alert('Errore nel caricamento degli annunci')
        setLoading(false)
        return
      }

      setRows((data ?? []) as Opportunity[])
      setTotal(count ?? 0)
      setLoading(false)
    }

    load()
  }, [page, supabase, router])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare definitivamente questo annuncio?')) return
    setLoading(true)
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    setLoading(false)
    if (error) {
      console.error(error)
      alert('Errore nella cancellazione')
      return
    }
    // ricarica la pagina corrente
    setPage((p) => p) // trigger del useEffect
  }

  if (loading) {
    return <div className="p-6">Caricamento…</div>
  }

  if (!club) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Le mie opportunità</h1>
        <p className="text-sm text-gray-600">
          Non hai ancora creato il profilo club. Vai a{' '}
          <a className="underline" href="/club/profile">Profilo Club</a> per completare la configurazione.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Le mie opportunità</h1>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => router.push('/post')}
        >
          + Nuova opportunità
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="border rounded p-6 text-sm text-gray-600">
          Nessun annuncio pubblicato. Crea il tuo primo annuncio con “Nuova opportunità”.
        </div>
      ) : (
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Titolo</th>
                <th className="text-left px-4 py-3">Località</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Pubblicato</th>
                <th className="text-right px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{r.title || '—'}</td>
                  <td className="px-4 py-3">{r.location || '—'}</td>
                  <td className="px-4 py-3">{r.contract_type || '—'}</td>
                  <td className="px-4 py-3">{r.published ? 'Sì' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="px-3 py-1 rounded border"
                        onClick={() => router.push(`/club/post/edit/${r.id}`)}
                      >
                        Modifica
                      </button>
                      <button
                        className="px-3 py-1 rounded border border-red-500 text-red-600"
                        onClick={() => handleDelete(r.id)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginazione */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Totale: {total} • Pagina {page}/{totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Indietro
          </button>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Avanti →
          </button>
        </div>
      </div>
    </div>
  )
}
