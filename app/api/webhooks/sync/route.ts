// app/api/webhooks/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/lib/server/events";

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.WEBHOOK_SYNC_SECRET;
  if (!configuredSecret) {
    console.error("[webhook-sync] Missing WEBHOOK_SYNC_SECRET; rejecting request", {
      path: req.nextUrl?.pathname,
    });

    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (!providedSecret || providedSecret !== configuredSecret) {
    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";
    console.error("[webhook-sync] Invalid webhook secret", {
      path: req.nextUrl?.pathname,
      ip: clientIp,
    });

    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Atteso: { event: "sync.completed", entity: "opportunity"|"club", ids: string[] }
    const ev = String(body?.event || "sync.completed");
    const entity = String(body?.entity || "unknown");
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    broadcast(ev, { entity, ids, at: Date.now() });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Webhook error" }, { status: 400 });
  }
}
