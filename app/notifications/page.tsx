'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'

type Notification = {
  id: string
  type: string | null
  message: string | null
  read: boolean | null
  created_at: string | null
}

export default function NotificationsPage() {
  const supabase = supabaseBrowser()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) setItems((data as Notification[]) || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('notifications_page_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => load()
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [supabase, load])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    load()
  }

  const toggleRead = async (id: string, target: boolean) => {
    await supabase.from('notifications').update({ read: target }).eq('id', id)
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: target } : n)))
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifiche</h1>
        <button
          onClick={markAllRead}
          className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm"
        >
          Segna tutte come lette
        </button>
      </div>

      {loading ? (
        <p>Caricamento…</p>
      ) : items.length === 0 ? (
        <p>Nessuna notifica.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border rounded-lg">
          {items.map(n => (
            <li key={n.id} className="p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    {n.type ?? 'info'}
                  </span>
                  {!n.read && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 rounded">
                      nuovo
                    </span>
                  )}
                </div>
                <p className="mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {n.created_at
                    ? new Date(n.created_at).toLocaleString()
                    : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => toggleRead(n.id, !n.read)}
                  className="text-sm underline"
                >
                  {n.read ? 'Segna come non letta' : 'Segna come letta'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <Link href="/" className="underline text-sm">
          Torna alla Home
        </Link>
      </div>
    </main>
  )
}
