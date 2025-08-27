'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opp = {
  id: string
  title: string
  city: string
  role: string
  status: 'aperto' | 'chiuso'
  created_at: string
  updated_at: string
}

export default function ClubPostsPage() {
  const supabase = supabaseBrowser()
  const [rows, setRows] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true); setMsg('')
    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) { setMsg('Devi accedere.'); setLoading(false); return }
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, city, role, status, created_at, updated_at')
      .eq('owner_id', u.data.user.id)
      .order('created_at', { ascending: false })
    if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as Opp[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const toggleStatus = async (id: string, current: 'aperto'|'chiuso') => {
    setMsg('')
    const next = current === 'aperto' ? 'chiuso' : 'aperto'
    const { error } = await supabase.from('opportunities').update({ status: next }).eq('id', id)
    if (error) { setMsg(`Errore aggiornamento: ${error.message}`); return }
    setRows(prev => prev.map(o => o.id === id ? { ...o, status: next } : o))
  }

  const remove = async (id: string) => {
    setMsg('')
    if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (error) { setMsg(`Errore eliminazione: ${error.message}`); return }
    setRows(prev => prev.filter(o => o.id !== id))
  }

  return (
    <main style={{maxWidth:900, margin:'0 auto', padding:24}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>I miei annunci</h1>
        <Link href="/post">+ Crea annuncio</Link>
      </div>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && rows.length === 0 && <p>Nessun annuncio creato.</p>}

      <ul style={{display:'grid', gap:12, marginTop:12}}>
        {rows.map(o => (
          <li key={o.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:600}}>
                  {o.title} — {o.city} — {o.role} · <span style={{textTransform:'uppercase', fontSize:12, color: o.status==='aperto' ? '#059669' : '#b91c1c'}}>{o.status}</span>
                </div>
                <div style={{fontSize:12, opacity:.7}}>
                  Creato: {new Date(o.created_at).toLocaleString()} · Ultimo aggiornamento: {new Date(o.updated_at).toLocaleString()}
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <Link href={`/club/posts/edit/${o.id}`} style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8}}>Modifica</Link>
                <button onClick={()=>toggleStatus(o.id, o.status)} style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>
                  {o.status === 'aperto' ? 'Chiudi' : 'Riapri'}
                </button>
                <button onClick={()=>remove(o.id)} style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>Elimina</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
