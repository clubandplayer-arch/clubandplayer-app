import { NextResponse } from "next/server";

/**
 * Stub temporaneo per sbloccare la UI.
 * Sostituisci con la lettura reale da Supabase (profiles) appena pronto.
 */
export async function GET() {
  // Ritorna sempre "athlete" per ora.
  // Per testare la vista club in preview puoi cambiare a "club".
  return NextResponse.json({ id: "me", type: "athlete" });
}
