'use client';

import ProfileHeader from '@/components/profiles/ProfileHeader';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <ProfileHeader expectedType="club" /> {/* titolo dinamico */}
      <ProfileEditForm />
    </main>
  );
}
