import Link from 'next/link';

import OpportunityActions from '@/components/opportunities/OpportunityActions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { opportunityGenderLabel } from '@/lib/opps/gender';
import { getCountryName } from '@/lib/geo/countries';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations.server';
import { resolveRequestLocale } from '@/lib/i18n/server';
import { loadMessages, type MessageKey } from '@/lib/i18n/messages';

function formatDateHuman(date: string | null | undefined, locale: string) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAge(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function buildLocationLabel(city?: string | null, province?: string | null, region?: string | null, country?: string | null, provinceAbbreviations: Record<string, string> = {}) {
  const countryLabel = getCountryName(country) ?? (country || '');
  const parts = [city, provinceDisplayValue(province, provinceAbbreviations), region, countryLabel].map((p) => (p ?? '').trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function roleGroupLabel(value: unknown): 'Player' | 'Staff' {
  return String(value ?? '').trim().toLowerCase() === 'staff' ? 'Staff' : 'Player';
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const locale = await resolveRequestLocale();
  const messages = await loadMessages(locale);
  const t = (key: MessageKey) => messages[key] ?? key;
  const supabase = await getSupabaseServerClient();
  const { data: authUser } = await supabase.auth.getUser();

  const currentProfile = authUser?.user
    ? await supabase
        .from('profiles')
        .select('id, account_type, type')
        .eq('user_id', authUser.user.id)
        .maybeSingle()
    : { data: null };

  const { data: opp, error } = await supabase
    .from('opportunities')
    .select(
      'id,title,description,sport,role,role_group,category,country,region,province,city,created_at,status,owner_id,created_by,club_name,club_id,required_category,age_min,age_max,gender',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !opp) {
    return (
      <div className="p-6">
        <Link href="/opportunities" className="text-blue-700 hover:underline">
          ← {t('opportunity.back')}
        </Link>
        <div className="mt-4 rounded-2xl border bg-red-50 p-4 text-red-700">
          {t('opportunity.notFound')}
        </div>
      </div>
    );
  }

  const provinceAbbreviations = await getProvinceAbbreviationsServer();
  const ownerId = (opp as any).owner_id ?? (opp as any).created_by ?? null;
  const clubId = (opp as any).club_id ?? null;

  const { data: clubProfile } = clubId
    ? await supabase
        .from('profiles')
        .select('id,user_id,display_name,full_name,avatar_url,city,province,region,country,profile_type,account_type')
        .eq('id', clubId)
        .maybeSingle()
    : { data: null };

  const clubProfileId = clubProfile?.id ?? clubId;
  const placeLabel = buildLocationLabel(opp.city, opp.province, opp.region, opp.country, provinceAbbreviations);
  const place = placeLabel || [opp.city, provinceDisplayValue(opp.province, provinceAbbreviations), opp.region, opp.country].filter(Boolean).join(', ');
  const categoryLabel = (opp as any).category ?? (opp as any).required_category ?? null;
  const groupLabel = roleGroupLabel((opp as any).role_group);
  const genderLabel = opportunityGenderLabel((opp as any).gender) ?? undefined;
  const ageLabel = formatAge((opp as any).age_min, (opp as any).age_max);
  const published = formatDateHuman((opp as any).created_at, locale);
  const isOwner = !!authUser?.user && !!ownerId && authUser.user.id === ownerId;
  const isOwnerProfile = !!currentProfile.data?.id && !!clubProfileId && currentProfile.data.id === clubProfileId;
  const viewerRole = String((currentProfile.data as any)?.account_type ?? (currentProfile.data as any)?.type ?? '').toLowerCase();
  const canApplyViewer = viewerRole === 'athlete' || viewerRole === 'staff';

  return (
    <div className="page-shell space-y-4">
      <Link href="/opportunities" className="text-sm text-blue-700 hover:underline">
        ← {t('opportunity.backToList')}
      </Link>

      <div className="space-y-4">
        <section className="space-y-4">
          <header className="rounded-2xl border bg-white/80 p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                  {opp.status && <span className="rounded-full border px-2 py-1">{opp.status}</span>}
                  <span>{messages['opportunities.publishedOn'].replace('{date}', published)}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">{opp.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  {opp.sport && <span className="rounded-full bg-gray-100 px-3 py-1">{opp.sport}</span>}
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">[{groupLabel.toUpperCase()}]</span>
                  {opp.role && <span className="rounded-full bg-gray-100 px-3 py-1">{opp.role}</span>}
                  <span className="rounded-full bg-gray-100 px-3 py-1">{t('profile.age')}: {ageLabel}</span>
                  {genderLabel && <span className="rounded-full bg-gray-100 px-3 py-1">{genderLabel}</span>}
                  {place && <span className="rounded-full bg-gray-100 px-3 py-1">📍 {place}</span>}
                </div>
              </div>

              <div className="justify-self-end self-start">
                <OpportunityActions
                  opportunityId={opp.id}
                  title={opp.title}
                  description={opp.description}
                  clubProfileId={clubProfileId}
                  showApply={!isOwner && canApplyViewer}
                  hideClubLink={isOwnerProfile}
                />
              </div>
            </div>
          </header>

          <section className="rounded-2xl border bg-white/80 p-4 shadow-sm text-sm text-gray-700 space-y-2">
            <h4 className="text-base font-semibold">{t('opportunities.details')}</h4>
            <p><span className="font-medium">{t('applications.status')}:</span> {opp.status ?? '—'}</p>
            <p><span className="font-medium">{t('opportunity.published')}:</span> {published}</p>
            <p><span className="font-medium">ID:</span> {opp.id}</p>
          </section>

          <section className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">{t('opportunity.description')}</h2>
            <p className="whitespace-pre-wrap text-gray-800">{opp.description || t('opportunity.noDescription')}</p>
          </section>

          <section className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h3 className="text-lg font-semibold">{t('opportunity.requirements')}</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
              <li>{t('opportunity.sportRole')}: {opp.sport || '—'} • [{groupLabel.toUpperCase()}] {opp.role || '—'}</li>
              <li>{t('opportunity.targetAge')}: {ageLabel}</li>
              <li>{place ? `${t('opportunity.location')}: ${place}` : t('opportunity.locationMissing')}</li>
              <li>{t('opportunity.requiredCategory')}: {categoryLabel ?? '—'}{genderLabel ? ` • ${genderLabel}` : ''}</li>
            </ul>
          </section>
        </section>
      </div>
    </div>
  );
}
