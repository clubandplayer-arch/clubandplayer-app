'use client';


export function ErrorState({ onRetry }: { onRetry: () => void }) {
return (
<div className="w-full py-16 text-center border rounded bg-white">
<h3 className="text-lg font-semibold">Si è verificato un errore</h3>
<p className="text-sm text-neutral-600 mt-1">Controlla la connessione o riprova più tardi.</p>
<div className="mt-3">
<button onClick={onRetry} className="px-3 py-2 border rounded">Riprova</button>
</div>
</div>
);
}