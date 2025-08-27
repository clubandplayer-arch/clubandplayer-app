'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Row = {
  id: string
  sender_id: string
  receiver_id: string
  text: string
  created_at: string
}

export default function ChatPage() {
  const supabase = supabaseBrowser()
  const params = useParams<{ peerId: string }>()
  const peerId = params.peerId
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')
  const [text, setText] = useState('')
  const [peerName, setPeerName] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) { setErr('Devi accedere.'); setLoading(false); return }
    setUserId(u.data.user.id)

    // nome peer (se disponibile)
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', String(peerId))
      .limit(1)
    setPeerName(prof && prof[0] ? (prof[0] as {full_name: string|null}).full_name : null)

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, text, created_at')
      .or(`and(sender_id.eq.${u.data.user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${u.data.user.id})`)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) { setErr(`Errore: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as Row[])
    setLoading(false)
    scrollBottom()
  }, [supabase, peerId])

  useEffect(() => { void load() }, [load])

  // Realtime: ascolta nuovi messaggi
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${peerId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const r = payload.new as Row
          if (!userId) return
          const inThisThread =
            (r.sender_id === userId && r.receiver_id === peerId) ||
            (r.sender_id === peerId && r.receiver_id === userId)
          if (inThisThread) {
            setRows(prev => [...prev, r])
            scrollBottom()
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase, peerId, userId])

  const send = async () => {
    setErr('')
    const txt = text.trim()
    if (!txt) return
    const { data: udata, error: uerr } = await supabase.auth.getUser()
    if (uerr || !udata.user) { setErr('Devi accedere.'); return }

    // ottimismo UI
    const temp: Row = {
      id: `temp-${Date.now()}`,
      sender_id: udata.user.id,
      receiver_id: String(peerId),
      text: txt,
      created_at: new Date().toISOString(),
    }
    setRows(prev => [...prev, temp])
    setText('')
    scrollBottom()

    const { error } = await supabase.from('messages').insert({
      sender_id: udata.user.id,
      receiver_id: String(peerId),
      text: txt
    })
    if (error) {
      setErr(`Errore invio: ${error.message}`)
      // rollback soft (facoltativo)
      setRows(prev => prev.filter(r => r.id !== temp.id))
      return
    }
  }

  return (
    <main style={{maxWidth:860, margin:'0 auto', padding:24, display:'grid', gap:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{margin:0}}>Chat</h1>
        <Link href="/messages">← Torna alle conversazioni</Link>
      </div>

      <div style={{opacity:.8, fontSize:14}}>
        Con: <b>{peerName ?? <code>{String(peerId)}</code>}</b>
      </div>

      {err && <p style={{color:'#b91c1c'}}>{err}</p>}
      {loading && <p>Caricamento…</p>}

      <div ref={listRef} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, height:420, overflowY:'auto', background:'#f9fafb'}}>
        {rows.map(r => {
          const mine = r.sender_id === userId
          const isTemp = r.id.startsWith('temp-')
          return (
            <div key={r.id} style={{display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', margin:'6px 0'}}>
              <div style={{
                background: mine ? '#e0f2fe' : '#fff',
                border:'1px solid #e5e7eb',
                borderRadius:12,
                padding:'8px 12px',
                maxWidth:'75%',
                opacity: isTemp ? 0.6 : 1
              }}>
                <div style={{fontSize:14}}>{r.text}</div>
                <div style={{fontSize:11, opacity:.7, marginTop:4}}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{display:'flex', gap:8}}>
        <input
          placeholder="Scrivi un messaggio…"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if (e.key === 'Enter') { e.preventDefault(); void send() } }}
          style={{flex:1}}
        />
        <button onClick={() => { void send() }} style={{padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>
          Invia
        </button>
      </div>
    </main>
  )
}
