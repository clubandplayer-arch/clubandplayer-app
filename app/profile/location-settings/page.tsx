'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import Link from 'next/link';

export default function LocationSettingsPage() {
  return (
    <main className="container mx-auto py-8 max-w-2xl">
      <h1>Località</h1>
      <p className="lead">Questa pagina è stata spostata.</p>
      <div className="card p-4 mt-4 space-y-3 text-sm text-gray-700">
        <p className="font-semibold">Come aggiornare la località:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Vai a <Link className="text-blue-600 underline" href="/settings">/settings</Link> e usa la sezione “Zona di interesse”
            per impostare paese, regione, provincia e città.
          </li>
          <li>
            In alternativa, modifica il profilo da <Link className="text-blue-600 underline" href="/player/profile">/player/profile</Link>{' '}
            o <Link className="text-blue-600 underline" href="/club/profile">/club/profile</Link>.
          </li>
        </ul>
        <p className="text-xs text-gray-500">
          Le modifiche vengono salvate passando dall’endpoint ufficiale /api/profiles/me.
        </p>
      </div>
    </main>
  );
}
