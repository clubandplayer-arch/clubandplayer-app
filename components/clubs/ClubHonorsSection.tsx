'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CanonicalSportFilter, { type CanonicalSportFilterValue } from '@/components/sports/CanonicalSportFilter';
import OrganizationCategoryFields, { type OrganizationCategoryValue } from '@/components/sports/OrganizationCategoryFields';
import { useI18n } from '@/components/i18n/I18nProvider';
import { localizeOpportunityCategory, localizeSport } from '@/lib/i18n/controlledVocabulary';
import { sportsOrganizationDisplayName } from '@/lib/sports/organizationDisplay';
import { clubHonorSeasonOptions } from '@/lib/clubs/honorSeasons';

type Honor = {
  id: string; season: string; placement: 1 | 2 | 3; sport_id: string; sport_discipline_id: string | null; sport_variant_id: string | null;
  sports_organization_id: string; sports_organization_category_id: string;
  sports?: { code?: string; canonical_name: string }; organization?: { code: string; canonical_name: string }; category?: { canonical_name: string };
};
const EMPTY_SPORT: CanonicalSportFilterValue = { sportId: '', disciplineId: '', variantId: '', legacySport: '' };

export default function ClubHonorsSection({ countryId }: { countryId?: string | null }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Honor[]>([]);
  const [editing, setEditing] = useState<Honor | null>(null);
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState(EMPTY_SPORT);
  const [membership, setMembership] = useState<OrganizationCategoryValue>({ organizationId: '', categoryId: '' });
  const [season, setSeason] = useState('');
  const [placement, setPlacement] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');
  const previousCountryId = useRef(countryId);
  useEffect(() => {
    if (previousCountryId.current !== countryId) {
      setMembership({ organizationId: '', categoryId: '' });
      previousCountryId.current = countryId;
    }
  }, [countryId]);
  const seasonOptions = clubHonorSeasonOptions();
  const load = useCallback(async () => { const response = await fetch('/api/clubs/honors'); const payload = await response.json(); if (response.ok) setRows(payload.data ?? []); }, []);
  useEffect(() => {
    void load();
    window.addEventListener('club-geography-updated', load);
    return () => window.removeEventListener('club-geography-updated', load);
  }, [load]);
  const sportName = (row: Honor) => localizeSport(row.sports?.code ?? row.sports?.canonical_name, t) ?? row.sports?.canonical_name ?? '—';
  const placementLabel = (value: 1 | 2 | 3) => value === 1 ? t('club.honors.champion') : t(`club.honors.place${value}`);
  const label = (row: Honor) => `${row.season} · ${sportName(row)} · ${row.organization ? sportsOrganizationDisplayName(row.organization.code, row.organization.canonical_name) : '—'} · ${localizeOpportunityCategory(row.category?.canonical_name, t) ?? '—'} · ${placementLabel(row.placement)}`;
  function start(row?: Honor) { setEditing(row ?? null); setSport(row ? { sportId: row.sport_id, disciplineId: row.sport_discipline_id ?? '', variantId: row.sport_variant_id ?? '', legacySport: row.sports?.canonical_name ?? '' } : EMPTY_SPORT); setMembership(row ? { organizationId: row.sports_organization_id, categoryId: row.sports_organization_category_id } : { organizationId: '', categoryId: '' }); setSeason(row?.season ?? seasonOptions[0] ?? ''); setPlacement(row?.placement ?? 1); setError(''); setOpen(true); }
  async function request(url: string, body: object) { const response = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error ?? t('club.honors.saveError')); }
  async function save() { if (!sport.sportId || !membership.organizationId || !membership.categoryId || !/^\d{4}\/\d{4}$/.test(season)) { setError(t('club.honors.required')); return; } try { await request(editing ? `/api/clubs/honors/${editing.id}` : '/api/clubs/honors', { season, placement, sport_id: sport.sportId, sport_discipline_id: sport.disciplineId || null, sport_variant_id: sport.variantId || null, sports_organization_id: membership.organizationId, sports_organization_category_id: membership.categoryId, is_active: true }); setOpen(false); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : t('club.honors.saveError')); } }
  async function remove(row: Honor) { if (!window.confirm(t('club.honors.confirmRemove'))) return; setEditing(row); try { await fetch(`/api/clubs/honors/${row.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ is_active: false }) }); await load(); } finally { setEditing(null); } }
  return <section className="rounded-2xl border p-4 md:p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('club.honors.title')}</h2><button type="button" onClick={() => start()} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">{t('club.honors.add')}</button></div><div className="mt-4 space-y-3">{rows.map(row => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div>{label(row)}</div><div className="flex gap-2"><button type="button" onClick={() => start(row)} className="rounded-lg border border-blue-600 px-3 py-1.5 font-semibold text-blue-700">{t('club.registrations.edit')}</button><button type="button" onClick={() => void remove(row)} className="rounded-lg border border-red-500 px-3 py-1.5 font-semibold text-red-700">{t('club.registrations.deactivate')}</button></div></div>)}</div>{open && <div className="mt-4 grid gap-3 md:grid-cols-3"><CanonicalSportFilter idPrefix="honor-sport" value={sport} onChange={(value, meta) => { setSport(value); if (meta.source === 'user') setMembership({ organizationId: '', categoryId: '' }); }} sportLabel={(item) => localizeSport(item.code, t) ?? item.canonical_name} labels={{ sport: t('club.sport'), allSports: '—', catalogUnavailable: t('sports.catalogUnavailable') }}/><OrganizationCategoryFields countryId={countryId} sport={sport} value={membership} onChange={setMembership} organizationLabel={t('club.organization')} categoryLabel={t('club.registrations.category')}/><label>{t('club.honors.season')}<select className="mt-1 w-full rounded-xl border px-3 py-2" value={season} onChange={event => setSeason(event.target.value)}>{seasonOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>{t('club.honors.result')}<select className="mt-1 w-full rounded-xl border px-3 py-2" value={placement} onChange={event => setPlacement(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>{t('club.honors.champion')}</option><option value={2}>{t('club.honors.place2')}</option><option value={3}>{t('club.honors.place3')}</option></select></label><button type="button" onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">{t('club.honors.save')}</button><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-400 px-4 py-2 font-semibold">{t('club.registrations.cancel')}</button></div>}{error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}</section>;
}
