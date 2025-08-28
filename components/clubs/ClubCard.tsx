'use client';


import Image from 'next/image';
import { Club } from '@/lib/types';
import { SyncBadge } from '@/components/common/SyncBadge';


export function ClubCard({ club }: { club: Club }) {
return (
<article className="border rounded-xl p-4 flex flex-col gap-2 bg-white">
<div className="flex items-start justify-between gap-3">
<div className="flex items-center gap-3">
{club.logoUrl ? (
<Image src={club.logoUrl} alt={club.name} width={40} height={40} className="rounded" />
) : (
<div className="w-10 h-10 rounded bg-neutral-100" />
)}
<div>
<h3 className="text-lg font-semibold leading-tight">{club.name}</h3>
<p className="text-sm text-neutral-600">
{club.city}{club.province ? ` (${club.province})` : ''} • {club.region}
</p>
</div>
</div>
<SyncBadge status={club.syncStatus} />
</div>
<div className="text-sm text-neutral-700 flex flex-wrap gap-3">
{club.level && <span>Livello: <strong>{club.level}</strong></span>}
{!!club.badges?.length && (
<span>Badge: {club.badges.join(', ')}</span>
)}
{!!club.categories?.length && (
<span>Categorie: {club.categories.join(', ')}</span>
)}
</div>
<div className="mt-auto flex justify-between items-center pt-2">
<a href={`/clubs/${club.id}`} className="text-blue-600 hover:underline text-sm">Dettagli</a>
{club.lastSyncAt && (
<span className="text-xs text-neutral-500">sync: {new Date(club.lastSyncAt).toLocaleDateString()}</span>
)}
</div>
</article>
);
}