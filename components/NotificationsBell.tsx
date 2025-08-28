'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type NotificationRow = {
  id: string
  read: boolean
}

export default function NotificationsBell() {
  const supabase = supabaseBrowser()
  const [unread, setUnread] = useState<number>(0)

  const loadUnread = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, read')
      .eq('read', false)
    setUnread((data as NotificationRow[] | null)?.length ?? 0)
  }, [supabase])

  useEffect(() => {
    loadUnread()
    // opzionale: realtime su tabella (richiede Realtime attivo su Supabase)
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => loadUnread()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadUnread])

  return (
    <Link href="/notifications" className="relative inline-flex items-center">
      <span className="material-icons">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs px-1.5 rounded-full">
          {unread}
        </span>
      )}
    </Link>
  )
}
