// lib/schemas/filters.schema.ts
import { z } from "zod";

function csvToArray(v: unknown): string[] | undefined {
  if (typeof v !== "string") return v as any;
  if (!v) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export const FilterSchema = z.object({
  view: z.enum(["opps", "clubs"]).default("opps"),
  q: z.string().optional(),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),

  role: z.preprocess(csvToArray as (v: unknown) => unknown, z.array(z.string()).optional()),
  gender: z.enum(["M", "F", "Mixed"]).optional(),
  level: z.preprocess(csvToArray as (v: unknown) => unknown, z.array(z.string()).optional()),
  contractType: z.preprocess(csvToArray as (v: unknown) => unknown, z.array(z.string()).optional()),

  minAge: z.coerce.number().min(5).max(60).optional(),
  maxAge: z.coerce.number().min(5).max(60).optional(),
  minPay: z.coerce.number().optional(),
  maxPay: z.coerce.number().optional(),

  state: z.preprocess(
    csvToArray as (v: unknown) => unknown,
    z.array(z.enum(["active", "expiring", "expired", "archived"])).optional()
  ),
  sync: z.preprocess(
    csvToArray as (v: unknown) => unknown,
    z
      .array(
        z.enum([
          "synced",
          "outdated",
          "conflict",
          "local_edits",
          "never_synced",
          "error",
        ])
      )
      .optional()
  ),
  source: z.preprocess(csvToArray as (v: unknown) => unknown, z.array(z.string()).optional()),
  language: z.string().optional(),

  sort: z
    .enum([
      "relevance",
      "recent",
      "closingSoon",
      "payDesc",
      "payAsc",
      "distance",
      "lastSync",
      "updated",
    ])
    .default("recent"),

  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(10).max(100).default(25),
});

export type Filters = z.infer<typeof FilterSchema>;
