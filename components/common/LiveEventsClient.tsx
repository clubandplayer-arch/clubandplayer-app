/* eslint-disable @typescript-eslint/no-unused-vars, no-empty */
"use client";

- import React, { useEffect } from "react";
+ import { useEffect } from "react";

/**
 * Client SSE per /api/events/stream.
 * Mostra toast su "sync.completed".
 */
export default function LiveEventsClient() {
  const { show } = useToast();

  useEffect(() => {
    const es = new EventSource("/api/events/stream");

    es.addEventListener("hello", () => {
      // opzionale: show({ title: "Live connesso", description: "SSE attivo", tone: "success" });
    });

    es.addEventListener("ping", () => {
      // heartbeat
    });

    es.addEventListener("sync.completed", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data || "{}");
        const count = Array.isArray(data?.ids) ? data.ids.length : 0;
        show({
          title: "Sincronizzazione completata",
          description: `${data?.entity ?? "n/a"} aggiornati: ${count}`,
          tone: "success",
        });
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      // opzionale: show({ title: "Live disconnesso", description: "Riconnessione…", tone: "error" });
    };

    return () => {
      try {
        es.close();
      } catch {}
    };
  }, [show]);

  return null;
}
