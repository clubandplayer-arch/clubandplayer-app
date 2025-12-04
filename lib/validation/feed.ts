import { z } from 'zod';

const EventPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Titolo obbligatorio'),
  date: z.string().trim().min(1, 'Data obbligatoria'),
  description: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  poster_url: z.string().trim().optional().nullable(),
  poster_path: z.string().trim().optional().nullable(),
  poster_bucket: z.string().trim().optional().nullable(),
});

export const CreatePostSchema = z
  .object({
    text: z.string().trim().optional(),
    content: z.string().trim().optional(),
    kind: z.string().trim().optional(),
    type: z.string().trim().optional(),
    event_payload: EventPayloadSchema.optional(),
    event: EventPayloadSchema.optional(),
    media_url: z.string().trim().optional(),
    mediaUrl: z.string().trim().optional(),
    media_type: z.string().trim().optional(),
    mediaType: z.string().trim().optional(),
    media_path: z.string().trim().optional(),
    mediaPath: z.string().trim().optional(),
    media_bucket: z.string().trim().optional(),
    mediaBucket: z.string().trim().optional(),
    media_mime: z.string().trim().optional(),
    mediaMime: z.string().trim().optional(),
    media_aspect: z.string().trim().optional(),
    mediaAspect: z.string().trim().optional(),
    link_url: z.string().trim().optional(),
    linkUrl: z.string().trim().optional(),
    link_title: z.string().trim().optional(),
    linkTitle: z.string().trim().optional(),
    link_description: z.string().trim().optional(),
    linkDescription: z.string().trim().optional(),
    link_image: z.string().trim().optional(),
    linkImage: z.string().trim().optional(),
    quoted_post_id: z.string().uuid().optional().nullable(),
    quotedPostId: z.string().uuid().optional().nullable(),
  })
  .passthrough();

export const CreateReactionSchema = z
  .object({
    postId: z.string().trim().min(1, 'postId obbligatorio'),
    reaction: z.union([z.enum(['like', 'love', 'care', 'angry']), z.literal(''), z.null()]).optional(),
  })
  .passthrough();

export const CreateCommentSchema = z
  .object({
    postId: z.string().trim().min(1, 'postId obbligatorio'),
    body: z.string().trim().min(1, 'Testo obbligatorio').max(800, 'Max 800 caratteri'),
  })
  .passthrough();

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type CreateReactionInput = z.infer<typeof CreateReactionSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
