export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams: SearchParams;
};

/**
 * Next 15: cookies() è async. Questa utility replica il client SSR usato nel route handler.
 */
async function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: any) =>
        store.set({ name, value, ...options }),
      remove: (name: string, options: any) =>
        store.set({ name, value: '', ...options, maxAge: 0 }),
    } as any,
    cookieOptions: { sameSite: 'lax' },
  });
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AuthCallbackPage({ searchParams }: Props) {
  const errorParam =
    normalizeParam(searchParams.error_description) ??
    normalizeParam(searchParams.error);
  if (errorParam) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Accesso non completato</h1>
        <p className="max-w-md text-sm text-neutral-600">
          Non è stato possibile completare il login: {String(errorParam)}.
          Prova a ripetere l&apos;autenticazione oppure contatta il supporto se il problema persiste.
        </p>
        <a
          href="/login"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Torna al login
        </a>
      </main>
    );
  }

  const code = normalizeParam(searchParams.code);
  if (!code) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Accesso non completato</h1>
        <p className="max-w-md text-sm text-neutral-600">
          Supabase non ha fornito il codice di autenticazione necessario.
          Chiudi la finestra e ripeti l&apos;operazione di login dal portale principale.
        </p>
      </main>
    );
  }

  const supabase = await getServerSupabase();

  try {
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    // @ts-expect-error: fallback per la firma alternativa supportata da supabase-js
    await supabase.auth.exchangeCodeForSession({ authCode: code });
  }

  redirect('/feed');
}
