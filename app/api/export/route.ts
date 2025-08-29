// app/api/export/route.ts
import { NextRequest, NextResponse } from "next/server";

type Item = Record<string, unknown>;

async function fetchAllPages(
  urlBase: string,
  search: URLSearchParams
): Promise<Item[]> {
  const items: Item[] = [];
  let page = 1;
  for (;;) {
    const sp = new URLSearchParams(search);
    sp.set("page", String(page));
    if (!sp.has("pageSize")) sp.set("pageSize", "200");
    const res = await fetch(`${urlBase}?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Upstream ${urlBase} ${res.status}`);
    const json = (await res.json()) as { items: Item[]; hasMore?: boolean };
    items.push(...(json.items || []));
    if (!json.hasMore) break;
    page++;
    if (page > 50) break;
  }
  return items;
}

function toCsv(rows: Item[]): string {
  if (!rows.length) return "";
  const columns = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => columns.add(k)));
  const headers = Array.from(columns);

  function cell(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") {
      const escaped = v.replace(/"/g, '""');
      if (/[",\n]/.test(escaped)) return `"${escaped}"`;
      return escaped;
    }
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
  }

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell((r as any)[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "opportunities";
  const clone = new URLSearchParams(searchParams);
  clone.delete("scope");

  const base =
    scope === "clubs"
      ? `${req.nextUrl.origin}/api/clubs`
      : `${req.nextUrl.origin}/api/opportunities`;

  try {
    const items = await fetchAllPages(base, clone);
    const csv = toCsv(items);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `${scope}-${ts}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Export error" },
      { status: 500 }
    );
  }
}
