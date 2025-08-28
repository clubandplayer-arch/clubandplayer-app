'use client';


import { SyncStatus } from '@/lib/types';


export function SyncBadge({ status }: { status?: SyncStatus }) {
const map: Record<SyncStatus | 'unknown', { label: string; className: string }> = {
synced: { label: 'Synced', className: 'bg-green-100 text-green-800 border-green-200' },
outdated: { label: 'Outdated', className: 'bg-amber-100 text-amber-800 border-amber-200' },
conflict: { label: 'Conflict', className: 'bg-red-100 text-red-800 border-red-200' },
local_edits: { label: 'Local edits', className: 'bg-blue-100 text-blue-800 border-blue-200' },
never_synced: { label: 'Never synced', className: 'bg-neutral-100 text-neutral-800 border-neutral-200' },
error: { label: 'Error', className: 'bg-rose-100 text-rose-800 border-rose-200' },
unknown: { label: '—', className: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
};
const item = status ? map[status] : map['unknown'];
return (
<span className={`text-xs px-2 py-1 border rounded-full ${item.className}`}>{item.label}</span>
);
}