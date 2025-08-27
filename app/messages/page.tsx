'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Row = {
  id: string
  sender_id: string
  receiver_id: string
  text: string
  created_at: string
}

type Conversation = {
  peerId: string
  lastText: string
  lastAt: string
  lastFromMe: boolean
}

export default function MessagesHome() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true); setMsg('')
    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) { setMsg('Devi accedere per vedere i messaggi.'); setLoading(false); return }
    setUserId(u.data.user.id)

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, text, created_at')
      .or(`sender_id.eq.${u.data.user.id},receiver_id.eq.${u.data.user.id}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as Row[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const conversations = useMemo<Conversation[]>(() => {
    if (!userId) return []
    const map = new Map<string, Conversation>()
    for (const r of rows) {
      const peer = r.sender_id === userId ? r.receiver_id : r.sender_id
      if (!map.has(peer)) {
        map.set(peer, {
          peerId: peer,
          lastText: r.text,
          lastAt: r.created_at,
          lastFromMe: r.sender_id === userId
        })
      }
    }
    return Array.from(map.values())
  }, [rows, userId])

  return (
    <main style={{maxWidth:860, margin:'0 auto', padding:24}}>
      <h1>Messaggi</h1>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && conversations.length === 0 && <p>Nessuna conversazione. Apri un profilo e clicca “Messaggia →”.</p>}

      <ul style={{display:'grid', gap:12}}>
        {conversations.map(c => (
          <li key={c.peerId} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
              <div>
                <div style={{fontWeight:600}}>Utente: <code>{c.peerId}</code></div>
                <div style={{opacity:.8, fontSize:14}}>
                  {c.lastFromMe ? 'Tu: ' : ''}{c.lastText}
                </div>
                <div style={{opacity:.7, fontSize:12}}>
                  {new Date(c.lastAt).toLocaleString()}
                </div>
              </div>
              <div style={{alignSelf:'center'}}>
                <Link href={`/messages/${c.peerId}`}>Apri chat →</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
