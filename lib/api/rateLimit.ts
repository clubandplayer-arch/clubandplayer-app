// lib/api/rateLimit.ts
// Rate limit in-memory (per processo). Va bene per dev/preview.
// In produzione serverless è "best effort" perché lo stato non è condiviso tra istanze.

const hits = new Map<string, number[]>();

type Options = { limit?: number; windowMs?: number };
const DEFAULT_LIMIT = 60;       // 60 req/min
const DEFAULT_WINDOW = 60_000;  // 60s

export function getClientKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) return `ip:${ip}`;
  const ua = req.headers.get("user-agent") ?? "ua:unknown";
  const path = new URL(req.url).pathname;
  return `ua:${ua}|${path}`;
}

export async function rateLimit(req: Request, opts: Options = {}) {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW;
  const key = getClientKey(req);
  const now = Date.now();

  const arr = hits.get(key) ?? [];
  const recent = arr.filter(ts => now - ts < windowMs);
  recent.push(now);
  hits.set(key, recent);

  if (recent.length > limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    const err = new Error("Too Many Requests") as Error & {
      status?: number;
      headers?: Record<string, string>;
    };
    err.status = 429;
    err.headers = {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(Math.max(0, limit - (recent.length - 1))),
    };
    throw err;
  }
}
