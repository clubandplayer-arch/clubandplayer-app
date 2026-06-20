import ProfileEditForm from "@/components/profiles/ProfileEditForm";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export default function InstitutionProfilePage() {
  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Modifica dati ente</h1>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Dati ente</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Compila o aggiorna le informazioni principali dell&apos;ente, inclusi
          foto profilo, località e sede.
        </p>
        <ProfileEditForm />
      </section>
    </main>
  );
}
