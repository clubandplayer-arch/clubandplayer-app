import Link from 'next/link';

function pageLink(basePath: string, searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams);
  params.set('page', String(page));
  return `${basePath}?${params.toString()}`;
}

export default function Pagination({
  page,
  pageCount,
  searchParams,
  basePath = '/clubs',
}: {
  page: number;
  pageCount: number;
  searchParams: URLSearchParams;
  basePath?: string;
}) {
  if (pageCount <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);

  // Se poche pagine, mostra 1..N (max 7)
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 7);

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <div className="text-xs text-gray-500">
        Pagina {page} di {pageCount}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={pageLink(basePath, searchParams, prev)}
          className="rounded-lg border px-3 py-1 hover:bg-gray-50 aria-disabled:opacity-50"
          aria-disabled={page === 1}
        >
          ‹
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={pageLink(basePath, searchParams, p)}
            className={`rounded-lg border px-3 py-1 hover:bg-gray-50 ${
              p === page ? 'bg-gray-900 text-white hover:bg-gray-900' : ''
            }`}
          >
            {p}
          </Link>
        ))}
        <Link
          href={pageLink(basePath, searchParams, next)}
          className="rounded-lg border px-3 py-1 hover:bg-gray-50 aria-disabled:opacity-50"
          aria-disabled={page === pageCount}
        >
          ›
        </Link>
      </div>
    </div>
  );
}
