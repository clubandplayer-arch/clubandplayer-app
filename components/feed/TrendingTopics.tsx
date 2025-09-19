// components/feed/TrendingTopics.tsx
// Server component semplice (niente stato)
export default function TrendingTopics() {
  const topics = [
    { label: "Calciomercato Dilettanti", href: "/search/athletes?trend=mercato" },
    { label: "Portieri femminili U21", href: "/opportunities?role=goalkeeper&gender=f" },
    { label: "Preparazione invernale", href: "/feed?tag=preparazione" },
    { label: "Serie D – Esterni veloci", href: "/opportunities?league=serie-d&role=winger" },
  ];

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        🔥 Trending
      </h3>
      <ul className="space-y-2">
        {topics.map((t) => (
          <li key={t.label}>
            <a
              href={t.href}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
