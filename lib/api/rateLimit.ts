// lib/api/rateLimit.ts
// Distributed rate limit when Upstash/Vercel KV REST env vars are configured.
// Falls back to in-memory counters for local/dev environments.

type Options = {
  key?: string;
  limit?: number;
  window?: string;
  windowMs?: number;
};

type RateLimitError = Error & {
  status?: number;
  headers?: Record<string, string>;
};

const hits = new Map<string, number[]>();

const DEFAULT_LIMIT = 60;       // 60 req/min
const DEFAULT_WINDOW = 60_000;  // 60s
const MAX_KEY_LENGTH = 180;

function parseWindowMs(value?: string) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const match = /^(\d+)(ms|s|m|h)$/.exec(trimmed);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === 'ms') return amount;
  if (unit === 's') return amount * 1_000;
  if (unit === 'm') return amount * 60_000;
  if (unit === 'h') return amount * 3_600_000;
  return null;
}

function sanitizeKeyPart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9:._|-]/g, '_')
    .slice(0, MAX_KEY_LENGTH);
}

function getRedisRestConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL ||
    '';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN ||
    '';

  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

function createRateLimitError(limit: number, remaining: number, retryAfter: number): RateLimitError {
  const err = new Error('Too Many Requests') as RateLimitError;
  err.status = 429;
  err.headers = {
    'Retry-After': String(Math.max(1, retryAfter)),
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  };
  return err;
}

export function getClientKey(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip) return `ip:${ip}`;
  const ua = req.headers.get('user-agent') ?? 'ua:unknown';
  const path = new URL(req.url).pathname;
  return `ua:${ua}|${path}`;
}

async function rateLimitDistributed(key: string, limit: number, windowMs: number) {
  const config = getRedisRestConfig();
  if (!config) return null;

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `cp:rl:${key}`;
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSeconds],
    ]),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Rate limit store error: ${response.status}`);
  }

  const json = await response.json();
  const count = Number(Array.isArray(json) ? json[0]?.result : null);
  if (!Number.isFinite(count)) {
    throw new Error('Rate limit store returned an invalid counter');
  }

  if (count > limit) {
    throw createRateLimitError(limit, 0, windowSeconds);
  }

  return { count, remaining: Math.max(0, limit - count) };
}

function rateLimitMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = hits.get(key) ?? [];
  const recent = arr.filter((ts) => now - ts < windowMs);
  recent.push(now);
  hits.set(key, recent);

  if (recent.length > limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    throw createRateLimitError(limit, limit - (recent.length - 1), retryAfter);
  }

  return { count: recent.length, remaining: Math.max(0, limit - recent.length) };
}

export async function rateLimit(req: Request, opts: Options = {}) {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? parseWindowMs(opts.window) ?? DEFAULT_WINDOW;
  const rawKey = opts.key ? `${opts.key}:${getClientKey(req)}` : getClientKey(req);
  const key = sanitizeKeyPart(rawKey);

  try {
    const distributed = await rateLimitDistributed(key, limit, windowMs);
    if (distributed) return distributed;
  } catch (error: any) {
    if (error?.status === 429) throw error;
    console.warn('[rateLimit] distributed store unavailable, falling back to memory', {
      message: error?.message ?? String(error),
    });
  }

  return rateLimitMemory(key, limit, windowMs);
}
