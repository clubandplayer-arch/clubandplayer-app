// app/(dashboard)/applications/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

type ApplicationStatus = "pending" | "shortlisted" | "rejected" | "accepted" | string;

type Athlete = {
  id: string;
  display_name: string;
  city?: string | null;
  age?: number | null;
};

type ReceivedApplication = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  note?: string | null;
  athlete: Athlete;
  opportunity: {
    id: string;
    title: string;
    sport?: string | null;
    location_city?: string | null;
  };
};

async function getWhoAmI() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/auth/whoami`, {
    headers: { "cache-control": "no-store" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; email: string }>;
}

async function getProfile() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/me/profile`, {
    headers: { "cache-control": "no-store" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; type: "athlete" | "club"; display_name?: string }>;
}

async function getApplicationsReceived(): Promise<ReceivedApplication[]> {
  try {
    const res = await fetch(`/api/applications?scope=received`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.applications ?? []) as ReceivedApplication[];
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800 ring-gray-200",
    shortlisted: "bg-blue-100 text-blue-800 ring-blue-200",
    accepted: "bg-green-100 text-green-800 ring-green-200",
    rejected: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-800 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function ApplicationsReceivedPage() {
  const who = await getWhoAmI();
  if (!who) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/profile/onboarding");
  if (profile.type !== "club") {
    // Gli atleti vedono la pagina dedicata
    redirect("/applications/sent");
  }

  const applications = await getApplicationsReceived();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidature ricevute</h1>
          <p className="text-sm text-muted-foreground">Tutte le candidature arrivate alle tue opportunità.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/applications/sent" className="text-sm text-blue-600 hover:underline">
            Vai a “Inviate” (atleta)
          </Link>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-base font-medium">Nessuna candidatura ricevuta</p>
          <p className="text-sm text-muted-foreground">
            Pubblica una nuova opportunità per iniziare a ricevere candidature.
          </p>
          <div className="mt-4">
            <Link
              href="/opportunities/new"
              className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-accent"
            >
              + Crea opportunità
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Candidato</th>
                <th className="px-4 py-3 font-medium">Opportunità</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{a.athlete?.display_name ?? "Atleta"}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.athlete?.city ?? "—"} {a.athlete?.age ? `• ${a.athlete.age} anni` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link href={`/opportunities/${a.opportunity.id}`} className="font-medium hover:underline">
                        {a.opportunity.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {a.opportunity.sport ?? "Sport"} {a.opportunity.location_city ? `• ${a.opportunity.location_city}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground"
                        disabled
                        title="Solo UI in questa PR"
                      >
                        Vedi profilo
                      </button>
                      <button
                        className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground"
                        disabled
                        title="Solo UI in questa PR"
                      >
                        Shortlist
                      </button>
                      <button
                        className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground"
                        disabled
                        title="Solo UI in questa PR"
                      >
                        Rifiuta
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
