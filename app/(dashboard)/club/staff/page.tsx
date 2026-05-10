'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import useIsClub from '@/hooks/useIsClub';

type ApiStaffMember = {
  staffProfileId?: string;
  status?: string;
  staffRole?: string | null;
  staff?: {
    id?: string;
    fullName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    sport?: string | null;
    role?: string | null;
  };
};

type StaffMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  staffRole: string | null;
  sport: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  bio: string | null;
};

type StaffCategory = {
  title: string;
  roles: string[];
};

const STAFF_CATEGORIES: StaffCategory[] = [
  {
    title: 'Dirigenza e Amministrazione',
    roles: ['Presidente', 'Vicepresidente', 'Direttore Sportivo', 'Direttore Generale', 'Segretario'],
  },
  {
    title: 'Staff Tecnico e Campo',
    roles: ['Team Manager', 'Dirigente Accompagnatore', 'Allenatore', 'Vice Allenatore', 'Collaboratore Tecnico', 'Match Analyst', 'Video Analyst', 'Scout', 'Talent Scout'],
  },
  {
    title: 'Staff Medico e Performance',
    roles: ['Preparatore Atletico', 'Preparatore Portieri', 'Medico Sociale', 'Fisioterapista', 'Osteopata', 'Massaggiatore', 'Mental Coach', 'Nutrizionista'],
  },
  {
    title: 'Comunicazione e Media',
    roles: ['Addetto Stampa', 'Social Media Manager', 'Fotografo', 'Content Creator'],
  },
];

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'ST';
  const parts = trimmed.split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]).join('');
  return initials.toUpperCase().padEnd(2, 'S');
}

function normalizeRole(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export default function ClubStaffPage() {
  const { isClub, loading } = useIsClub();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    setError(null);
    try {
      const res = await fetch('/api/clubs/me/staff', { credentials: 'include', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || 'Errore nel caricare lo staff');

      const rows = Array.isArray((json as any)?.staff) ? (json as any).staff : [];
      const mapped: StaffMember[] = rows
        .map((row: ApiStaffMember) => {
          const profile = row?.staff ?? {};
          const id = row?.staffProfileId || profile?.id;
          if (!id) return null;
          const status = (row?.status || '').toLowerCase();
          if (status && status !== 'active') return null;
          const name = (profile.fullName || '').trim() || (profile.displayName || '').trim() || 'Staff';
          return {
            id: String(id),
            name,
            avatarUrl: profile.avatarUrl ?? null,
            staffRole: row.staffRole?.trim() || profile.role?.trim() || null,
            sport: profile.sport?.trim() || null,
            city: profile.city?.trim() || null,
            province: profile.province?.trim() || null,
            region: profile.region?.trim() || null,
            bio: profile.bio?.trim() || null,
          };
        })
        .filter(Boolean) as StaffMember[];

      setStaff(mapped);
    } catch (err: any) {
      setError(err?.message || 'Impossibile caricare lo staff');
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isClub) return;
    void loadStaff();
  }, [isClub, loading, loadStaff]);

  const categorized = useMemo(() => {
    const knownRoleToCategory = new Map<string, string>();
    STAFF_CATEGORIES.forEach((category) => {
      category.roles.forEach((role) => knownRoleToCategory.set(normalizeRole(role), category.title));
    });

    const grouped: Record<string, StaffMember[]> = {};
    STAFF_CATEGORIES.forEach((category) => {
      grouped[category.title] = [];
    });
    grouped['Altro Staff'] = [];

    staff.forEach((member) => {
      const normalized = normalizeRole(member.staffRole);
      const title = knownRoleToCategory.get(normalized) ?? 'Altro Staff';
      grouped[title].push(member);
    });

    STAFF_CATEGORIES.forEach((category) => {
      const roleOrder = new Map(category.roles.map((role, index) => [normalizeRole(role), index]));
      grouped[category.title].sort((a, b) => {
        const aIndex = roleOrder.get(normalizeRole(a.staffRole)) ?? 999;
        const bIndex = roleOrder.get(normalizeRole(b.staffRole)) ?? 999;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name, 'it');
      });
    });

    grouped['Altro Staff'].sort((a, b) => a.name.localeCompare(b.name, 'it'));

    return grouped;
  }, [staff]);

  if (loading) return <div className="p-6 text-sm text-neutral-600">Verifica permessi…</div>;

  if (!isClub) {
    return (
      <div className="page-shell max-w-2xl rounded-xl border bg-yellow-50 p-4 text-yellow-900">
        Devi essere un <b>Club</b> per gestire lo staff.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-semibold text-fuchsia-700">
          <MaterialIcon name="network" fontSize={16} />
          <span>Staff</span>
        </div>
        <h1 className="heading-h1">Staff</h1>
        <p className="text-sm text-neutral-600">Qui trovi i profili staff che hai collegato al tuo club.</p>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loadingStaff ? <div className="glass-panel p-4 text-sm text-neutral-700">Caricamento staff…</div> : null}

      {!loadingStaff && !error && staff.length === 0 ? (
        <div className="glass-panel space-y-2 p-5 text-sm text-neutral-700">
          <p className="font-semibold">Nessun membro dello staff ancora aggiunto.</p>
          <p>
            Vai su un profilo <Link href="/search?type=staff" className="underline">Staff</Link> e usa il pulsante
            <span className="mx-1 rounded-full bg-fuchsia-100 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700">Aggiungi allo Staff</span>
            per collegarlo al tuo club.
          </p>
        </div>
      ) : null}

      {!loadingStaff && staff.length > 0 ? (
        <div className="space-y-5">
          {STAFF_CATEGORIES.map((category) => {
            const members = categorized[category.title] ?? [];
            if (members.length === 0) return null;

            return (
              <section key={category.title} className="rounded-2xl border border-fuchsia-100 bg-white/80 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-fuchsia-800">{category.title}</h2>
                  <div className="h-px flex-1 bg-fuchsia-200" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <StaffCard key={member.id} member={member} onRemoved={loadStaff} />
                  ))}
                </div>
              </section>
            );
          })}

          {(categorized['Altro Staff'] ?? []).length > 0 ? (
            <section className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-700">Altro Staff</h2>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categorized['Altro Staff'].map((member) => (
                  <StaffCard key={member.id} member={member} onRemoved={loadStaff} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StaffCard({ member, onRemoved }: { member: StaffMember; onRemoved: () => void }) {
  const initials = getInitials(member.name);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await fetch('/api/clubs/me/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffProfileId: member.id, inStaff: false }),
      });
    } finally {
      setRemoving(false);
      onRemoved();
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/u/${member.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.name} className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-semibold text-fuchsia-700">{initials}</div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {member.staffRole ? <p className="text-xs font-semibold text-fuchsia-700">{member.staffRole}</p> : null}
          <p className="truncate text-sm font-semibold text-neutral-900">{member.name}</p>
          {member.sport ? <p className="text-xs text-neutral-600">{member.sport}</p> : null}
          {member.bio ? <p className="line-clamp-2 whitespace-pre-wrap text-xs text-neutral-700">{member.bio}</p> : null}
        </div>
      </Link>
      <button type="button" onClick={handleRemove} disabled={removing} className="rounded-md border border-fuchsia-200 px-2 py-1 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-60">
        {removing ? 'Rimozione…' : 'Rimuovi'}
      </button>
    </div>
  );
}
