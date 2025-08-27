'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Se già loggato, mandalo via da /login
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      // controlla onboarding
      const { data: prof } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', data.user.id)
        .single()
      if (!prof?.account_type) router.replace('/onboarding')
      else router.replace('/opportunities')
    }
    void check()
  }, [supabase, router])

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setMsg('')
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // <-- fondamentale
          // facoltativo: 'preferRedirect' evita popup bloccati
          queryParams: { prompt: 'select_account' }
        }
      })
      // Non serve fare altro: verrai rediretto a Google e poi a /auth/callback
    } catch (e: any) {
      setMsg(e?.message ?? 'Errore login')
      setLoading(false)
    }
  }

  return (
    <main style={{display:'grid',placeItems:'center',minHeight:'70vh',padding:24}}>
      <div style={{padding:24,border:'1px solid #e5e7eb',borderRadius:12,maxWidth:360,width:'100%'}}>
        <h1 style={{marginBottom:12}}>Accedi</h1>

        {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #e5e7eb',cursor:'pointer'}}
        >
          {loading ? 'Attendi…' : 'Continua con Google'}
        </button>

        <p style={{marginTop:12,fontSize:12,opacity:.7}}>
          Procedendo accetti i Termini &amp; Privacy.
        </p>
      </div>
    </main>
  )
}