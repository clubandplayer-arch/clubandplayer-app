'use client';

import { useEffect, useMemo, useState } from 'react';
import { sportsOrganizationDisplayName } from '@/lib/sports/organizationDisplay';

export type OrganizationCategoryValue = { organizationId: string; categoryId: string };
type Organization = { id:string; code:string; canonical_name:string; display_order:number };
type Category = { id:string; organization_id:string; sport_id:string; discipline_id:string|null; variant_id:string|null; canonical_name:string };

export default function OrganizationCategoryFields({ sport, value, onChange, organizationLabel='Ente/Federazione', categoryLabel='Categoria' }: {
  sport: { sportId:string; disciplineId:string; variantId:string };
  value: OrganizationCategoryValue;
  onChange: (value: OrganizationCategoryValue, categoryName?: string) => void;
  organizationLabel?: string;
  categoryLabel?: string;
}) {
  const [catalog, setCatalog] = useState<{organizations:Organization[]; organizationCategories:Category[]}>({ organizations:[], organizationCategories:[] });
  useEffect(() => { let active=true; fetch('/api/sports/organization-memberships', { cache:'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(raw => {
    if (active) setCatalog(raw?.data ?? raw);
  }).catch(() => {}); return () => { active=false; }; }, []);
  const categories = useMemo(() => catalog.organizationCategories.filter(c => c.sport_id===sport.sportId
    && (c.discipline_id ?? '')===(sport.disciplineId || '') && (c.variant_id ?? '')===(sport.variantId || '')), [catalog, sport]);
  const organizationIds = useMemo(() => new Set(categories.map(c => c.organization_id)), [categories]);
  const organizations = catalog.organizations.filter(o => organizationIds.has(o.id));
  const selectedCategories = categories.filter(c => c.organization_id===value.organizationId);

  return <>
    <div><label className="mb-1 block text-sm font-medium">{organizationLabel}</label><select className="w-full rounded-xl border px-3 py-2" value={value.organizationId} disabled={!sport.sportId} onChange={e => onChange({ organizationId:e.target.value, categoryId:'' }, '')}>
      <option value="">—</option>{organizations.map(o => <option key={o.id} value={o.id}>{sportsOrganizationDisplayName(o.code, o.canonical_name)}</option>)}
    </select></div>
    <div><label className="mb-1 block text-sm font-medium">{categoryLabel}</label><select className="w-full rounded-xl border px-3 py-2" value={value.categoryId} disabled={!value.organizationId} required={Boolean(value.organizationId)} onChange={e => {
      const selected=selectedCategories.find(c => c.id===e.target.value); onChange({ ...value, categoryId:e.target.value }, selected?.canonical_name ?? '');
    }}><option value="">—</option>{selectedCategories.map(c => <option key={c.id} value={c.id}>{c.canonical_name}</option>)}</select></div>
  </>;
}
