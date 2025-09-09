'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'

type Report = {
  id: string
  created_at: string
  status: 'open' | 'closed'
  type: 'opportunity' | 'user'
  reason: string | null
  notes: string | null
  opportunity_id: string | null
  reported_user_id: string | null
  reporter_id: string | null
}

type Profile = { id: string; is_admin: boolean }

const PAGE_SIZE = 20

export default function AdminReportsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [me, setMe] = useState<Profile | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)

  // Filters
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all')
  const [rtype, setRtype] = useState<'all' | 'opportunity' | 'user'>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // Data
  const [rows, setRows] = useState<Report[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Guard: only admins
  useEffect(() => {
    let active = true
    const loadMe = async () => {
      setLoadingMe(true)
      const { data: ures } = await supabase.auth.getUser()
      const user = ures?.user
      if (!active) return
      if (!user) {
        setMe(null)
        setLoadingMe(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!active) return
      setMe((data as Profile) ?? null)
      setLoadingMe(false)
    }
    loadMe()
    return () => {
      active = false
    }
  }, [supabase])

  const load = async () => {
    setLoading(true)

    let query = supabase
      .from('reports')
      .select(
        'id, created_at, status, type, reason, notes, opportunity_id, reported_user_id, reporter_id',
        { count: 'exact' }
      )

    if (status !== 'all') query = query.eq('status', status)
    if (rtype !== 'all') query = query.eq('type', rtype)

    // Ricerca testuale semplice su reason e notes
    if (q.trim()) {
      const pattern = `%${q.trim()}%`
      const [r1, r2] = await Promise.all([
        query.ilike('reason', pattern).order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
        query.ilike('notes', pattern).order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
      ])

      const data1 = (r1.data ?? []) as Report[]
      const data2 = (r2.data ?? []) as Report[]
      const map = new Map<string, Report>()
      data1.forEach(r => map.set(r.id, r))
      data2.forEach(r => map.set(r.id, r))
      setRows(Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)))
      const count = Math.max(r1.count ?? 0, r2.count ?? 0)
      setTotal(count)
      setLoading(false)
      return
    }

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setRows((data ?? []) as Report[])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    setPage(1)
  }, [status, rtype, q])

  useEffect(() => {
    if (!loadingMe && me?.is_admin) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMe, me?.is_admin, status, rtype, q, page])

  const toggleStatus = async (id: string, current: 'open' | 'closed') => {
    if (!confirm(`Sei sicuro di voler ${current === 'open' ? 'chiudere' : 'riaprire'} la segnalazione?`)) return
    setSavingId(id)
    const next = current === 'open' ? 'closed' : 'open'
    const { error } = await supabase.from('reports').update({ status: next }).eq('id', id)
    setSavingId(null)
    if (error) {
      alert('Errore durante il salvataggio')
      return
    }
    load()
  }

  if (loadingMe) {
    return <div className="max-w-6xl mx-auto p-4">Caricamento…</div>
  }
  if (!me) {
    return <div className="max-w-6xl mx-auto p-4 text-red-700">Devi essere loggato per accedere a questa pagina.</div>
  }
  if (!me.is_admin) {
    return <div className="max-w-6xl mx-auto p-4 text-red-700">Non sei autorizzato ad accedere a questa pagina.</div>
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Moderazione — Segnalazioni</h1>

      {/* FILTRI */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Stato</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'open' | 'closed')}
            className="border rounded-md px-2 py-1"
          >
            <option value="all">Tutti</option>
            <option value="open">Aperte</option>
            <option value="closed">Chiuse</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Tipo</label>
          <select
            value={rtype}
            onChange={(e) => setRtype(e.target.value as 'all' | 'opportunity' | 'user')}
            className="border rounded-md px-2 py-1"
          >
            <option value="all">Tutti</option>
            <option value="opportunity">Annuncio</option>
            <option value="user">Utente</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Cerca (motivo / note)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="es. spam, linguaggio offensivo…"
            className="border rounded-md px-3 py-1"
          />
        </div>
      </div>

      {/* LISTA */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2 w-36">Creato</th>
              <th className="text-left px-3 py-2 w-28">Stato</th>
              <th className="text-left px-3 py-2 w-32">Tipo</th>
              <th className="text-left px-3 py-2">Motivo</th>
              <th className="text-left px-3 py-2">Note</th>
              <th className="text-left px-3 py-2 w-40">Target</th>
              <th className="text-left px-3 py-2 w-28">Azione</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Nessuna segnalazione trovata.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Caricamento…
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === 'open'
                          ? 'inline-block rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5'
                          : 'inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5'
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.reason ?? '—'}</td>
                  <td className="px-3 py-2">{r.notes ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.type === 'opportunity' && r.opportunity_id ? (
                      <span className="text-gray-700">
                        Annuncio: <code className="text-xs">{r.opportunity_id}</code>
                      </span>
                    ) : r.type === 'user' && r.reported_user_id ? (
                      <Link className="text-blue-700 hover:underline" href={`/u/${r.reported_user_id}`}>
                        Vai al profilo
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      disabled={savingId === r.id}
                      onClick={() => toggleStatus(r.id, r.status)}
                      className="px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      {r.status === 'open' ? 'Chiudi' : 'Riapri'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* PAGINAZIONE */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Totale: <strong>{total}</strong> • Pagina {page} di {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50"
          >
            ←
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
