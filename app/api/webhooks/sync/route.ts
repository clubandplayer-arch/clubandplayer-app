// app/api/webhooks/sync/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // TODO: verifica firma (es. header 'x-signature') e persistenza
    console.log("[webhook] sync", body?.event, body?.entity, body?.ids?.length ?? 0);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Webhook error" },
      { status: 400 }
    );
  }
}
