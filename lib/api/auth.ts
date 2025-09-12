// lib/api/auth.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/** Tipo client compatibile con la nostra factory */
type Supa = Awaited<ReturnType<typeof getSupabaseServerClient>>;

/** Contesto passato agli handler protetti */
export type AuthedCtx = {
  supabase: Supa;
  user: User;
};

/** Risposta JSON d'errore uniforme */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 401 se non c'è utente; altrimenti ritorna supabase + user */
export async function requireUser(): Promise<{ ctx?: AuthedCtx; res?: NextResponse }> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { res: jsonError('Unauthorized', 401) };
  }
  return { ctx: { supabase, user: data.user } };
}

/** Wrapper per proteggere i route handlers */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthedCtx) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest) => {
    const { ctx, res } = await requireUser();
    if (!ctx) return res!;
    return handler(req, ctx);
  };
}
