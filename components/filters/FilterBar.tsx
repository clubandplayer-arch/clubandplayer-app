'use client';
}
});
router.replace(`${pathname}?${sp.toString()}`);
}


function resetAll() {
setQ(undefined);
setRegion(undefined);
setRole(undefined);
setSort('recent');
router.replace(pathname);
}


// Chips filtri attivi (solo subset per demo)
const chips: { key: string; label: string; remove: () => void }[] = [];
if (q) chips.push({ key: 'q', label: `Cerca: ${q}`, remove: () => setQ(undefined) });
if (region) chips.push({ key: 'region', label: `Regione: ${region}`, remove: () => setRegion(undefined) });
if (role) chips.push({ key: 'role', label: `Ruolo: ${role}`, remove: () => setRole(undefined) });


return (
<div className="w-full border-b bg-white">
<div className="max-w-7xl mx-auto p-4 flex flex-col gap-3">
<div className="flex flex-col md:flex-row gap-3">
<TextInput label="Ricerca" value={q} onChange={setQ} placeholder={scope === 'opportunities' ? 'Ruolo, club, città…' : 'Nome club, città…'} />
<TextInput label="Regione" value={region} onChange={setRegion} placeholder="Sicilia" />
{scope === 'opportunities' && (
<Select
label="Ruolo"
value={role}
onChange={(v) => setRole(Array.isArray(v) ? v[0] : v)}
options={[
{ label: 'Portiere', value: 'GK' },
{ label: 'Difensore', value: 'DF' },
{ label: 'Centrocampista', value: 'MF' },
{ label: 'Attaccante', value: 'FW' },
{ label: 'Allenatore', value: 'Coach' },
]}
/>
)}
<Select
label="Ordina"
value={sort}
onChange={(v) => setSort((Array.isArray(v) ? v[0] : v) as Filters['sort'])}
options={[
{ label: 'Più recenti', value: 'recent' },
{ label: 'In scadenza', value: 'closingSoon' },
{ label: 'Rilevanza', value: 'relevance' },
{ label: 'Ultima sincronizzazione', value: 'lastSync' },
]}
/>
<div className="flex items-end">
<button onClick={resetAll} className="h-10 px-3 border rounded">Reset</button>
</div>
</div>
{chips.length > 0 && (
<div className="flex flex-wrap gap-2">
{chips.map((c) => (
<Chip key={c.key} label={c.label} onRemove={c.remove} />
))}
</div>
)}
</div>
</div>
);
}