// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Usiamo `any` per evitare problemi di path/types. Potrai rimettere <Database> in futuro.
export function getSupabaseServerClient() {
  return createRouteHandlerClient<any>({ cookies });
}
