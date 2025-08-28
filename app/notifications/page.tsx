'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const supabase = supabaseBrowser()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data: { user }, error: uErr } = await supabase.auth.getUser()
      if (uErr) throw uErr
      if (!user) {
        setItems([])
        setLoading(false)
        return
      }
      const { data, error: selErr } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (selErr) throw selErr
      setItems((data ?? []) as Notification[])
    } catch (e: any) {
      setError(e?.message || 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [load, supabase])

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      load()
    } catch {
      // noop
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifiche</h1>
        <button
          onClick={markAllRead}
          className="rounded-md border px-3 py-2 hover:bg-gray-50"
        >
          Segna tutte come lette
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p>Caricamento…</p>
      ) : items.length === 0 ? (
        <p>Nessuna notifica.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(n => (
            <li
              key={n.id}
              className={`rounded border p-3 ${n.read ? 'bg-white' : 'bg-yellow-50'}`}
            >
              <div className="text-sm text-gray-500">
                {new Date(n.created_at).toLocaleString()}
              </div>
              <div className="font-medium">{n.type}</div>
              <div>{n.message}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
