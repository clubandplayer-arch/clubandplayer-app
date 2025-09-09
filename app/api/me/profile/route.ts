import { NextResponse } from "next/server";

/**
 * Stub temporaneo per sbloccare la UI Applications.
 * Cambia `type` a "club" se vuoi testare la vista ricevute.
 */
export async function GET() {
  return NextResponse.json({ id: "me", type: "athlete" });
}
