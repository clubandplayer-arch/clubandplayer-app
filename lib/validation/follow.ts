import { z } from 'zod';

const numberFromParam = (defaultValue: number, min: number, max: number) =>
  z
    .preprocess((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().min(min).max(max))
    .default(defaultValue);

export const ToggleFollowSchema = z
  .object({
    targetProfileId: z.string().trim().min(1, 'targetProfileId obbligatorio'),
  })
  .passthrough();

export const FollowStateQuerySchema = z.object({
  targets: z.array(z.string().trim().min(1)).min(1, 'targets mancanti'),
});

export const FollowSuggestionsQuerySchema = z.object({
  limit: numberFromParam(4, 1, 20),
});

export type ToggleFollowInput = z.infer<typeof ToggleFollowSchema>;
export type FollowStateQueryInput = z.infer<typeof FollowStateQuerySchema>;
export type FollowSuggestionsQueryInput = z.infer<typeof FollowSuggestionsQuerySchema>;
