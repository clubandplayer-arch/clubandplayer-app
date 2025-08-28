'use client';


import { Opportunity } from '@/lib/types';
import { formatDateShort } from '@/utils/date';
import { formatCurrency } from '@/utils/number';
import { SyncBadge } from '@/components/common/SyncBadge';


export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
return (
<article className="border rounded-xl p-4 flex flex-col gap-2 bg-white">
<div className="flex items-start justify-between gap-3">
<div>
<h3 className="text-lg font-semibold leading-tight">{opportunity.title}</h3>
{opportunity.club?.name && (
<p className="text-sm text-neutral-600">{opportunity.club.name}</p>
)}
</div>
<SyncBadge status={opportunity.syncStatus} />
</div>
<div className="text-sm text-neutral-700 flex flex-wrap gap-3">
{opportunity.role && <span>Ruolo: <strong>{opportunity.role}</strong></span>}
{opportunity.level && <span>Livello: <strong>{opportunity.level}</strong></span>}
{opportunity.location?.city && (
<span>📍 {opportunity.location.city}{opportunity.location?.province ? ` (${opportunity.location.province})` : ''}</span>
)}
{opportunity.expiresAt && (
<span>Scade: <strong>{formatDateShort(opportunity.expiresAt)}</strong></span>
)}
{opportunity.stipendRange?.min && (
<span>Compenso da {formatCurrency(opportunity.stipendRange.min)}</span>
)}
</div>
{opportunity.tags?.length ? (
<div className="flex flex-wrap gap-2 mt-1">
{opportunity.tags.map((t) => (
<span key={t} className="text-xs border rounded-full px-2 py-1 bg-neutral-50">{t}</span>
))}
</div>
) : null}
<div className="mt-auto flex justify-between items-center pt-2">
<a href={`/opportunities/${opportunity.id}`} className="text-blue-600 hover:underline text-sm">Dettagli</a>
{opportunity.lastSyncAt && (
<span className="text-xs text-neutral-500">sync: {formatDateShort(opportunity.lastSyncAt)}</span>
)}
</div>
</article>
);
}