import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

export const GET = async () => {
  return NextResponse.json({ ok: true, ts: Date.now() });
};
