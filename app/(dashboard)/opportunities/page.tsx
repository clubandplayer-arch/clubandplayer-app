// app/(dashboard)/opportunities/page.tsx
import { headers } from "next/headers";
import OpportunitiesClient, { Opportunity } from "./Client";

const PAGE_SIZE = 20;

async function getInitialData() {
  // headers() in questo setup restituisce Promise<ReadonlyHeaders>
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : "";

  // page=1 lato server
  const url = `${base}/api/opportunities?page=1&limit=${PAGE_SIZE}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    // niente cache per dati freschi
    cache: "no-store",
  });

  if (!res.ok) {
    // fallback: nessun dato iniziale, il client farà fetch
    return { items: [] as Opportunity[], hasMore: true };
  }

  const data = (await res.json()) as {
    items: Opportunity[];
    total?: number;
    hasMore?: boolean;
  };

  return {
    items: data.items ?? [],
    hasMore: data.hasMore ?? ((data.items?.length ?? 0) === PAGE_SIZE),
  };
}

export default async function Page() {
  const { items, hasMore } = await getInitialData();

  return (
    <OpportunitiesClient
      initialItems={items}
      initialHasMore={hasMore}
      initialPage={1}
    />
  );
}
