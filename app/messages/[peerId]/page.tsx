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

  const send = async () => {
    setErr('')
    const txt = text.trim()
    if (!txt) return
    const { data: udata, error: uerr } = await supabase.auth.getUser()
    if (uerr || !udata.user) { setErr('Devi accedere.'); return }

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: udata.user.id,
        receiver_id: String(peerId),
        text: txt
      })
    if (error) { setErr(`Errore invio: ${error.message}`); return }
    setText('')
    await load()
  }

  return (
    <main style={{maxWidth:860, margin:'0 auto', padding:24, display:'grid', gap:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{margin:0}}>Chat</h1>
        <Link href="/messages">← Torna alle conversazioni</Link>
      </div>

      <div style={{opacity:.8, fontSize:14}}>
        Con: <code>{String(peerId)}</code>
      </div>

      {err && <p style={{color:'#b91c1c'}}>{err}</p>}
      {loading && <p>Caricamento…</p>}

      <div ref={listRef} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, height:420, overflowY:'auto', background:'#f9fafb'}}>
        {rows.map(r => {
          const mine = r.sender_id === userId
          return (
            <div key={r.id} style={{display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', margin:'6px 0'}}>
              <div style={{
                background: mine ? '#e0f2fe' : '#fff',
                border:'1px solid #e5e7eb',
                borderRadius:12,
                padding:'8px 12px',
                maxWidth:'75%'
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
