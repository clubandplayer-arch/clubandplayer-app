'use client';

export type Opportunity = {
  id: string | number;
  title?: string | null;
  created_at?: string | null;
  // ...altri campi se vuoi
};

export default function OpportunitiesClient({ initial }: { initial: Opportunity[] }) {
  if (!initial || initial.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-gray-600">
        Nessuna opportunità disponibile. Crea la prima o modifica i filtri.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {initial.map((o) => (
        <li key={o.id as any} className="rounded-md border p-3">
          <div className="font-medium">{o.title ?? `#${o.id}`}</div>
          {o.created_at && (
            <div className="text-xs text-gray-500">creata il {new Date(o.created_at).toLocaleString()}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
