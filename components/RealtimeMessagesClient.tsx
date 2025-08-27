'use client'
import { useEffect, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Toaster from '@/components/Toaster'

type Row = {
  id: string
  sender_id: string
  receiver_id: string
  text: string
  created_at: string
}

export default function RealtimeMessagesClient() {
  const supabase = supabaseBrowser()
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    // prendi l'utente
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })

    const ch = supabase
      .channel('rt-global-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Row
          const me = userIdRef.current
          if (!me) return

          // Se arriva a me e non sono già su quella chat, mostra toast
          if (row.receiver_id === me) {
            const current = window.location.pathname
            const isOnThread =
              current.startsWith(`/messages/${row.sender_id}`) ||
              current.startsWith(`/messages/${row.receiver_id}`)
            if (!isOnThread) {
              const evt = new CustomEvent('app:toast', { detail: {
                id: `toast-${row.id}`,
                text: `Nuovo messaggio`,
                href: `/messages/${row.sender_id}`,
              }})
              window.dispatchEvent(evt)
            }

            // chiedi ai badge di aggiornarsi
            window.dispatchEvent(new Event('app:unread-updated'))
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [supabase])

  return <Toaster />
}
