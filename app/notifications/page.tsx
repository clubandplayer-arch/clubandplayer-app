'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [items, setItems] = useState<Notification[]>([])
  const [onlyUnread, setOnlyUnread] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setItems([])
      return
    }

    let query = supabase
      .from('notifications')
      .select('id, type, message, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (onlyUnread) {
      query = query.eq('read', false)
    }

    const { data } = await query
    setItems(data ?? [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, onlyUnread])

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    load()
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Notifiche</h1>

      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
          />
          Mostra solo non lette
        </label>

        <button
          onClick={markAllAsRead}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800"
        >
          Segna tutte come lette
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border p-4 text-gray-600">
          Nessuna notifica.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{n.type}</div>
                  <div className="text-sm text-gray-800">{n.message}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read && (
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
