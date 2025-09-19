// components/feed/WhoToFollow.tsx
// Server component: mostra club/atleti consigliati (placeholder)
type Suggestion = {
  name: string;
  subtitle: string;
  href: string;
};

const MOCK: Suggestion[] = [
  { name: "ASD Siracusa", subtitle: "Eccellenza • Sicilia", href: "/c/asd-siracusa" },
  { name: "SSD Virtus Rosa", subtitle: "Femminile • Serie C", href: "/c/virtus-rosa" },
  { name: "Davide Bianchi", subtitle: "Punta centrale • 21 anni", href: "/u/davide-bianchi" },
];

export default function WhoToFollow() {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        👥 Chi seguire
      </h3>
      <ul className="space-y-3">
        {MOCK.map((s) => (
          <li key={s.href} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{s.name}</div>
              <div className="truncate text-xs text-neutral-500">{s.subtitle}</div>
            </div>
            <a
              href={s.href}
              className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Vedi
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-right">
        <a
          href="/search/club"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Mostra tutto
        </a>
      </div>
    </div>
  );
}
