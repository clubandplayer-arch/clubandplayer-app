'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Notification = {
  id: string
  user_id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const supabase = supabaseBrowser()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setItems(data as Notification[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // primo fetch
    void load()

    // subscribe realtime
    const channel = supabase
      .channel('notifications_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          // ricarica alla modifica
          void load()
        }
      )
      .subscribe()

    // cleanup
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // no-op
      }
    }
  }, [supabase, load])

  const markRead = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: value })
      .eq('id', id)

    if (!error) {
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: value } : n)))
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Notifiche</h1>

      {loading && <p>Caricamento…</p>}
      {!loading && items.length === 0 && <p>Nessuna notifica.</p>}

      <ul className="space-y-2">
        {items.map(n => (
          <li
            key={n.id}
            className="border rounded p-3 flex items-start justify-between gap-4"
          >
            <div>
              <div className="text-xs text-gray-500">
                {new Date(n.created_at).toLocaleString()}
              </div>
              <div className="text-sm font-medium">{n.type}</div>
              <div className="text-sm">{n.message}</div>
            </div>

            <button
              onClick={() => markRead(n.id, !n.read)}
              className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
            >
              {n.read ? 'Segna come non letta' : 'Segna come letta'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
