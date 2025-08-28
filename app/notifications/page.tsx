'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type NotificationRow = {
  id: string
  user_id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const supabase = supabaseBrowser()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setItems(data as NotificationRow[])
    setLoading(false)
  }, [supabase])

  // primo caricamento
  useEffect(() => {
    load()
  }, [load])

  // realtime su notifiche dell’utente
  useEffect(() => {
    let channel = supabase
      .channel('notifications_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          // ricarica quando arriva un cambio
          load()
        }
      )
      .subscribe()

    // ⚠️ cleanup SINCRONO (niente async/await)
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // no-op
      }
    }
  }, [supabase, load])

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    // aggiorna stato locale senza rifetch completo
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [supabase])

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Notifiche</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna notifica.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(n => (
            <li
              key={n.id}
              className={`rounded-lg border p-3 ${n.read ? 'bg-white' : 'bg-yellow-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{n.type}</div>
                  <div className="text-sm">{n.message}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                  >
                    Segna come letta
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
