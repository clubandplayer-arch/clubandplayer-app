'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Opt = { id: number; name: string }

type ProfileInterests = {
  interest_country?: string | null
  interest_region_id?: number | null
  interest_province_id?: number | null
  interest_municipality_id?: number | null
}

export default function InterestAreaForm() {
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [uid, setUid] = useState<string | null>(null)

  // valori selezionati
  const [country, setCountry] = useState('IT')
  const [regionId, setRegionId] = useState<number | null>(null)
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)

  // opzioni
  const [regions, setRegions] = useState<Opt[]>([])
  const [provinces, setProvinces] = useState<Opt[]>([])
  const [cities, setCities] = useState<Opt[]>([])

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // load iniziale
  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser()
      const u = ures?.user ?? null
      if (!u) return
      setUid(u.id)

      const { data: r } = await supabase
        .from('regions')
        .select('id, name')
        .order('name')
      setRegions((r ?? []) as Opt[])

      const { data: p } = await supabase
        .from('profiles')
        .select('interest_country, interest_region_id, interest_province_id, interest_municipality_id')
        .eq('id', u.id)
        .maybeSingle()

      const cur = ((p ?? {}) as ProfileInterests)

      if (cur.interest_country) setCountry(cur.interest_country)
      if (cur.interest_region_id) setRegionId(Number(cur.interest_region_id))

      if (cur.interest_region_id) {
        const { data: prov } = await supabase
          .from('provinces')
          .select('id, name')
          .eq('region_id', cur.interest_region_id)
          .order('name')
        setProvinces((prov ?? []) as Opt[])
      }

      if (cur.interest_province_id) {
        setProvinceId(Number(cur.interest_province_id))
        const { data: mun } = await supabase
          .from('municipalities')
          .select('id, name')
          .eq('province_id', cur.interest_province_id)
          .order('name')
        setCities((mun ?? []) as Opt[])
      }

      if (cur.interest_municipality_id) {
        setCityId(Number(cur.interest_municipality_id))
      }
    })()
  }, [supabase])

  // cambia regione → carica province
  useEffect(() => {
    (async () => {
      if (!regionId) {
        setProvinces([]); setProvinceId(null)
        setCities([]); setCityId(null)
        return
      }
      const { data } = await supabase
        .from('provinces')
        .select('id, name')
        .eq('region_id', regionId)
        .order('name')
      setProvinces((data ?? []) as Opt[])
      setProvinceId(null)
      setCities([]); setCityId(null)
    })()
  }, [regionId, supabase])

  // cambia provincia → carica comuni
  useEffect(() => {
    (async () => {
      if (!provinceId) {
        setCities([]); setCityId(null)
        return
      }
      const { data } = await supabase
        .from('municipalities')
        .select('id, name')
        .eq('province_id', provinceId)
        .order('name')
      setCities((data ?? []) as Opt[])
      setCityId(null)
    })()
  }, [provinceId, supabase])

  const save = async () => {
    if (!uid) return
    setSaving(true)
    setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({
        interest_country: country,
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: cityId,
      })
      .eq('id', uid)

    setSaving(false)
    if (error) setMsg(`Errore: ${error.message}`)
    else setMsg('Salvato.')
  }

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`text-sm ${msg.startsWith('Errore') ? 'text-red-600' : 'text-green-700'}`}>
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="label">
          Paese
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="IT">Italia</option>
          </select>
        </label>

        <label className="label">
          Regione
          <select
            className="select"
            value={regionId ?? ''}
            onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Seleziona</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        <label className="label">
          Provincia
          <select
            className="select"
            disabled={!regionId}
            value={provinceId ?? ''}
            onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{regionId ? 'Seleziona' : '—'}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="label">
          Città
          <select
            className="select"
            disabled={!provinceId}
            value={cityId ?? ''}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{provinceId ? 'Seleziona' : '—'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <button onClick={save} disabled={saving} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
