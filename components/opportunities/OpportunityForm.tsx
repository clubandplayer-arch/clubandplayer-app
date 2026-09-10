'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { localizeAccountType, localizeOpportunityCategory, localizeSport, localizeSportRole } from '@/lib/i18n/controlledVocabulary';
import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import CanonicalSportFilter, { type CanonicalSportFilterValue } from '@/components/sports/CanonicalSportFilter';
import { buildCanonicalSportRequestFields } from '@/lib/taxonomy/canonicalSportFormPayload';

import type { Opportunity } from '@/types/opportunity';
import { AGE_BRACKETS, type AgeBracket, normalizeSport, sportRequiresPlayerRole, SPORTS_ROLES } from '@/lib/opps/constants';
import { CATEGORIES_BY_SPORT } from '@/lib/opps/categories';
import {
  OPPORTUNITY_GENDER_LABELS,
  normalizeOpportunityGender,
  type OpportunityGenderCode,
} from '@/lib/opps/gender';

type RoleGroup = 'player' | 'staff';

const GENDERS = (Object.entries(OPPORTUNITY_GENDER_LABELS) as Array<[
  OpportunityGenderCode,
  string,
]>).map(([value, label]) => ({ value, label }));

const STAFF_ROLES = [
  'Presidente',
  'Vicepresidente',
  'Direttore Sportivo',
  'Direttore Generale',
  'Segretario',
  'Team Manager',
  'Dirigente Accompagnatore',
  'Allenatore',
  'Vice Allenatore',
  'Collaboratore Tecnico',
  'Match Analyst',
  'Video Analyst',
  'Preparatore Atletico',
  'Preparatore Portieri',
  'Medico Sociale',
  'Fisioterapista',
  'Osteopata',
  'Massaggiatore',
  'Mental Coach',
  'Nutrizionista',
  'Scout',
  'Talent Scout',
  'Addetto Stampa',
  'Social Media Manager',
  'Fotografo',
  'Content Creator',
] as const;

function normalizeRoleGroup(value: unknown): RoleGroup {
  return String(value ?? '').trim().toLowerCase() === 'staff' ? 'staff' : 'player';
}

function rangeFromBracket(b: AgeBracket | '' | undefined): { age_min: number | null; age_max: number | null } {
  if (!b) return { age_min: null, age_max: null };
  if (b.endsWith('+')) {
    const n = parseInt(b.replace('+', ''), 10);
    return Number.isFinite(n) ? { age_min: n, age_max: null } : { age_min: null, age_max: null };
  }
  if (b.startsWith('≤')) {
    const n = parseInt(b.replace('≤', ''), 10);
    return Number.isFinite(n) ? { age_min: null, age_max: n } : { age_min: null, age_max: null };
  }
  const m = b.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const min = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    if (Number.isFinite(min) && Number.isFinite(max)) return { age_min: min, age_max: max };
  }
  return { age_min: null, age_max: null };
}

function bracketFromRange(min?: number | null, max?: number | null): AgeBracket | '' {
  if (min != null && max != null) return `${min}-${max}` as AgeBracket;
  if (min != null && max == null) return `${min}+` as AgeBracket;
  if (min == null && max != null) return (`≤${max}` as unknown) as AgeBracket;
  return '';
}

// Estendiamo il tipo SOLO per il prop initial, senza toccare i tipi globali
type OpportunityInitial = Partial<Opportunity> & {
  gender?: string | null;
};

