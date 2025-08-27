'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type AccountType = 'athlete' | 'club'

type ProfileRow = {
  account_type: AccountType | null
  full_name: string | null
  sport: string | null
  role: string | null
  city: string | null
}

type ProfileUpsert = {
  id: string
  account_type: AccountType
  full_name?: string | null
  sport?: string | null
  role?: string | null
  city?: string | null
}

export default function OnboardingPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<AccountType | ''>('')
  const [sport, setSport] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [clubName, setClubName] = useState<string>('')
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setMsg('Devi accedere.'); return }
      setUserId(data.user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('account_type, full_name, sport, role, city')
        .eq('id', data.user.id)
        .limit(1)

      if (prof && prof[0]) {
        const p = prof[0] as ProfileRow
        if (p.account_type) setAccountType(p.account_type)
        if (p.full_name) setFullName(p.full_name)
        if (p.sport) setSport(p.sport)
        if (p.role) setRole(p.role)
        if (p.city) setCity(p.city)
      }
    }
    void init()
  }, [supabase])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg('')
    if (!userId) { setMsg('Sessione mancante.'); return }
    if (!accountType) { setMsg('Seleziona il tipo di account.'); return }

    // Validazioni differenziate
    if (accountType === 'athlete') {
      if (!fullName.trim()) return setMsg('Inserisci il tuo nome.')
      if (!sport) return setMsg('Seleziona lo sport.')
      if (!role) return setMsg('Seleziona il ruolo.')
      if (!city.trim()) return setMsg('Inserisci la città.')
    } else {
      if (!clubName.trim()) return setMsg('Inserisci il nome della squadra.')
      if (!city.trim()) return setMsg('Inserisci la città.')
    }

    const payload: ProfileUpsert = {
      id: userId,
      account_type: accountType,
      city: city || null
    }

    if (accountType === 'athlete') {
      payload.full_name = fullName
      payload.sport = sport
      payload.role = role
    } else {
      // per l’MVP usiamo full_name come display del club
      payload.full_name = clubName
      payload.sport = null
      payload.role = null
    }

    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) { setMsg(`Errore salvataggio: ${error.message}`); return }

    // redirect differenziato
    if (accountType === 'club') router.push('/club/posts')
    else router.push('/opportunities')
  }

  return (
    <main style={{maxWidth:640, margin:'0 auto', padding:24}}>
      <h1>Onboarding</h1>
      {msg && <p style={{color:'#b91c1c'}}>{msg}</p>}

      <form onSubmit={save} style={{display:'grid', gap:12}}>
        <div>
          <label>Sei un…</label><br/>
          <label style={{marginRight:12}}>
            <input
              type="radio"
              name="type"
              value="athlete"
              checked={accountType==='athlete'}
              onChange={()=>setAccountType('athlete')}
            /> Giocatore
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="club"
              checked={accountType==='club'}
              onChange={()=>setAccountType('club')}
            /> Squadra / Club
          </label>
        </div>

        {accountType === 'athlete' && (
          <>
            <input placeholder="Nome e cognome" value={fullName} onChange={e=>setFullName(e.target.value)} />
            <select value={sport} onChange={e=>{ setSport(e.target.value); setRole('') }}>
              <option value="">Sport</option>
              <option value="calcio">Calcio</option>
              <option value="futsal">Futsal</option>
              <option value="basket">Basket</option>
              <option value="volley">Volley</option>
            </select>
            <select value={role} onChange={e=>setRole(e.target.value)} disabled={!sport}>
              <option value="">Ruolo</option>
              {sport==='calcio' && ['portiere','difensore','centrocampista','attaccante'].map(r=><option key={r} value={r}>{r}</option>)}
              {sport==='futsal' && ['portiere','difensore','pivot','laterale'].map(r=><option key={r} value={r}>{r}</option>)}
              {sport==='basket' && ['playmaker','guardia','ala','centro'].map(r=><option key={r} value={r}>{r}</option>)}
              {sport==='volley' && ['palleggiatore','schiacciatore','centrale','libero'].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <input placeholder="Città" value={city} onChange={e=>setCity(e.target.value)} />
          </>
        )}

        {accountType === 'club' && (
          <>
            <input placeholder="Nome squadra / club" value={clubName} onChange={e=>setClubName(e.target.value)} />
            <input placeholder="Città" value={city} onChange={e=>setCity(e.target.value)} />
            <p style={{fontSize:12,opacity:.7,margin:0}}>
              Suggerimento: usa “I miei annunci” per pubblicare opportunità.
            </p>
          </>
        )}

        <button type="submit">Conferma</button>
      </form>
    </main>
  )
}
