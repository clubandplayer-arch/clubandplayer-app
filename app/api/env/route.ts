export const dynamic = 'force-dynamic'
export const revalidate = 0

function supabaseProjectRef(value?: string): string | null {
  if (!value) return null
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serverUrl = process.env.SUPABASE_URL
  const publicProjectRef = supabaseProjectRef(publicUrl)
  const serverProjectRef = supabaseProjectRef(serverUrl)

  return new Response(
    JSON.stringify({
      hasUrl: !!publicUrl,
      hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      publicProjectRef,
      serverProjectRef,
      serverUrlSource: serverUrl ? 'SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL_FALLBACK',
      projectRefsMatch: publicProjectRef !== null && publicProjectRef === serverProjectRef,
      anonKeysMatch: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        && process.env.SUPABASE_ANON_KEY
        && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_ANON_KEY,
      ),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      mode: process.env.VERCEL_ENV ?? 'local',
    }, null, 2),
    { headers: { 'content-type': 'application/json' } }
  )
}
