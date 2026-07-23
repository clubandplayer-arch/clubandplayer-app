'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { isFanVoteSummaryRead } from '@/lib/notifications/fanVoteSummaryClient'

export default function NotificationsBell() {
  const supabase = supabaseBrowser()
  const [unread, setUnread] = useState<number>(0)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUnread(0)
      return
    }

    const res = await fetch('/api/notifications/unread-count', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return
    const json = await res.json().catch(() => null)
    setUnread((Number(json?.count) || 0) + (json?.fanVoteSummary && !isFanVoteSummaryRead(json.fanVoteSummary) ? 1 : 0))
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications_bell_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => load()
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [load, supabase])

  return (
    <Link href="/notifications" className="relative inline-flex items-center">
      <span aria-hidden>🔔</span>
      {unread > 0 && (
        <span className="ml-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">
          {unread}
        </span>
      )}
    </Link>
  )
}
