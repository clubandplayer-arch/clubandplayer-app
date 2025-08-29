// lib/server/events.ts
// Broker in-memory per Server-Sent Events (SSE).
// Nota: in serverless non è garantita la persistenza cross-instance; in dev funziona.
// Per produzione reale usare un message bus esterno.

const g = globalThis as any;

type Client = {
  id: string;
  send: (payload: string) => void;
  close: () => void;
};

if (!g.__SSE_CLIENTS__) {
  g.__SSE_CLIENTS__ = new Map<string, Client>();
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function addClient(send: Client["send"], close: Client["close"]) {
  const id = uid();
  const client: Client = { id, send, close };
  g.__SSE_CLIENTS__.set(id, client);
  return id;
}

export function removeClient(id: string) {
  const client: Client | undefined = g.__SSE_CLIENTS__.get(id);
  if (client) {
    try {
      client.close();
    } catch {}
    g.__SSE_CLIENTS__.delete(id);
  }
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, c] of g.__SSE_CLIENTS__) {
    try {
      c.send(payload);
    } catch {
      g.__SSE_CLIENTS__.delete(c.id);
    }
  }
}
