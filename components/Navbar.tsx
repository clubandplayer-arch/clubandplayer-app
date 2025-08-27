'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function Navbar() {
  const supabase = supabaseBrowser()
  const [me, setMe] = useState<string | null>(null)
  const [unreadTotal, setUnreadTotal] = useState<number>(0)

  const computeUnread = useCallback(async () => {
    const u = await supabase.auth.getUser()
    const myId = u.data.user?.id
    setMe(myId ?? null)
    if (!myId) { setUnreadTotal(0); return }

    // prendi last_read per peer
    const { data: reads } = await supabase
      .from('message_reads')
      .select('peer_id, last_read_at')
      .eq('user_id', myId)

    const lastByPeer = new Map<string, number>()
    for (const r of (reads ?? []) as {peer_id: string, last_read_at: string}[]) {
      lastByPeer.set(r.peer_id, new Date(r.last_read_at).getTime())
    }

    // conta tutti i messaggi ricevuti dopo last_read
    const { data: msgs } = await supabase
      .from('messages')
      .select('receiver_id, sender_id, created_at')
      .eq('receiver_id', myId)
      .order('created_at', { ascending: false })
      .limit(500)

    let total = 0
    for (const m of (msgs ?? []) as {receiver_id: string, sender_id: string, created_at: string}[]) {
      const t = new Date(m.created_at).getTime()
      const last = lastByPeer.get(m.sender_id) ?? 0
      if (t > last) total += 1
    }
    setUnreadTotal(total)
  }, [supabase])

  useEffect(() => { void computeUnread() }, [computeUnread])

  // aggiorna i badge: quando arriva un nuovo messaggio o quando il thread segna "letto"
  useEffect(() => {
    const onUpd = () => { void computeUnread() }
    window.addEventListener('app:unread-updated', onUpd)
    return () => window.removeEventListener('app:unread-updated', onUpd)
  }, [computeUnread])

  // anche realtime diretto sugli insert
  useEffect(() => {
    const ch = supabase
      .channel('nav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as { receiver_id: string }
        if (me && row.receiver_id === me) {
          void computeUnread()
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [supabase, me, computeUnread])

  return (
    <nav style={{display:'flex', gap:16, alignItems:'center', padding:'10px 16px', borderBottom:'1px solid #e5e7eb'}}>
      <Link href="/" style={{fontWeight:700}}>Club&Player</Link>
      <Link href="/opportunities">Opportunità</Link>
      <Link href="/messages" style={{marginLeft:'auto'}}>
        Messaggi{unreadTotal > 0 ? ` (${unreadTotal})` : ''}
      </Link>
    </nav>
  )
}
