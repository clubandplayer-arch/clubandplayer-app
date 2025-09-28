// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

// Semplifichiamo i tipi per evitare mismatch tra generics delle librerie
let _client: any = null

export function getSupabaseBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}
