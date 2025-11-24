'use client';

import { useMemo, useState } from 'react';
import type { Profile } from '@/types/profile';
import { COUNTRIES } from '@/lib/opps/geo';
import { useItalyLocations } from '@/hooks/useItalyLocations';

export default function ProfileForm({
  initial,
  onSaved,
}: {
  initial?: Partial<Profile> | null;
  onSaved: (p: Profile) => void;
}) {
  const [type, setType] = useState<'athlete'|'club'>( (initial?.type as any) ?? 'athlete' );
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');

  const [countryCode, setCountryCode] = useState<string>(
    COUNTRIES.find((c) => c.label === initial?.country)?.code ?? 'IT'
  );
  const [countryFree, setCountryFree] = useState<string>(
    initial?.country && !COUNTRIES.find((c) => c.label === initial.country) ? (initial?.country ?? '') : ''
  );

  const [region, setRegion] = useState(initial?.region ?? '');
  const [province, setProvince] = useState(initial?.province ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const { data: italyLocations } = useItalyLocations();
  const provinces = useMemo(
    () => (countryCode === 'IT' ? italyLocations.provincesByRegion[region] ?? [] : []),
    [countryCode, region, italyLocations]
  );
  const cities = useMemo(
    () => (countryCode === 'IT' ? italyLocations.citiesByProvince[province] ?? [] : []),
    [countryCode, province, italyLocations]
  );

  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? '');
  const [links, setLinks] = useState({
    website: initial?.links && (initial.links as any).website || '',
    instagram: initial?.links && (initial.links as any).instagram || '',
    facebook: initial?.links && (initial.links as any).facebook || '',
    x: initial?.links && (initial.links as any).x || '',
    linkedin: initial?.links && (initial.links as any).linkedin || '',
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function effectiveCountry(): string | null {
    if (countryCode === 'OTHER') return countryFree.trim() || null;
    const found = COUNTRIES.find((c) => c.code === countryCode);
    return found?.label ?? countryCode ?? null;
  }
  function onChangeCountry(code: string) {
    setCountryCode(code);
    setCountryFree('');
    if (code !== 'IT') {
      setRegion('');
      setProvince('');
      setCity('');
    }
  }
  function onChangeRegion(r: string) {
    setRegion(r);
    setProvince('');
    setCity('');
  }
  function onChangeProvince(p: string) {
    setProvince(p);
    setCity('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!displayName.trim()) {
      setErr('Il nome profilo è obbligatorio');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        display_name: displayName.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        country: effectiveCountry(),
        region: region || null,
        province: countryCode === 'IT' ? (province || null) : null,
        city: (city || '').trim() || null,
        avatar_url: avatarUrl || null,
        links: {
          website: links.website?.trim() || null,
          instagram: links.instagram?.trim() || null,
          facebook: links.facebook?.trim() || null,
          x: links.x?.trim() || null,
          linkedin: links.linkedin?.trim() || null,
        },
      };

      const res = await fetch('/api/profiles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      onSaved(json.data);
    } catch (e: any) {
      setErr(e.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo profilo</label>
          <select className="w-full rounded-xl border px-3 py-2" value={type} onChange={(e)=>setType(e.target.value as any)}>
            <option value="athlete">Player</option>
            <option value="club">Club</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Nome profilo *</label>
          <input className="w-full rounded-xl border px-3 py-2" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Headline</label>
          <input className="w-full rounded-xl border px-3 py-2" value={headline ?? ''} onChange={(e)=>setHeadline(e.target.value)} placeholder="Es: Attaccante Serie D" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar (URL firmato)</label>
          <input className="w-full rounded-xl border px-3 py-2" value={avatarUrl ?? ''} onChange={(e)=>setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Bio</label>
        <textarea className="w-full rounded-xl border px-3 py-2 min-h-28" value={bio ?? ''} onChange={(e)=>setBio(e.target.value)} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Località</legend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Paese</label>
            <select className="w-full rounded-xl border px-3 py-2" value={countryCode} onChange={(e)=>onChangeCountry(e.target.value)}>
              {COUNTRIES.map((c)=>(
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            {countryCode === 'OTHER' && (
              <input className="mt-2 w-full rounded-xl border px-3 py-2" placeholder="Paese" value={countryFree} onChange={(e)=>setCountryFree(e.target.value)} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Regione</label>
            {countryCode === 'IT' ? (
              <select className="w-full rounded-xl border px-3 py-2" value={region} onChange={(e)=>onChangeRegion(e.target.value)}>
                <option value="">—</option>
                {italyLocations.regions.map((r: string)=>(
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input className="w-full rounded-xl border px-3 py-2" value={region ?? ''} onChange={(e)=>setRegion(e.target.value)} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provincia</label>
            {countryCode === 'IT' && (provinces.length > 0) ? (
              <select className="w-full rounded-xl border px-3 py-2" value={province} onChange={(e)=>onChangeProvince(e.target.value)}>
                <option value="">—</option>
                {provinces.map((p: string)=>(
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input className="w-full rounded-xl border px-3 py-2" value={province ?? ''} onChange={(e)=>setProvince(e.target.value)} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            {countryCode === 'IT' && (cities.length > 0) ? (
              <select className="w-full rounded-xl border px-3 py-2" value={city} onChange={(e)=>setCity(e.target.value)}>
                <option value="">—</option>
                {cities.map((c: string)=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input className="w-full rounded-xl border px-3 py-2" value={city ?? ''} onChange={(e)=>setCity(e.target.value)} />
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Link</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="rounded-xl border px-3 py-2" placeholder="Sito web" value={links.website} onChange={(e)=>setLinks({...links, website: e.target.value})} />
          <input className="rounded-xl border px-3 py-2" placeholder="Instagram" value={links.instagram} onChange={(e)=>setLinks({...links, instagram: e.target.value})} />
          <input className="rounded-xl border px-3 py-2" placeholder="Facebook" value={links.facebook} onChange={(e)=>setLinks({...links, facebook: e.target.value})} />
          <input className="rounded-xl border px-3 py-2" placeholder="X (Twitter)" value={links.x} onChange={(e)=>setLinks({...links, x: e.target.value})} />
          <input className="rounded-xl border px-3 py-2" placeholder="LinkedIn" value={links.linkedin} onChange={(e)=>setLinks({...links, linkedin: e.target.value})} />
        </div>
      </fieldset>

      {err && <div className="border rounded-lg p-2 bg-red-50 text-red-700">{err}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-gray-900 text-white">
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </div>
    </form>
  );
}
