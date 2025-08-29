// app/api/events/stream/route.ts
import { NextRequest } from "next/server";
import { addClient, removeClient } from "@/lib/server/events";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: string) => controller.enqueue(encoder.encode(payload));
      const close = () => controller.close();

      const id = addClient(send, close);

      // handshake + primo evento
      send('event: hello\ndata: {"ok":true}\n\n');

      // heartbeat
      const hb = setInterval(() => {
        send(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`);
      }, 15000);

      const teardown = () => {
        clearInterval(hb);
        removeClient(id);
        try {
          controller.close();
        } catch {}
      };

      // best-effort cleanup
      // @ts-expect-error not in types
      controller.error = teardown;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
