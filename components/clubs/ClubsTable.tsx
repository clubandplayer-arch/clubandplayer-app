'use client';

type AnyProps = any;

/**
 * Fallback "sicuro" della tabella Club.
 * Prova a leggere i dati da props.items | props.data | props.rows.
 * Non impone shape: mostra colonne basiche (nome, città, id).
 */
export default function ClubsTable(props: AnyProps) {
  const items: any[] = Array.isArray(props?.items)
    ? props.items
    : Array.isArray(props?.data)
      ? props.data
      : Array.isArray(props?.rows)
        ? props.rows
        : [];

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left dark:border-neutral-800">
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Città</th>
            <th className="px-3 py-2">ID</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400" colSpan={3}>
                Nessun club da mostrare.
              </td>
            </tr>
          ) : (
            items.map((c: any, i: number) => (
              <tr key={c?.id ?? i} className="border-b dark:border-neutral-800">
                <td className="px-3 py-2">{c?.name ?? '—'}</td>
                <td className="px-3 py-2">{c?.city ?? '—'}</td>
                <td className="px-3 py-2 text-neutral-500">{c?.id ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
