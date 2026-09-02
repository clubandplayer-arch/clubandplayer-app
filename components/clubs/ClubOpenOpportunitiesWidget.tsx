'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';

import { useProvinceAbbreviations } from '@/hooks/useProvinceAbbreviations';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { opportunityGeographyLabel } from '@/lib/opportunities/geography';
import type { OpportunityGeography } from '@/types/opportunity';

type OpportunityItem = {
  id: string;
  title: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  created_at: string | null;
  status?: string | null;
  club_id?: string | null;
  geography?: OpportunityGeography;
};

type Props = {
  items: OpportunityItem[];
  clubId: string;
  clubName?: string | null;
};

function formatLocation(opp: OpportunityItem, provinceAbbreviations: Record<string, string>) {
  const canonical = opportunityGeographyLabel(opp.geography);
  if (canonical) return canonical;
  const parts = [opp.city, provinceDisplayValue(opp.province, provinceAbbreviations), opp.region, opp.country].filter(Boolean);
  return parts.join(' · ') || 'Località non indicata';
}

function isNew(dateIso: string | null | undefined) {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.valueOf())) return false;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days <= 10;
}

export default function ClubOpenOpportunitiesWidget({ items, clubId, clubName }: Props) {
  const { t, locale } = useI18n();
  const provinceAbbreviations = useProvinceAbbreviations();
  const hasItems = items.length > 0;
  const viewAllHref = `/opportunities?clubId=${clubId}`;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="heading-h2 text-xl">{t('club.openOpportunities')}</h2>
      {!hasItems && <p className="mt-3 text-sm text-neutral-700">{t('club.noOpenOpportunities')}</p>}
      {hasItems && (
        <ul className="mt-4 space-y-3">
          {items.map((opp) => (
            <li key={opp.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="font-semibold text-neutral-900">{opp.title || t('club.untitledAd')}</div>
              <div className="text-sm text-neutral-700">{formatLocation(opp, provinceAbbreviations)}</div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{t('opportunities.publishedOn', { date: opp.created_at ? new Date(opp.created_at).toLocaleDateString(locale) : '—' })}</span>
                {isNew(opp.created_at) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{t('club.new')}</span>}
              </div>
              <Link
                href={`/opportunities/${opp.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Vai al dettaglio
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 text-right">
        <Link
          href={viewAllHref}
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-blue-700 underline-offset-4 hover:bg-blue-50"
        >
          {t('club.viewAllOpportunities', { club: clubName || t('club.thisClub') })}
        </Link>
      </div>
    </section>
  );
}
