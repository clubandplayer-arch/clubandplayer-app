'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Fav = { id: string; opportunity_id: string; created_at: string };
type Opp = { id: string; title: string; club_name: string; city: string; role: string };

export default function FavoritesPage() {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState<(Opp & { fav_id: string; saved_at: string })[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg('');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg('Devi effettuare il login.');
        setLoading(false);
        return;
      }

      // 1) preferiti dell’utente
      const { data: favs, error: e1 } = await supabase
        .from('favorites')
        .select('id, opportunity_id, created_at')
        .order('created_at', { ascending: false });
      if (e1) {
        setMsg(`Errore preferiti: ${e1.message}`);
        setLoading(false);
        return;
      }

      const rows = (favs ?? []) as Fav[];
      if (rows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2) dettagli opportunità
      const oppIds = rows.map((f) => f.opportunity_id);
      const { data: opps, error: e2 } = await supabase
        .from('opportunities')
        .select('id, title, club_name, city, role')
        .in('id', oppIds);
      if (e2) {
        setMsg(`Errore opportunità: ${e2.message}`);
        setLoading(false);
        return;
      }

      const byId = Object.fromEntries((opps ?? []).map((o) => [o.id, o as Opp]));
      const merged = rows
        .map((f) => {
          const o = byId[f.opportunity_id];
          if (!o) return null;
          return { ...o, fav_id: f.id, saved_at: f.created_at };
        })
        .filter(Boolean) as (Opp & { fav_id: string; saved_at: string })[];

      setItems(merged);
      setLoading(false);
    };
    void load();
  }, [supabase]);

  const removeFavorite = async (favId: string) => {
    setMsg('');
    const { error } = await supabase.from('favorites').delete().eq('id', favId);
    if (error) {
      setMsg(`Errore rimozione: ${error.message}`);
      return;
    }
    setItems((prev) => prev.filter((i) => i.fav_id !== favId));
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>I miei preferiti</h1>
      {msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && items.length === 0 && <p>Nessun annuncio salvato.</p>}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {items.map((i) => (
          <div
            key={i.fav_id}
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{i.title}</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  {i.club_name} — {i.city} — Ruolo: {i.role}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Salvato: {new Date(i.saved_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link href="/opportunities">Vai al feed →</Link>
                <button
                  onClick={() => removeFavorite(i.fav_id)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
