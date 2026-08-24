'use client';
import { useI18n } from '@/components/i18n/I18nProvider';

type Props = {
  openTo?: boolean | null;
  preferredRoles?: string | null;
  preferredLocations?: string | null;
};

export default function AthleteOpenToOpportunitiesPanel({ openTo, preferredLocations, preferredRoles }: Props) {
  const { t } = useI18n();
  if (!openTo && !preferredRoles && !preferredLocations) return null;

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${openTo ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-h2 text-xl">{t('player.openOpportunities')}</h2>
        {openTo && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Disponibile
          </span>
        )}
      </div>
      {!openTo && <p className="mt-3 text-sm text-neutral-700">{t('player.availabilityMissing')}</p>}
      {openTo && (
        <div className="mt-3 space-y-2 text-sm text-neutral-800">
          <div>
            <span className="font-semibold">{t('player.preferredRole')}:</span> {preferredRoles || '—'}
          </div>
          <div>
            <span className="font-semibold">{t('player.preferredAreas')}:</span> {preferredLocations || '—'}
          </div>
        </div>
      )}
    </section>
  );
}
