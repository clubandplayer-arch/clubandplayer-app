'use client';


import { useState } from 'react';
import { Opportunity } from '@/lib/types';


export function ConflictDiffModal({ open, onClose, remote, local, onResolve }: {
open: boolean;
onClose: () => void;
remote: Opportunity;
local: Opportunity;
onResolve: (strategy: 'keepLocal' | 'takeRemote' | 'merge') => void;
}) {
if (!open) return null;
const [tab, setTab] = useState<'remote' | 'local' | 'merge'>('remote');


return (
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
<div className="bg-white w-full max-w-3xl rounded-xl p-4 shadow-xl">
<div className="flex justify-between items-center mb-3">
<h3 className="text-lg font-semibold">Conflitto di sincronizzazione</h3>
<button onClick={onClose} className="text-neutral-600">×</button>
</div>
<div className="flex gap-2 mb-3">
<button className={`px-3 py-1 border rounded ${tab === 'remote' ? 'bg-neutral-100' : ''}`} onClick={() => setTab('remote')}>Remote</button>
<button className={`px-3 py-1 border rounded ${tab === 'local' ? 'bg-neutral-100' : ''}`} onClick={() => setTab('local')}>Local</button>
<button className={`px-3 py-1 border rounded ${tab === 'merge' ? 'bg-neutral-100' : ''}`} onClick={() => setTab('merge')}>Merge preview</button>
</div>
<div className="max-h-[60vh] overflow-auto border rounded">
<pre className="p-3 text-sm whitespace-pre-wrap">{JSON.stringify(tab === 'remote' ? remote : tab === 'local' ? local : { ...remote, ...local }, null, 2)}</pre>
</div>
<div className="flex justify-end gap-2 mt-3">
<button className="px-3 py-2 border rounded" onClick={() => onResolve('takeRemote')}>Prendi Remote</button>
<button className="px-3 py-2 border rounded" onClick={() => onResolve('keepLocal')}>Tieni Local</button>
<button className="px-3 py-2 border rounded" onClick={() => onResolve('merge')}>Merge</button>
</div>
</div>
</div>
);
}