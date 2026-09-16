'use client';

import { useCallback, useEffect, useState } from 'react';
import CanonicalSportFilter, { type CanonicalSportFilterValue } from '@/components/sports/CanonicalSportFilter';
import OrganizationCategoryFields, { type OrganizationCategoryValue } from '@/components/sports/OrganizationCategoryFields';
import { useI18n } from '@/components/i18n/I18nProvider';
import { localizeSport } from '@/lib/i18n/controlledVocabulary';
import { sportsOrganizationDisplayName } from '@/lib/sports/organizationDisplay';

type Row = {
  id: string; sport_id: string; sport_discipline_id: string | null; sport_variant_id: string | null;
  sports_organization_id: string; sports_organization_category_id: string; is_primary: boolean;
  sports?: { code?: string; canonical_name: string }; organization?: { code: string; canonical_name: string };
  category?: { canonical_name: string };
};
const EMPTY_SPORT: CanonicalSportFilterValue = { sportId: '', disciplineId: '', variantId: '', legacySport: '' };

type Props = {
  geographyDirty?: boolean;
  geographyRevision?: number;
};

export default function ClubRegistrationsSection({ geographyDirty = false, geographyRevision = 0 }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [countryId, setCountryId] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState(EMPTY_SPORT);
  const [membership, setMembership] = useState<OrganizationCategoryValue>({ organizationId: '', categoryId: '' });
  const [primary, setPrimary] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/clubs/registrations', { credentials: 'include', cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) { setRows(payload.data ?? []); setCountryId(payload.countryId ?? ''); }
  }, []);
  useEffect(() => {
    void load().then(() => {
      setOpen(false);
      setEditing(null);
      setMembership({ organizationId: '', categoryId: '' });
      setError('');
    });
  }, [load, geographyRevision]);

  const sportName = (row: Row) => localizeSport(row.sports?.code ?? row.sports?.canonical_name, t) ?? row.sports?.canonical_name ?? '—';
  const rowLabel = (row: Row) => `${sportName(row)} · ${row.organization ? sportsOrganizationDisplayName(row.organization.code, row.organization.canonical_name) : '—'} · ${row.category?.canonical_name ?? '—'}`;

  function start(row?: Row) {
    if (geographyDirty) return;
    setEditing(row ?? null); setError('');
    setSport(row ? { sportId: row.sport_id, disciplineId: row.sport_discipline_id ?? '', variantId: row.sport_variant_id ?? '', legacySport: row.sports?.canonical_name ?? '' } : EMPTY_SPORT);
    setMembership(row ? { organizationId: row.sports_organization_id, categoryId: row.sports_organization_category_id } : { organizationId: '', categoryId: '' });
    setPrimary(row?.is_primary ?? rows.length === 0); setOpen(true);
  }

  async function request(url: string, method: 'POST' | 'PATCH', body: object) {
    const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? t('club.registrations.saveError'));
  }

  async function save() {
    if (geographyDirty) return;
    if (!sport.sportId || !membership.organizationId || !membership.categoryId) return;
    const currentPrimary = rows.find((row) => row.is_primary && row.id !== editing?.id);
    if (primary && currentPrimary && !window.confirm(t('club.registrations.confirmPrimary', { current: rowLabel(currentPrimary) }))) return;
    try {
      await request(editing ? `/api/clubs/registrations/${editing.id}` : '/api/clubs/registrations', editing ? 'PATCH' : 'POST', {
        sport_id: sport.sportId, sport_discipline_id: sport.disciplineId || null, sport_variant_id: sport.variantId || null,
        sports_organization_id: membership.organizationId, sports_organization_category_id: membership.categoryId,
        is_primary: primary, is_active: true,
      });
      setOpen(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('club.registrations.saveError')); }
  }

  async function deactivate(row: Row) {
    if (geographyDirty) return;
    try {
      if (row.is_primary) {
        const replacement = rows.find((candidate) => candidate.id !== row.id);
        if (!replacement) { setError(t('club.registrations.onlyPrimary')); return; }
        if (!window.confirm(t('club.registrations.confirmDeactivatePrimary', { replacement: rowLabel(replacement) }))) return;
        await request(`/api/clubs/registrations/${replacement.id}`, 'PATCH', { is_primary: true });
      } else if (!window.confirm(t('club.registrations.confirmDeactivate'))) return;
      await request(`/api/clubs/registrations/${row.id}`, 'PATCH', { is_active: false });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('club.registrations.saveError')); }
  }

  return <section className="rounded-2xl border p-4 md:p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('club.registrations.title')}</h2>
      <button type="button" disabled={geographyDirty} onClick={() => start()} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{t('club.registrations.add')}</button></div>
    {geographyDirty && <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900" role="status">{t('club.registrations.geographyPending')}</p>}
    <div className="mt-4 space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div>{rowLabel(row)} {row.is_primary && <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{t('club.registrations.primary')}</span>}</div><div className="flex gap-2"><button type="button" disabled={geographyDirty} onClick={() => start(row)} className="rounded-lg border border-blue-600 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{t('club.registrations.edit')}</button><button type="button" disabled={geographyDirty} onClick={() => void deactivate(row)} className="rounded-lg border border-red-500 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{t('club.registrations.deactivate')}</button></div></div>)}</div>
    {open && !geographyDirty && <div className="mt-4 grid gap-3 md:grid-cols-3"><CanonicalSportFilter idPrefix="registration-sport" value={sport} onChange={(value, meta) => { setSport(value); if (meta.source === 'user') setMembership({ organizationId: '', categoryId: '' }); }} sportLabel={(item) => localizeSport(item.code, t) ?? item.canonical_name} labels={{ sport: t('club.sport'), allSports: '—', catalogUnavailable: t('sports.catalogUnavailable') }}/><OrganizationCategoryFields countryId={countryId} sport={sport} value={membership} onChange={setMembership} organizationLabel={t('club.organization')} categoryLabel={t('club.registrations.category')}/><label className="flex items-center gap-2"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)}/>{t('club.registrations.setPrimary')}</label><button type="button" onClick={() => void save()} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">{t('club.registrations.save')}</button><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-400 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">{t('club.registrations.cancel')}</button></div>}
    {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
  </section>;
}
