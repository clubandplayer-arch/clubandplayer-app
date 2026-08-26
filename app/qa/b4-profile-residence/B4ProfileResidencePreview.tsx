'use client';

import { useMemo, useState } from 'react';
import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import type { CanonicalGeographyLoader } from '@/components/geo/canonicalGeographyContracts';
import type { GeoAreaRead } from '@/lib/geo/areas';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';

const countryIds = Object.fromEntries(['IT', 'FR', 'ES', 'CH', 'SI', 'PL'].map((iso2, index) => [iso2, `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`])) as Record<string, string>;
const countries: CanonicalCountryRead[] = [
  ['IT', 'Italia'], ['FR', 'France'], ['ES', 'España'], ['CH', 'Schweiz / Suisse'], ['SI', 'Slovenija'], ['PL', 'Polska'],
].map(([iso2, name], index) => ({ id: countryIds[iso2], iso2, iso3: null, officialName: name, isSupported: true, isActive: true, displayOrder: index }));

const area = (iso2: string, suffix: number, name: string, type: string, level: number, parentId: string | null): GeoAreaRead => ({
  id: `20000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`, country_id: countryIds[iso2], parent_id: parentId,
  code: null, code_authority: null, official_name: name, short_name: null, area_type: type, level, is_active: true,
  display_order: suffix, centroid_lat: null, centroid_lng: null, min_lat: null, min_lng: null, max_lat: null, max_lng: null,
});
const chains = [
  ['IT', ['Sicilia', 'Catania', 'Catania'], ['REGION', 'PROVINCE', 'MUNICIPALITY']],
  ['FR', ['Île-de-France', 'Paris', 'Paris'], ['REGION', 'DEPARTMENT', 'COMMUNE']],
  ['ES', ['Madrid, Comunidad de', 'Madrid', 'Alcalá de Henares'], ['AUTONOMOUS_COMMUNITY', 'PROVINCE', 'MUNICIPALITY']],
  ['CH', ['Ticino', 'Lugano', 'Lugano'], ['CANTON', 'DISTRICT', 'MUNICIPALITY']],
  ['SI', ['Osrednjeslovenska', 'Ljubljana'], ['STATISTICAL_REGION', 'MUNICIPALITY']],
  ['PL', ['Mazowieckie', 'Warszawa', 'Warszawa'], ['VOIVODESHIP', 'POWIAT', 'GMINA']],
] as const;
const areas: GeoAreaRead[] = [];
const leafByCountry: Record<string, string> = {};
let suffix = 1;
for (const [iso2, names, types] of chains) {
  let parent: string | null = null;
  names.forEach((name, index) => { const item = area(iso2, suffix++, name, types[index], index + 1, parent); areas.push(item); parent = item.id; });
  leafByCountry[iso2] = parent!;
}
const geneva = area('CH', suffix++, 'Genève', 'CANTON', 1, null);
const genevaCity = area('CH', suffix++, 'Genève', 'MUNICIPALITY', 2, geneva.id);
areas.push(geneva, genevaCity);

const ancestry = (id: string) => {
  const selected = areas.find((item) => item.id === id);
  if (!selected) throw new Error('Area fixture non trovata');
  const ancestors: GeoAreaRead[] = [];
  let parent = selected.parent_id;
  while (parent) { const item = areas.find((candidate) => candidate.id === parent)!; ancestors.unshift(item); parent = item.parent_id; }
  return { area: selected, ancestors };
};

export default function B4ProfileResidencePreview() {
  const [role, setRole] = useState<'athlete' | 'staff'>('athlete');
  const [countryId, setCountryId] = useState<string | null>(null);
  const [geoAreaId, setGeoAreaId] = useState<string | null>(null);
  const [mode, setMode] = useState<'normal' | 'slow' | 'error'>('normal');
  const loader = useMemo<CanonicalGeographyLoader>(() => {
    const run = async <T,>(value: T): Promise<T> => {
      if (mode === 'slow') await new Promise((resolve) => setTimeout(resolve, 900));
      if (mode === 'error') throw new Error('Errore fixture controllato: nessuna richiesta remota');
      return value;
    };
    return {
      countries: () => run(countries),
      roots: (iso2) => run(areas.filter((item) => item.country_id === countryIds[iso2] && item.parent_id === null)),
      children: (iso2, parentId) => run(areas.filter((item) => item.country_id === countryIds[iso2] && item.parent_id === parentId)),
      ancestry: (id) => run(ancestry(id)),
    };
  }, [mode]);
  const choose = (iso2: string, leaf = leafByCountry[iso2]) => { setCountryId(countryIds[iso2]); setGeoAreaId(leaf); };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">QA / DEV PREVIEW — B4.4 STEP 1</p>
          <h1 className="mt-2 text-2xl font-bold">Residenza canonica Player / Staff</h1>
          <p className="mt-2 text-sm text-amber-950">Fixture deterministiche. Nessuna API, query profilo, RPC o scrittura Supabase.</p>
        </header>
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Ruolo
              <select className="mt-1 block min-h-11 w-full rounded-xl border px-3" value={role} onChange={(event) => setRole(event.target.value as 'athlete' | 'staff')}>
                <option value="athlete">Player / Athlete</option><option value="staff">Staff</option>
              </select>
            </label>
            <label className="text-sm font-medium">Stato adapter fixture
              <select className="mt-1 block min-h-11 w-full rounded-xl border px-3" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
                <option value="normal">Normale</option><option value="slow">Loading lento</option><option value="error">Errore controllato</option>
              </select>
            </label>
          </div>
          <CanonicalGeographySelector loader={loader} countryId={countryId} geoAreaId={geoAreaId}
            onCountryChange={setCountryId} onGeoAreaChange={setGeoAreaId}
            labels={{ country: 'Paese di residenza', area: 'Area di residenza', selectCountry: 'Nessun Paese preselezionato', selectArea: 'Seleziona un’area' }} />
          <div className="mt-5 rounded-xl bg-slate-950 p-4 font-mono text-xs text-white">
            <div>role: {role}</div><div>residenceCountryId: {countryId ?? 'null'}</div><div>residenceGeoAreaId: {geoAreaId ?? 'null'}</div>
          </div>
          <button type="button" disabled className="mt-4 min-h-11 rounded-xl bg-slate-300 px-5 font-semibold text-slate-600">Salvataggio remoto disabilitato</button>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Scenari iniziali</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {['IT', 'FR', 'ES', 'CH', 'SI', 'PL'].map((iso2) => <button key={iso2} type="button" onClick={() => choose(iso2)} className="rounded-lg border px-3 py-2 text-sm font-semibold">{iso2}</button>)}
            <button type="button" onClick={() => choose('CH', genevaCity.id)} className="rounded-lg border px-3 py-2 text-sm font-semibold">CH senza District</button>
            <button type="button" onClick={() => { setCountryId(countryIds.FR); setGeoAreaId(null); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">FR country-only</button>
            <button type="button" onClick={() => { setCountryId(null); setGeoAreaId(null); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Reset completo</button>
          </div>
        </section>
      </div>
    </main>
  );
}
