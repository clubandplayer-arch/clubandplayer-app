import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function baseUrl(req: NextRequest) {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : req.nextUrl.origin);
  return raw.replace(/\/+$/, '');
}

function toAbsoluteUrl(raw: string, origin: string) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getSupabaseAdminClientOrNull();
  const supabase = admin ?? (await getSupabaseServerClient());

  const { data, error } = await supabase
    .from('posts')
    .select('link_image, media_url')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Post non trovato' }, { status: 404 });
  }

  const image = data.link_image || data.media_url;
  if (!image) {
    return NextResponse.json({ error: 'Immagine non disponibile' }, { status: 404 });
  }

  const origin = baseUrl(req);
  const imageUrl = toAbsoluteUrl(image, origin);
  const response = await fetch(imageUrl);

  if (!response.ok) {
    return NextResponse.json({ error: 'Immagine non disponibile' }, { status: 404 });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
