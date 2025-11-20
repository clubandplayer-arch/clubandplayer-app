import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 200 * 1024;

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

function extractMeta(html: string, name: string, attr: 'property' | 'name' = 'property'): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*content=["']([^"']+)`, 'i');
  const match = html.match(re);
  return match?.[1]?.trim() || null;
}

function extractTitle(html: string): string | null {
  const og = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (og) return og;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function extractDescription(html: string): string | null {
  return (
    extractMeta(html, 'og:description') ||
    extractMeta(html, 'description', 'name') ||
    extractMeta(html, 'twitter:description') ||
    null
  );
}

function extractImage(html: string): string | null {
  return (
    extractMeta(html, 'og:image') ||
    extractMeta(html, 'twitter:image') ||
    null
  );
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
      const image = extractImage(html);

      return NextResponse.json({
        ok: true,
        url,
        title: title || null,
        description: description || null,
        image: image || null,
      });
    } catch (err: any) {
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
