// lib/api/schemas.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderingSchema = z.object({
  orderBy: z.string().min(1).optional(),          // es: "created_at" | "id" | ...
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});

export const listParamsSchema = paginationSchema.merge(orderingSchema);

export type ListParams = z.infer<typeof listParamsSchema>;
