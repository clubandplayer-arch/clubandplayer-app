import { NextResponse, type NextRequest } from 'next/server';
import { getYouTubeThumbnailUrl, getYouTubeVideoId } from '@/lib/media/youtube';

export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 400 * 1024;

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase();
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITY_MAP[key] ?? match;
  }).trim();
}

function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  try {
    const u = new URL(input.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAttribute(tag: string, attr: string): string | null {
  const re = new RegExp(`\\s${escapeRegExp(attr)}=["']([^"']*)["']`, 'i');
  return tag.match(re)?.[1] ?? null;
}

function extractMeta(html: string, name: string, attr: 'property' | 'name' = 'property'): string | null {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  const expectedName = name.toLowerCase();
  for (const tag of tags) {
    const tagName = extractAttribute(tag, attr)?.toLowerCase();
    if (tagName !== expectedName) continue;
    const content = extractAttribute(tag, 'content');
    if (content) return decodeHtmlEntities(content);
  }
  return null;
}

function extractTitle(html: string): string | null {
  const og = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (og) return og;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractDescription(html: string): string | null {
  return (
    extractMeta(html, 'og:description') ||
    extractMeta(html, 'description', 'name') ||
    extractMeta(html, 'twitter:description') ||
    null
  );
}

function extractImage(html: string, baseUrl: string): string | null {
  const raw = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || null;
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'clubandplayer-link-preview/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    let received = 0;
    let html = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.length ?? 0;
      if (received > MAX_HTML_BYTES) break;
      html += new TextDecoder().decode(value);
    }

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body?.url ?? body?.href ?? body?.link;
    const url = normalizeUrl(rawUrl);

    if (!url) {
      return NextResponse.json(
        { ok: false, code: 'invalid_url', message: 'URL non valida.' },
        { status: 400 }
      );
    }

    try {
      const html = await fetchHtml(url);
      const title = extractTitle(html);
      const description = extractDescription(html);
      const youtubeVideoId = getYouTubeVideoId(url);
      const image = extractImage(html, url) || (youtubeVideoId ? getYouTubeThumbnailUrl(youtubeVideoId) : null);

      return NextResponse.json({
        ok: true,
        url,
        title: title || null,
        description: description || null,
        image: image || null,
      });
    } catch (err: any) {
      const youtubeVideoId = getYouTubeVideoId(url);
      if (youtubeVideoId) {
        return NextResponse.json({
          ok: true,
          url,
          title: 'Video YouTube',
          description: null,
          image: getYouTubeThumbnailUrl(youtubeVideoId),
        });
      }
      return NextResponse.json({
        ok: false,
        code: 'fetch_failed',
        url,
        message: err?.message || 'Impossibile recuperare i metadati del link.',
      });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, code: 'invalid_request', message: err?.message }, { status: 400 });
  }
}
