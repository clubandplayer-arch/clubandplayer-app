import { z } from 'zod';

export const CreateShareLinkSchema = z.object({
  resourceType: z.enum(['post']),
  resourceId: z.string().uuid(),
  expiresAt: z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        return new Date(trimmed);
      }
      return value;
    }, z.date().optional())
    .optional(),
});

export type CreateShareLinkInput = z.infer<typeof CreateShareLinkSchema>;
