/* eslint-disable no-console */
/**
 * SSE endpoint minimale per notifiche lato client.
 * Invia un ping ogni 25s e chiude correttamente sullo stop della richiesta.
 */

export const dynamic = 'force-dynamic'; // Evita cache su Vercel/Next
export const revalidate = 0;

export async function GET(request: Request): Promise<Response> {
  const { signal } = request;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // helper per inviare un evento SSE
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // messaggio di benvenuto
      send('ready', { ok: true });

      // ping periodico per tenere aperta la connessione
      const pingId = setInterval(() => {
        send('ping', { t: Date.now() });
      }, 25_000);

      // chiudi se l'utente abbandona
      signal.addEventListener('abort', () => {
        clearInterval(pingId);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disaccoppia da edge cache/governance intermedi
      'X-Accel-Buffering': 'no',
    },
  });
}
