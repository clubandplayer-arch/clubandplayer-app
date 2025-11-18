'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';


import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ClubsApiResponse, Club } from '@/types/club'

const PAGE_SIZE = 20

const formatPlace = (club: Pick<Club, 'city' | 'province' | 'region' | 'country'>) =>
  [club.city, club.province, club.region, club.country].filter(Boolean).join(', ') || '—'

export default function SearchClubPage() {
  const [filters, setFilters] = useState({
    q: '',
    city: '',
    province: '',
    region: '',
    country: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>('')
  const [items, setItems] = useState<Club[]>([])
  const [meta, setMeta] = useState<Pick<ClubsApiResponse, 'total' | 'pageCount'>>({ total: 0, pageCount: 1 })

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (appliedFilters.q.trim()) params.set('q', appliedFilters.q.trim())
    if (appliedFilters.city.trim()) params.set('city', appliedFilters.city.trim())
    if (appliedFilters.province.trim()) params.set('province', appliedFilters.province.trim())
    if (appliedFilters.region.trim()) params.set('region', appliedFilters.region.trim())
    if (appliedFilters.country.trim()) params.set('country', appliedFilters.country.trim())
    return params
  }, [appliedFilters, page])

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')

    try {
      const res = await fetch(`/api/clubs?${searchParams.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      const json = (await res.json().catch(() => ({}))) as ClubsApiResponse | { error?: string }
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`)

      setItems(Array.isArray(json.data) ? json.data : [])
      setMeta({
        total: json.total ?? 0,
        pageCount: json.pageCount ?? 1,
      })
    } catch (e: any) {
      setMsg(e?.message || 'Errore ricerca club')
      setItems([])
      setMeta({ total: 0, pageCount: 1 })
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    void load()
  }, [load])

  const handleFilter = () => {
    setPage(1)
    setAppliedFilters(filters)
  }

  const reset = () => {
    const empty = { q: '', city: '', province: '', region: '', country: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  const canGoPrev = page > 1
  const canGoNext = page < meta.pageCount

  return (
    <main style={{ maxWidth: 1024, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Cerca club</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/opportunities">← Torna alle opportunità</Link>
        </div>
      </header>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>Cerca per nome</label>
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Es. ASD Carlentini"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>Città / Comune</label>
            <input
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              placeholder="Es. Carlentini"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>Provincia</label>
            <input
              value={filters.province}
              onChange={(e) => setFilters((f) => ({ ...f, province: e.target.value }))}
              placeholder="Es. Siracusa"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>Regione</label>
            <input
              value={filters.region}
              onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
              placeholder="Es. Sicilia"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>Paese</label>
            <input
              value={filters.country}
              onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
              placeholder="Es. Italia"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleFilter}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
          >
            Filtra
          </button>
          <button
            onClick={reset}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        {msg && <p style={{ color: '#b91c1c', margin: 0 }}>{msg}</p>}
        {loading && <p style={{ margin: 0 }}>Caricamento…</p>}
        {!loading && !msg && (
          <p style={{ margin: 0, color: '#374151' }}>
            {meta.total} risultati · Pagina {page} di {meta.pageCount}
          </p>
        )}
      </div>

      <section style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {items.length === 0 && !loading && !msg && <p>Nessun club trovato.</p>}
        {items.map((c) => (
          <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {c.logo_url ? (
                  <Image src={c.logo_url} alt={c.display_name || c.name} width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: '#e5e7eb' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{c.display_name || c.name}</div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>{formatPlace(c)}</div>
                </div>
              </div>
              <div>
                <Link href={`/c/${c.id}`}>Vedi profilo club →</Link>
              </div>
            </div>

            {c.bio && (
              <p style={{ margin: '8px 0 0 0', fontSize: 14, opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                {c.bio}
              </p>
            )}
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { if (canGoPrev) { setPage((p) => Math.max(1, p - 1)); } }}
            disabled={!canGoPrev}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: canGoPrev ? 'pointer' : 'not-allowed', opacity: canGoPrev ? 1 : 0.5 }}
          >
            ← Pagina precedente
          </button>
          <button
            onClick={() => { if (canGoNext) { setPage((p) => Math.min(meta.pageCount, p + 1)); } }}
            disabled={!canGoNext}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.5 }}
          >
            Pagina successiva →
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>I filtri interrogano `/api/clubs` con gli indici pg_trgm + created_at.</div>
      </div>
    </main>
  )
}
