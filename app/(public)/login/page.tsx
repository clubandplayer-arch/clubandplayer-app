import SocialLogin from '@/components/auth/SocialLogin';

export const metadata = {
  title: 'Accedi – Club & Player',
};

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Accedi</h1>
      <div className="space-y-4">
        <SocialLogin />
        {/* qui eventualmente i campi email/password o magic-link */}
      </div>
    </main>
  );
}
