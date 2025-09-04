// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get: (name) => req.cookies.get(name)?.value,
      set: (name, value, options) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name, options) => {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  // forza il refresh della sessione se presente
  await supabase.auth.getSession();

  return res;
}

// limita dove far girare il middleware (incluso /api)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sentry-example-page).*)",
  ],
};
