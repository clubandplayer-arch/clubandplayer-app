export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DebugEnvPage() {
  const info = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    node: process.version,
    mode: process.env.VERCEL_ENV ?? 'local',
  };
  return <pre style={{ padding: 16 }}>{JSON.stringify(info, null, 2)}</pre>;
}
