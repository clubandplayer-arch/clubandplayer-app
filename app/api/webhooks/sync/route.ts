// app/api/webhooks/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { broadcast } from '@/lib/server/events';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // TODO: verifica firma (es. header 'x-signature')

    // Atteso: { event: "sync.completed", entity: "opportunity"|"club", ids: string[] }
    const ev = String(body?.event || 'sync.completed');
    const entity = String(body?.entity || 'unknown');
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    broadcast(ev, { entity, ids, at: Date.now() });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Webhook error' }, { status: 400 });
  }
}
