// lib/api/schemas.ts
// Fallback senza 'zod': esporta un oggetto con .safeParse(raw) compatibile.
// Le route possono restare uguali: listParamsSchema.safeParse(...)

type ListParams = {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDir: "asc" | "desc";
};

function toInt(value: any, def: number) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toOrderDir(v: any): "asc" | "desc" {
  return String(v ?? "").toLowerCase() === "asc" ? "asc" : "desc";
}

export const paginationSchema = {
  // compat placeholder
};
export const orderingSchema = {
  // compat placeholder
};

// Compat: oggetto con metodo safeParse come zod
export const listParamsSchema = {
  safeParse(raw: any): { success: true; data: ListParams } | { success: false; error: string } {
    try {
      let page = toInt(raw?.page, 1);
      let pageSize = toInt(raw?.pageSize, 20);
      page = clamp(page, 1, 10_000);
      pageSize = clamp(pageSize, 1, 100);

      const orderBy = raw?.orderBy ? String(raw.orderBy) : undefined;
      const orderDir = toOrderDir(raw?.orderDir);

      const data: ListParams = { page, pageSize, orderBy, orderDir };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e?.message ?? "Invalid params" };
    }
  }
};

export type { ListParams };
