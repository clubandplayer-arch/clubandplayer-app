export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:gap-6">
          <div className="h-32 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-28 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
        </aside>

        <section className="flex flex-col gap-6 lg:col-span-6">
          <div className="h-36 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-48 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-48 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
        </section>

        <aside className="hidden xl:col-span-3 xl:flex xl:flex-col xl:gap-6">
          <div className="h-40 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-48 animate-pulse rounded-xl border bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
        </aside>
      </div>
    </div>
  );
}
