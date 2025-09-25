export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return new Response(
    JSON.stringify(
      {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? null,
        sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        mode: process.env.VERCEL_ENV ?? 'local',
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/json' } },
  );
}
