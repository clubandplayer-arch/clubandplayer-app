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
  peerName: string | null
  lastText: string
  lastAt: string
  lastFromMe: boolean
}

export default function MessagesHome() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [peerNames, setPeerNames] = useState<Record<string, string | null>>({})
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
      .limit(200)

    if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as Row[])

    // carica i nomi dei peer (profili pubblici)
    const peers = Array.from(
      new Set((data ?? []).map((r) => r.sender_id === u.data.user!.id ? r.receiver_id : r.sender_id))
    )
    if (peers.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', peers)
      const names: Record<string, string | null> =
        Object.fromEntries((profs ?? []).map(p => [p.id as string, (p as {full_name: string|null}).full_name]))
      setPeerNames(names)
    }

    setLoading(false)
  }, [supabase])

  // primo load
  useEffect(() => { void load() }, [load])

  // Realtime: aggiorna lista quando arriva un nuovo messaggio
  useEffect(() => {
    const channel = supabase
      .channel('messages-list')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Row
          // se riguarda me, aggiornalo in testa
          if (userId && (row.sender_id === userId || row.receiver_id === userId)) {
            setRows(prev => [row, ...prev])
            // opzionale: carica nome peer se non presente
            const peer = row.sender_id === userId ? row.receiver_id : row.sender_id
            if (!peerNames[peer]) {
              supabase.from('profiles').select('id, full_name').eq('id', peer).limit(1).then(({data})=>{
                if (data && data.length > 0) {
                  setPeerNames(p => ({...p, [peer]: (data[0] as {full_name: string|null}).full_name}))
                }
              })
            }
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase, userId, peerNames])

  const conversations = useMemo<Conversation[]>(() => {
    if (!userId) return []
    const map = new Map<string, Conversation>()
    for (const r of rows) {
      const peer = r.sender_id === userId ? r.receiver_id : r.sender_id
      if (!map.has(peer)) {
        map.set(peer, {
          peerId: peer,
          peerName: peerNames[peer] ?? null,
          lastText: r.text,
          lastAt: r.created_at,
          lastFromMe: r.sender_id === userId
        })
      }
    }
    return Array.from(map.values())
  }, [rows, userId, peerNames])

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
                <div style={{fontWeight:600}}>
                  {c.peerName ? c.peerName : <>Utente: <code>{c.peerId}</code></>}
                </div>
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
