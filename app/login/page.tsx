'use client'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const signInWithGoogle = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <main style={{display:'grid',placeItems:'center',minHeight:'70vh',padding:24}}>
      <div style={{padding:24,border:'1px solid #e5e7eb',borderRadius:12,maxWidth:360,width:'100%'}}>
        <h1 style={{marginBottom:12}}>Accedi</h1>
        <button
          onClick={signInWithGoogle}
          style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #e5e7eb',cursor:'pointer'}}
        >
          Continua con Google
        </button>
        <p style={{marginTop:12,fontSize:12,opacity:.7}}>
          Procedendo accetti i Termini &amp; Privacy.
        </p>
      </div>
    </main>
  )
}