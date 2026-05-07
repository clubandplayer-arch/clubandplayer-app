// lib/api/schemas.ts
import { z } from 'zod';

// Pagination/query comune
export const listParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  q: z.string().max(200).optional(),
});

// Create/Update per opportunities
export const opportunityCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().default(''),
  role_group: z.enum(['player', 'staff']).optional(),
});

export const opportunityUpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  role_group: z.enum(['player', 'staff']).optional(),
});