export default function OpportunityForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: OpportunityInitial;
  onCancel: () => void;
  onSaved: (saved: Opportunity) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const initialCountryId = initial?.country_id ?? initial?.geography?.countryId ?? null;
  const initialGeoAreaId = initial?.geo_area_id ?? initial?.geography?.geoAreaId ?? null;
  const [countryId, setCountryId] = useState<string | null>(initialCountryId);
  const [geoAreaId, setGeoAreaId] = useState<string | null>(initialGeoAreaId);
  const [geographyTouched, setGeographyTouched] = useState(false);
  const legacyLocation = [initial?.city, initial?.province, initial?.region, initial?.country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ');
  const hasLegacyOnlyLocation = !initialCountryId && Boolean(legacyLocation);

  // Sport/ruolo/categoria
  const [sport, setSport] = useState<string>(normalizeSport(initial?.sport) || 'Calcio');
  const [primarySport, setPrimarySport] = useState<CanonicalSportFilterValue>({
    sportId: initial?.primarySport?.sportId ?? initial?.sport_id ?? '',
    disciplineId: initial?.primarySport?.disciplineId ?? initial?.sport_discipline_id ?? '',
    variantId: initial?.primarySport?.variantId ?? initial?.sport_variant_id ?? '',
    legacySport: normalizeSport(initial?.sport) || 'Calcio',
  });
  const [role, setRole] = useState<string>(initial?.role ?? '');
  const [roleGroup, setRoleGroup] = useState<RoleGroup>(() => normalizeRoleGroup(initial?.role_group ?? initial?.roleGroup));
  const [category, setCategory] = useState<string>(initial?.category ?? '');
  const normalizedSport = normalizeSport(sport) ?? sport;
  const roleOptions = useMemo(() => SPORTS_ROLES[normalizedSport] ?? [], [normalizedSport]);
  const playerRoleRequired = sportRequiresPlayerRole(normalizedSport);
  const categoryOptions = useMemo(() => CATEGORIES_BY_SPORT[normalizedSport] ?? [], [normalizedSport]);

  // Genere (OBBLIGATORIO)
  const [gender, setGender] = useState<OpportunityGenderCode | ''>(
    () => normalizeOpportunityGender(initial?.gender) ?? ''
  );

  // Età (mappa ⇄ age_min/age_max)
  const [ageBracket, setAgeBracket] = useState<AgeBracket | ''>(() =>
    bracketFromRange(initial?.age_min ?? null, initial?.age_max ?? null)
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const normalizedTitle = title.trim();
    if (!normalizedTitle) return setErr(t('opportunity.titleRequired'));
    if (playerRoleRequired && roleGroup === 'player' && !role) return setErr(t('opportunity.invalidRole', { sport }));
    const normalizedGender = normalizeOpportunityGender(gender);
    if (!normalizedGender) return setErr(t('opportunity.selectGender'));

    const { age_min, age_max } = rangeFromBracket(ageBracket);

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: normalizedTitle,
        description: (description || '').trim() || null,
        role: role || null,
        role_group: role ? roleGroup : 'player',
        category: category || null,
        gender: normalizedGender,
        age_bracket: ageBracket || undefined,
        age_min,
        age_max,
      };
      Object.assign(payload, buildCanonicalSportRequestFields(primarySport));
      if (geographyTouched) {
        payload.country_id = countryId;
        payload.geo_area_id = geoAreaId;
      }

      const res = await fetch(isEdit ? `/api/opportunities/${initial!.id}` : '/api/opportunities', {
        method: isEdit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      onSaved(json.data);
    } catch (e: any) {
      setErr(e.message || t('opportunity.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t('opportunity.titleLabel')} *</label>
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('opportunity.description')}</label>
        <textarea
          className="w-full rounded-xl border px-3 py-2 min-h-28"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold">{t('opportunity.locationSection')}</h2>
        {hasLegacyOnlyLocation && !geographyTouched ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p><span className="font-semibold">{t('opportunity.location')}:</span> {legacyLocation}</p>
            <button
              type="button"
              className="mt-2 font-semibold text-amber-950 underline underline-offset-2"
              onClick={() => {
                setCountryId(null);
                setGeoAreaId(null);
                setGeographyTouched(true);
              }}
            >
              {t('common.remove')}
            </button>
          </div>
        ) : null}
        <CanonicalGeographySelector
          idPrefix="opportunity-geography"
          countryId={countryId}
          geoAreaId={geoAreaId}
          onCountryChange={(nextCountryId) => {
            setCountryId(nextCountryId);
            if (!nextCountryId) setGeoAreaId(null);
            setGeographyTouched(true);
          }}
          onGeoAreaChange={(nextGeoAreaId) => {
            setGeoAreaId(nextGeoAreaId);
            setGeographyTouched(true);
          }}
          disabled={saving}
        />
      </section>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t('opportunity.sportProfile')}</legend>
        <CanonicalSportFilter
          idPrefix="opportunity-form-sport"
          value={primarySport}
          onChange={(next) => {
            setPrimarySport(next);
            setSport(next.legacySport);
            if (roleGroup === 'player') {
              const nextPlayerRoles = SPORTS_ROLES[next.legacySport] ?? [];
              if (role && !nextPlayerRoles.includes(role)) setRole('');
            }
            const allowedCategories = CATEGORIES_BY_SPORT[next.legacySport] ?? [];
            if (!allowedCategories.includes(category)) setCategory('');
          }}
          sportLabel={(sport) => localizeSport(sport.code, t) ?? sport.canonical_name}
          labels={{
            sport: t('opportunities.sport'),
            allSports: t('opportunities.selectSport'),
            catalogUnavailable: t('sports.catalogUnavailable'),
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

          <div>
            <label className="block text-sm font-medium mb-1">{t('opportunities.category')}</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">—</option>
              {categoryOptions.map((c: string) => (
                <option key={c} value={c}>
                  {localizeOpportunityCategory(c, t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('opportunities.role')} {playerRoleRequired && <span className="text-red-600">*</span>}
            </label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={role ?? ''}
              onChange={(e) => {
                const nextRole = e.target.value;
                setRole(nextRole);
                if (!nextRole) {
                  setRoleGroup('player');
                  return;
                }
                if (roleOptions.includes(nextRole)) {
                  setRoleGroup('player');
                  return;
                }
                if (STAFF_ROLES.includes(nextRole as (typeof STAFF_ROLES)[number])) {
                  setRoleGroup('staff');
                }
              }}
              required={playerRoleRequired}
            >
              <option value="">—</option>
              <option value="__group_player" disabled>──────── {localizeAccountType('player', t)?.toUpperCase()} ────────</option>
              {roleOptions.map((r: string) => (
                <option key={r} value={r}>
                  {localizeSportRole(r, t)}
                </option>
              ))}
              <option value="__group_staff" disabled>──────── {localizeAccountType('staff', t)?.toUpperCase()} ────────</option>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {localizeSportRole(r, t)}
                </option>
              ))}
            </select>
          </div>

          {/* GENERE obbligatorio */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('opportunity.gender')} <span className="text-red-600">*</span>
            </label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={gender}
              onChange={(e) => {
                const next = (e.target.value || '') as OpportunityGenderCode | '';
                setGender(next);
              }}
              required
            >
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('opportunities.age')}</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={ageBracket}
              onChange={(e) => setAgeBracket(e.target.value as AgeBracket | '')}
            >
              {AGE_BRACKETS.map((b: string) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="">Indifferente</option>
            </select>
          </div>
        </div>
      </fieldset>

      {err && <div className="border rounded-lg p-2 bg-red-50 text-red-700">{err}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white"
        >
          {saving ? t('common.saving') : isEdit ? t('common.save') : t('opportunity.createShort')}
        </button>
      </div>
    </form>
  );
}
