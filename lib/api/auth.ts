// lib/api/auth.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Ok = { user: any; supabase: any };
type Fail = { response: NextResponse };

export async function requireUser(): Promise<Ok | Fail> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }
  return { user, supabase };
}
