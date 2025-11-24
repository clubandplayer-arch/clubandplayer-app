'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type AlertRow = {
  id: string
  sport: string
  role: string | null
  region: string | null
  province: string | null
  city: string | null
  created_at: string
}

export default function AlertsPage() {
  const supabase = supabaseBrowser()
  const [rows, setRows] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true); setMsg('')
    const u = await supabase.auth.getUser()
    if (u.error || !u.data.user) { setMsg('Devi accedere.'); setLoading(false); return }
    const { data, error } = await supabase
      .from('alerts')
      .select('id, sport, role, region, province, city, created_at')
      .order('created_at', { ascending: false })
    if (error) { setMsg(`Errore: ${error.message}`); setLoading(false); return }
    setRows((data ?? []) as AlertRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const remove = async (id: string) => {
    setMsg('')
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) { setMsg(`Errore cancellazione: ${error.message}`); return }
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <main style={{maxWidth:800, margin:'0 auto', padding:24}}>
      <h1>I miei avvisi</h1>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && rows.length === 0 && <p>Nessun avviso salvato. Vai su Opportunità e clicca “Salva ricerca”.</p>}
      <ul style={{display:'grid', gap:12}}>
        {rows.map(a => (
          <li key={a.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
              <div>
                <div style={{fontWeight:600}}>
                  {a.sport}{a.role ? ` · ${a.role}` : ''} {a.city ? ` · ${a.city}` : a.province ? ` · ${a.province}` : a.region ? ` · ${a.region}` : ''}
                </div>
                <div style={{fontSize:12, opacity:.7}}>Creato: {new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div>
                <button onClick={()=>remove(a.id)} style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>
                  Elimina
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
