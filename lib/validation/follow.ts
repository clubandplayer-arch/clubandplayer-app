import { z } from 'zod';

export const ToggleFollowSchema = z
  .object({
    targetProfileId: z.string().trim().min(1, 'targetProfileId obbligatorio'),
  })
  .passthrough();

export type ToggleFollowInput = z.infer<typeof ToggleFollowSchema>;
