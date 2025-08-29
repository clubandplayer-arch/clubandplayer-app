// app/(dashboard)/opportunities/page.tsx
import FilterBar from "@/components/filters/FilterBar";
import SavedViewsBar from "@/components/views/SavedViewsBar";
import PrevNextPager from "@/components/common/PrevNextPager";
import { headers } from "next/headers";
import OpportunitiesClient, { Opportunity } from "./Client";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function pickString(sp: PageProps["searchParams"], key: string) {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return (v ?? "") as string;
}

function parsePage(sp: PageProps["searchParams"]) {
  const raw = pickString(sp, "page");
  const n = parseInt(raw || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function getInitialData(sp: PageProps["searchParams"]) {
  // headers() restituisce Promise<ReadonlyHeaders> in questo setup
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : "";

  const page = parsePage(sp);
  const q = pickString(sp, "q");
  const role = pickString(sp, "role");
  const country = pickString(sp, "country");
  const status = pickString(sp, "status");
  const city = pickString(sp, "city");
  const from = pickString(sp, "from");
  const to = pickString(sp, "to");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (country) params.set("country", country);
  if (status) params.set("status", status);
  if (city) params.set("city", city);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const url = `${base}/api/opportunities?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    // fallback: render minimo
    return { items: [] as Opportunity[], hasMore: true, page };
  }

  const data = (await res.json()) as {
    items: Opportunity[];
    total?: number;
    hasMore?: boolean;
  };

  const items = data.items ?? [];
  const hasMore =
    typeof data.hasMore === "boolean"
      ? data.hasMore
      : (data.total ?? 0) > page * PAGE_SIZE || items.length === PAGE_SIZE;

  return { items, hasMore, page };
}

export default async function Page({ searchParams }: PageProps) {
  const { items, hasMore, page } = await getInitialData(searchParams);

  return (
    <div className="flex flex-col">
      <FilterBar scope="opportunities" />
      <SavedViewsBar scope="opportunities" />

      <OpportunitiesClient
        initialItems={items}
        initialHasMore={hasMore}
        initialPage={page}
      />

      <div className="max-w-7xl mx-auto w-full px-4">
        <PrevNextPager currentPage={page} hasMore={hasMore} label="Opportunità" />
      </div>
    </div>
  );
}
