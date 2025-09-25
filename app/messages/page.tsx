'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Row = {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
};

type Conversation = {
  peerId: string;
  peerName: string | null;
  lastText: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
};

export default function MessagesHome() {
  const supabase = supabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [peerNames, setPeerNames] = useState<Record<string, string | null>>({});
  const [lastRead, setLastRead] = useState<Record<string, string>>({}); // peerId -> ISO string
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    const u = await supabase.auth.getUser();
    if (u.error || !u.data.user) {
      setMsg('Devi accedere per vedere i messaggi.');
      setLoading(false);
      return;
    }
    const me = u.data.user.id;
    setUserId(me);

    // ultimi messaggi
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, text, created_at')
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      .order('created_at', { ascending: false })
      .limit(400);

    if (error) {
      setMsg(`Errore: ${error.message}`);
      setLoading(false);
      return;
    }
    const rowsData = (data ?? []) as Row[];
    setRows(rowsData);

    // peers
    const peers = Array.from(
      new Set(rowsData.map((r) => (r.sender_id === me ? r.receiver_id : r.sender_id))),
    );
    if (peers.length > 0) {
      const [{ data: profs }, { data: reads }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', peers),
        supabase.from('message_reads').select('peer_id, last_read_at').eq('user_id', me),
      ]);
      const names: Record<string, string | null> = Object.fromEntries(
        (profs ?? []).map((p) => [p.id as string, (p as { full_name: string | null }).full_name]),
      );
      setPeerNames(names);

      const lr: Record<string, string> = {};
      for (const r of (reads ?? []) as { peer_id: string; last_read_at: string }[]) {
        lr[r.peer_id] = r.last_read_at;
      }
      setLastRead(lr);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // aggiorna lista quando arriva un messaggio
  useEffect(() => {
    const onUnread = () => {
      void load();
    };
    window.addEventListener('app:unread-updated', onUnread);
    return () => window.removeEventListener('app:unread-updated', onUnread);
  }, [load]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!userId) return [];
    const map = new Map<string, Conversation>();
    const lr = lastRead;

    // Calcola unread per peer: conta i messaggi dove sono receiver e created_at > last_read_at
    for (const r of rows) {
      const peer = r.sender_id === userId ? r.receiver_id : r.sender_id;
      const current = map.get(peer);
      const lastReadAt = lr[peer] ? new Date(lr[peer]).getTime() : 0;
      const isUnreadForMe =
        r.receiver_id === userId && new Date(r.created_at).getTime() > lastReadAt;

      if (!current) {
        map.set(peer, {
          peerId: peer,
          peerName: peerNames[peer] ?? null,
          lastText: r.text,
          lastAt: r.created_at,
          lastFromMe: r.sender_id === userId,
          unread: isUnreadForMe ? 1 : 0,
        });
      } else {
        // accumula gli unread
        if (isUnreadForMe) current.unread += 1;
      }
    }
    return Array.from(map.values());
  }, [rows, userId, peerNames, lastRead]);

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1>Messaggi</h1>
      {msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
      {loading && <p>Caricamento…</p>}
      {!loading && conversations.length === 0 && (
        <p>Nessuna conversazione. Apri un profilo e clicca “Messaggia →”.</p>
      )}

      <ul style={{ display: 'grid', gap: 12 }}>
        {conversations.map((c) => (
          <li key={c.peerId} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.peerName ? (
                    c.peerName
                  ) : (
                    <>
                      Utente: <code>{c.peerId}</code>
                    </>
                  )}
                  {c.unread > 0 && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: 9999,
                        padding: '2px 8px',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <div style={{ opacity: 0.8, fontSize: 14 }}>
                  {c.lastFromMe ? 'Tu: ' : ''}
                  {c.lastText}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(c.lastAt).toLocaleString()}
                </div>
              </div>
              <div style={{ alignSelf: 'center' }}>
                <Link href={`/messages/${c.peerId}`}>Apri chat →</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
