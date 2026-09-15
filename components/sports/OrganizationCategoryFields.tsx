'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { localizeOpportunityCategory } from '@/lib/i18n/controlledVocabulary';

export type OrganizationCategoryValue = { organizationId: string; categoryId: string };
type Organization = { id:string; code:string; canonical_name:string; display_name:string; display_order:number };
type Category = { id:string; organization_id:string; country_id:string; sport_id:string; discipline_id:string|null; variant_id:string|null; canonical_name:string; display_order?:number };

export default function OrganizationCategoryFields({ sport, countryId, value, onChange, organizationLabel='Ente/Federazione', categoryLabel='Categoria' }: {
  sport: { sportId:string; disciplineId:string; variantId:string };
  countryId?: string | null;
  value: OrganizationCategoryValue;
  onChange: (value: OrganizationCategoryValue, categoryName?: string) => void;
  organizationLabel?: string;
  categoryLabel?: string;
}) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<{organizations:Organization[]; organizationCategories:Category[]}>({ organizations:[], organizationCategories:[] });
  useEffect(() => { let active=true; if (countryId !== undefined && !countryId) { setCatalog({ organizations:[], organizationCategories:[] }); return () => { active=false; }; } const params=countryId ? `?countryId=${encodeURIComponent(countryId)}` : ''; fetch(`/api/sports/organization-memberships${params}`, { cache:'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(raw => {
    if (active) setCatalog(raw?.data ?? raw);
  }).catch(() => {}); return () => { active=false; }; }, [countryId]);
  const categories = useMemo(() => catalog.organizationCategories.filter(c => c.sport_id===sport.sportId
    && (c.discipline_id ?? '')===(sport.disciplineId || '') && (c.variant_id ?? '')===(sport.variantId || '')), [catalog, sport]);
  const organizationIds = useMemo(() => new Set(categories.map(c => c.organization_id)), [categories]);
  const organizations = catalog.organizations.filter(o => organizationIds.has(o.id));
  const selectedCategories = categories.filter(c => c.organization_id===value.organizationId).sort((a, b) => {
    if (a.canonical_name === 'Giovanili' && b.canonical_name === 'Giovanili') return 0;
    if (a.canonical_name === 'Giovanili') return 1;
    if (b.canonical_name === 'Giovanili') return -1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  return <>
    <div><label className="mb-2 block text-sm font-medium text-slate-700">{organizationLabel}</label><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100" value={value.organizationId} disabled={!sport.sportId} onChange={e => onChange({ organizationId:e.target.value, categoryId:'' }, '')}>
      <option value="">—</option>{organizations.map(o => <option key={o.id} value={o.id}>{o.display_name}</option>)}
    </select></div>
    <div><label className="mb-2 block text-sm font-medium text-slate-700">{categoryLabel}</label><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-100" value={value.categoryId} disabled={!value.organizationId} required={Boolean(value.organizationId)} onChange={e => {
      const selected=selectedCategories.find(c => c.id===e.target.value); onChange({ ...value, categoryId:e.target.value }, selected?.canonical_name ?? '');
    }}><option value="">—</option>{selectedCategories.map(c => <option key={c.id} value={c.id}>{localizeOpportunityCategory(c.canonical_name, t) ?? c.canonical_name}</option>)}</select></div>
  </>;
}
