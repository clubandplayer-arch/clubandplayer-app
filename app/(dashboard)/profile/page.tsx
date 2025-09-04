import AuthGuard from '@/components/auth/AuthGuard';
import AvatarUploader from '@/components/AvatarUploader';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <main className="max-w-xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">Profilo</h1>
        <AvatarUploader />
      </main>
    </AuthGuard>
  );
}
