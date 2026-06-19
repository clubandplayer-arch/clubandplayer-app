import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function StaffProfilePage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Il mio profilo Staff</h1>
      <p className="text-sm text-gray-600">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
      <ProfileEditForm />
    </div>
  );
}
