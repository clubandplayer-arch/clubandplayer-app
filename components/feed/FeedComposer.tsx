'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';

type Role = 'athlete' | 'club' | 'guest';

export default function FeedComposer() {
  const [role, setRole] = useState<Role>('guest');
  const [openOpp, setOpenOpp] = useState(false);

  // Chi sono?
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (c) return;
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'athlete' || raw === 'club' ? raw : 'guest');
      } catch {
        if (!c) setRole('guest');
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder={
            role === 'club'
              ? 'Scrivi un aggiornamento per i tuoi follower…'
              : 'Condividi un aggiornamento…'
          }
          disabled
        />
      </div>

      <div className="mt-3 flex gap-2 text-xs">
        <button className="rounded-lg border px-2 py-1" disabled>
          Post
        </button>
        {role === 'club' && (
          <button
            type="button"
            onClick={() => setOpenOpp(true)}
            className="rounded-lg border px-2 py-1"
          >
            Crea opportunità
          </button>
        )}
      </div>

      {/* Modale: Crea Opportunità (solo club) */}
      {role === 'club' && (
        <Modal open={openOpp} title="Nuova opportunità" onClose={() => setOpenOpp(false)}>
          <OpportunityForm
            onCancel={() => setOpenOpp(false)}
            onSaved={(saved) => {
              setOpenOpp(false);
              try {
                // trigger ricarica feed lato client
                window.dispatchEvent(new CustomEvent('cp:opportunity-created', { detail: saved }));
              } catch {}
              // redirect diretto al dettaglio appena creato
              if (saved?.id) window.location.href = `/opportunities/${saved.id}`;
            }}
          />
        </Modal>
      )}
    </div>
  );
}
