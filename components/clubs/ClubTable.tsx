'use client';


import { Club } from '@/lib/types';
import { SyncBadge } from '@/components/common/SyncBadge';


export function ClubTable({ items, total }: { items: Club[]; total: number }) {
return (
<div className="w-full overflow-auto">
<table className="min-w-[800px] w-full text-sm">
<thead>
<tr className="text-left border-b bg-neutral-50">
<th className="p-2">Nome</th>
<th className="p-2">Località</th>
<th className="p-2">Livello</th>
<th className="p-2">Badge</th>
<th className="p-2">Sync</th>
</tr>
</thead>
<tbody>
{items.map((c) => (
<tr key={c.id} className="border-b hover:bg-neutral-50">
<td className="p-2">
<a href={`/clubs/${c.id}`} className="text-blue-600 hover:underline">{c.name}</a>
</td>
<td className="p-2">{c.city}{c.province ? ` (${c.province})` : ''} • {c.region}</td>
<td className="p-2">{c.level}</td>
<td className="p-2">{c.badges?.join(', ')}</td>
<td className="p-2"><SyncBadge status={c.syncStatus} /></td>
</tr>
))}
</tbody>
</table>
<div className="text-xs text-neutral-500 p-2">Totale: {total}</div>
</div>
);
}