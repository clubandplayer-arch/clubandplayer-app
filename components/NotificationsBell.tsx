'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsBell() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [latest, setLatest] = useState<Notification[]>([])

  // carica conteggio + ultimi elementi
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUnread(0)
      setLatest([])
      return
    }

    // conteggio non lette (head + count)
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setUnread(count ?? 0)

    // ultimi 5 per dropdown
    const { data } = await supabase
      .from('notifications')
      .select('id, type, message, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setLatest(data ?? [])
  }

  useEffect(() => {
    load()
    // realtime su insert/update della tabella notifications
    const channel = supabase
      .channel('notif_bell_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
      >
        🔔
        {unread > 0 && (
          <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-[320px] rounded-lg border bg-white shadow-lg"
        >
          <div className="max-h-80 overflow-auto p-2">
            {latest.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                Nessuna notifica recente.
              </div>
            ) : (
              latest.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md p-3 text-sm hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{n.type}</div>
                      <div className="text-gray-700">{n.message}</div>
                    </div>
                    {!n.read && (
                      <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t p-2">
            <Link
              href="/notifications"
              className="block w-full rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
            >
              Apri tutte le notifiche
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
