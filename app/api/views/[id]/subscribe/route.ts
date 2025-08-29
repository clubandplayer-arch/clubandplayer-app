// app/api/views/[id]/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  // TODO: persistere su DB l'iscrizione dell'utente
  return NextResponse.json({ ok: true, subscribed: true, id });
}
