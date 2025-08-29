"use client";

import { useEffect, useCallback } from "react";
import { useToast } from "./ToastProvider";

type Props = { silent?: boolean };

export default function LiveEventsClient({ silent }: Props) {
  const toastApi = useToast() as any;

  const notify = useCallback((opts: any) => {
    if (toastApi?.toast) return toastApi.toast(opts);
    if (toastApi?.show) return toastApi.show(opts);
    if (toastApi?.add) return toastApi.add(opts);
    if (typeof toastApi === "function") return toastApi(opts);
  }, [toastApi]);

  useEffect(() => {
    const es = new EventSource("/api/events/stream");

    es.addEventListener("ready", () => {
      if (!silent) {
        notify({
          title: "Live updates attive",
          description: "Connessione agli eventi stabilita.",
        });
      }
    });

    es.addEventListener("ping", () => {
      // keep-alive
    });

    es.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);
        if (!silent) {
          notify({
            title: "Nuovo evento",
            description: JSON.stringify(data),
          });
        }
      } catch {
        /* ignore */
      }
    });

    es.onerror = () => {
      if (!silent) {
        notify({
          title: "Connessione live interrotta",
          description: "Riprovo automaticamente…",
          variant: "destructive",
        });
      }
    };

    return () => es.close();
  }, [silent, notify]);

  return null;
}
