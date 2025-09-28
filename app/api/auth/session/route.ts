// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

type Body = {
  event?: string;
  session?: {
    access_token?: string | null;
    refresh_token?: string | null;
  } | null;
};

export async function POST(req: NextRequest) {
  try {
    const { event, session }: Body = await req.json().catch(() => ({} as Body));

    // Response “contenitore” per i Set-Cookie generati da supabase
    const cookieCarrier = new NextResponse();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieCarrier.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieCarrier.cookies.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    // Sign-out esplicito
    if (event === "SIGNED_OUT" || !session) {
      await supabase.auth.signOut();
      return new NextResponse(JSON.stringify({ ok: true, cleared: true }), {
        status: 200,
        headers: {
          ...Object.fromEntries(cookieCarrier.headers),
          "content-type": "application/json",
        },
      });
    }

    // Per sincronizzare i cookie server servono entrambi i token.
    // Con SIGNED_IN li abbiamo sempre; con TOKEN_REFRESHED non sempre: in quel caso ignoriamo.
    const at = session.access_token ?? undefined;
    const rt = session.refresh_token ?? undefined;

    if (at && rt) {
      const { error } = await supabase.auth.setSession({
        access_token: at,
        refresh_token: rt,
      });
      if (error) {
        return new NextResponse(JSON.stringify({ ok: false, error: error.message }), {
          status: 401,
          headers: {
            ...Object.fromEntries(cookieCarrier.headers),
            "content-type": "application/json",
          },
        });
      }
    }

    return new NextResponse(JSON.stringify({ ok: true, event }), {
      status: 200,
      headers: {
        ...Object.fromEntries(cookieCarrier.headers),
        "content-type": "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
