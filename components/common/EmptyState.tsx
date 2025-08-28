'use client';


export function EmptyState({ scope }: { scope: 'opportunities' | 'clubs' | 'views' }) {
const title = scope === 'views' ? 'Nessuna vista salvata' : 'Nessun risultato';
const hint = scope === 'views' ? 'Crea e salva un set di filtri dalla pagina elenco.' : 'Prova a rimuovere o modificare i filtri.';
return (
<div className="w-full py-16 text-center border rounded bg-white">
<h3 className="text-lg font-semibold">{title}</h3>
<p className="text-sm text-neutral-600 mt-1">{hint}</p>
{scope !== 'views' && (
<div className="mt-3">
<a href={scope === 'opportunities' ? '/opportunities' : '/clubs'} className="text-blue-600 underline">Rimuovi filtri</a>
</div>
)}
</div>
);
}