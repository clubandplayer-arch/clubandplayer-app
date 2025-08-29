// app/api/views/[id]/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  // TODO: eliminare iscrizione da DB
  return NextResponse.json({ ok: true, subscribed: false, id });
}
