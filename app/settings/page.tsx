'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { sports, rolesBySport, SportKey } from '@/data/roles'
import { regions, provincesByRegion, Region } from '@/data/geo'

type Gender = '' | 'M' | 'F'

type Profile = {
  id: string
  full_name: string | null
  sport: string | null
  role: string | null
  gender: 'M' | 'F' | null
  birth_year: number | null
  region: string | null
  province: string | null
  city: string | null
}

const thisYear = new Date().getFullYear()
const years: number[] = Array.from({ length: thisYear - 1960 + 1 }, (_, i) => thisYear - i)

export default function SettingsPage() {
  const supabase = supabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const [userId, setUserId] = useState<string | null>(null)

  // campi form
  const [fullName, setFullName] = useState<string>('')
  const [sport, setSport] = useState<SportKey | ''>('')
  const [role, setRole] = useState<string>('')           // dipende da sport
  const [gender, setGender] = useState<Gender>('')
  const [birthYear, setBirthYear] = useState<number | ''>('')
  const [region, setRegion] = useState<Region | ''>('')
  const [province, setProvince] = useState<string>('')
  const [city, setCity] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMsg('')
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) { setMsg(`Errore login: ${error.message}`); setLoading(false); return }
      if (!user)  { setMsg('Devi accedere per modificare il profilo.'); setLoading(false); return }

      setUserId(user.id)

      // carica il profilo (se non esiste, rimane vuoto e faremo upsert)
      const { data: rows, error: perr } = await supabase
        .from('profiles')
        .select('id, full_name, sport, role, gender, birth_year, region, province, city')
        .eq('id', user.id)
        .limit(1)

      if (perr) { setMsg(`Errore caricamento profilo: ${perr.message}`) }
      if (rows && rows.length > 0) {
        const p = rows[0] as Profile
        setFullName(p.full_name ?? '')
        const sportKey = (p.sport ?? '').toUpperCase() as SportKey | ''
        setSport(sportKey && sports.includes(sportKey as SportKey) ? (sportKey as SportKey) : '')
        setRole(p.role ?? '')
        setGender((p.gender ?? '') as Gender)
        setBirthYear(p.birth_year ?? '')
        setRegion(((p.region ?? '') as Region) || '')
        setProvince(p.province ?? '')
        setCity(p.city ?? '')
      }
      setLoading(false)
    }
    void load()
  }, [supabase])

  // ruoli dipendono dallo sport scelto
  const roleOptions = useMemo(() => sport ? rolesBySport[sport] : [], [sport])

  // azzera il ruolo se cambio sport
  useEffect(() => { setRole('') }, [sport])

  const onSave = async () => {
    setMsg('')
    setSaving(true)
    try {
      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr || !user) { setMsg(`Devi accedere: ${uerr?.message ?? ''}`); return }

      const payload = {
        id: user.id,
        full_name: fullName || null,
        sport: sport ? sport.toLowerCase() : null,
        role: role || null,
        gender: gender || null,
        birth_year: typeof birthYear === 'number' ? birthYear : null,
        region: region || null,
        province: province || null,
        city: city || null,
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload)   // onConflict default sulla PK id
        .select()

      if (error) { setMsg(`Errore salvataggio: ${error.message}`); return }
      setMsg('Profilo aggiornato correttamente ✅')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{maxWidth:840, margin:'0 auto', padding:24}}>
      <h1>Impostazioni profilo</h1>

      {loading ? <p>Caricamento…</p> : (
        <>
          {msg && <p style={{color: msg.includes('✅') ? '#166534' : '#b91c1c'}}>{msg}</p>}

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12}}>
            <div>
              <label>Nome e cognome</label>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} />
            </div>

            <div>
              <label>Sport</label>
              <select value={sport} onChange={e=>setSport(e.target.value as SportKey | '')}>
                <option value="">Seleziona sport</option>
                {sports.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label>Ruolo</label>
              <select value={role} onChange={e=>setRole(e.target.value)} disabled={!sport}>
                <option value="">{sport ? 'Seleziona ruolo' : 'Seleziona sport prima'}</option>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label>Genere</label>
              <select value={gender} onChange={e=>setGender(e.target.value as Gender)}>
                <option value="">—</option>
                <option value="M">Maschile</option>
                <option value="F">Femminile</option>
              </select>
            </div>

            <div>
              <label>Anno di nascita</label>
              <select
                value={birthYear === '' ? '' : String(birthYear)}
                onChange={e=>setBirthYear(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">—</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label>Regione</label>
              <select value={region} onChange={e=>setRegion(e.target.value as Region | '')}>
                <option value="">—</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label>Provincia</label>
              <select value={province} onChange={e=>setProvince(e.target.value)} disabled={!region}>
                <option value="">{region ? 'Seleziona' : 'Prima regione'}</option>
                {region && provincesByRegion[region].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label>Città</label>
              <input value={city} onChange={e=>setCity(e.target.value)} />
            </div>
          </div>

          <div style={{marginTop:16, display:'flex', gap:8}}>
            <button
              onClick={() => { void onSave() }}
              disabled={saving}
              style={{padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>

            {userId && (
              <Link href={`/u/${userId}`} style={{alignSelf:'center'}}>
                Vedi il mio profilo →
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  )
}
