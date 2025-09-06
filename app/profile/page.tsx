import AvatarUploader from '@/components/AvatarUploader';

export const runtime = 'nodejs'; // restiamo su node per coerenza con auth SSR

export default function ProfilePage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profilo</h1>
      <AvatarUploader />
    </main>
  );
}
