// lib/schemas/savedView.schema.ts
import { z } from "zod";

export const SavedViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(["opportunities", "clubs"]),
  queryString: z.string(),
  createdAt: z.string().datetime(),
});

export type SavedViewDTO = z.infer<typeof SavedViewSchema>;
