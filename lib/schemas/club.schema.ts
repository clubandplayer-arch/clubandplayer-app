// lib/schemas/club.schema.ts
import { z } from "zod";

export const ClubSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  country: z.string(),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  level: z.enum(["Pro", "Dilettanti", "Giovanili", "Scuola Calcio"]).optional(),
  categories: z.array(z.string()).optional(),
  badges: z.array(z.enum(["verified", "partner", "premium"])).optional(),
  logoUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  lastSyncAt: z.string().datetime().optional(),
  syncStatus: z
    .enum(["synced", "outdated", "conflict", "local_edits", "error", "never_synced"])
    .optional(),
  updatedAt: z.string().datetime(),
  source: z.string().optional(),
});

export type ClubDTO = z.infer<typeof ClubSchema>;
