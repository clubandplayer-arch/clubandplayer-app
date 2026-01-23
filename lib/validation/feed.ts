import { z } from 'zod';

const booleanFromParam = z
  .preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v !== 'string') return undefined;
    const val = v.trim().toLowerCase();
    if (!val) return undefined;
    if (['1', 'true', 'yes', 'on'].includes(val)) return true;
    if (['0', 'false', 'no', 'off'].includes(val)) return false;
    return undefined;
  }, z.boolean())
  .optional();

const numberFromParam = (defaultValue: number, min: number, max: number) =>
  z
    .preprocess((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().min(min).max(max))
    .default(defaultValue);

const EventPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Titolo obbligatorio'),
  date: z.string().trim().min(1, 'Data obbligatoria'),
  description: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  poster_url: z.string().trim().optional().nullable(),
  poster_path: z.string().trim().optional().nullable(),
  poster_bucket: z.string().trim().optional().nullable(),
});

const PostMediaSchema = z.object({
  mediaType: z.enum(['image', 'video']).optional(),
  media_type: z.enum(['image', 'video']).optional(),
  url: z.string().trim().url().max(2048),
  posterUrl: z.string().trim().url().max(2048).optional().nullable(),
  poster_url: z.string().trim().url().max(2048).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export const FeedPostsQuerySchema = z.object({
  page: numberFromParam(0, 0, 10_000),
  limit: numberFromParam(50, 1, 200),
  scope: z
    .preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : 'all'), z.enum(['all', 'following']))
    .default('all'),
  mine: booleanFromParam.default(false),
  authorId: z
    .preprocess((v) => (typeof v === 'string' ? v.trim() || undefined : undefined), z.string().min(1))
    .optional(),
  debug: booleanFromParam.default(false),
});

export const CreatePostSchema = z
  .object({
    text: z.string().trim().max(500).optional(),
    content: z.string().trim().max(500).optional(),
    kind: z.enum(['normal', 'event']).optional(),
    type: z.enum(['normal', 'event', 'post']).optional(),
    event_payload: EventPayloadSchema.optional(),
    event: EventPayloadSchema.optional(),
    media_url: z.string().trim().url().max(2048).optional(),
    mediaUrl: z.string().trim().url().max(2048).optional(),
    media_type: z.enum(['image', 'video']).optional(),
    mediaType: z.enum(['image', 'video']).optional(),
    media_path: z.string().trim().max(2048).optional(),
    mediaPath: z.string().trim().max(2048).optional(),
    media_bucket: z.string().trim().max(255).optional(),
    mediaBucket: z.string().trim().max(255).optional(),
    media_mime: z.string().trim().max(255).optional(),
    mediaMime: z.string().trim().max(255).optional(),
    media_aspect: z.enum(['16:9', '9:16']).optional(),
    mediaAspect: z.enum(['16:9', '9:16']).optional(),
    media: z.array(PostMediaSchema).optional(),
    link_url: z.string().trim().url().max(2048).optional(),
    linkUrl: z.string().trim().url().max(2048).optional(),
    link_title: z.string().trim().max(500).optional(),
    linkTitle: z.string().trim().max(500).optional(),
    link_description: z.string().trim().max(2000).optional(),
    linkDescription: z.string().trim().max(2000).optional(),
    link_image: z.string().trim().url().max(2048).optional(),
    linkImage: z.string().trim().url().max(2048).optional(),
    quoted_post_id: z.string().uuid().optional().nullable(),
    quotedPostId: z.string().uuid().optional().nullable(),
  })
  .passthrough();

export const PatchPostSchema = z
  .object({
    content: z.string().trim().max(500).optional(),
    text: z.string().trim().max(500).optional(),
  })
  .passthrough()
  .refine((value) => Boolean((value.content || value.text)?.trim()), {
    message: 'Testo obbligatorio',
    path: ['content'],
  });

export const CreateReactionSchema = z
  .object({
    postId: z.string().trim().min(1, 'postId obbligatorio'),
    reaction: z.union([z.enum(['like', 'love', 'care', 'angry']), z.literal(''), z.null()]).optional(),
  })
  .passthrough();

export const ReactionCountsQuerySchema = z.object({
  ids: z
    .preprocess((v) => {
      if (Array.isArray(v)) return v;
      if (typeof v !== 'string') return [];
      return Array.from(new Set(v.split(',').map((id) => id.trim()).filter(Boolean)));
    }, z.array(z.string().min(1)))
    .default([]),
});

export const CreateCommentSchema = z
  .object({
    postId: z.string().trim().min(1, 'postId obbligatorio'),
    body: z.string().trim().min(1, 'Testo obbligatorio').max(800, 'Max 800 caratteri'),
  })
  .passthrough();

export const PatchCommentSchema = z
  .object({
    body: z.string().trim().min(1, 'Testo obbligatorio').max(800, 'Max 800 caratteri'),
  })
  .passthrough();

export const CommentsQuerySchema = z.object({
  postId: z.string().trim().min(1, 'postId obbligatorio'),
  limit: numberFromParam(30, 1, 100),
});

export const CommentCountsQuerySchema = z.object({
  ids: z
    .preprocess((v) => {
      if (Array.isArray(v)) return v;
      if (typeof v !== 'string') return [];
      return Array.from(new Set(v.split(',').map((id) => id.trim()).filter(Boolean)));
    }, z.array(z.string().min(1)))
    .default([]),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type CreateReactionInput = z.infer<typeof CreateReactionSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type PatchCommentInput = z.infer<typeof PatchCommentSchema>;
export type PatchPostInput = z.infer<typeof PatchPostSchema>;
export type FeedPostsQueryInput = z.infer<typeof FeedPostsQuerySchema>;
export type ReactionCountsQueryInput = z.infer<typeof ReactionCountsQuerySchema>;
export type CommentsQueryInput = z.infer<typeof CommentsQuerySchema>;
export type CommentCountsQueryInput = z.infer<typeof CommentCountsQuerySchema>;
