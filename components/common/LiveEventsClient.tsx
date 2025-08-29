"use client";

/**
 * Client SSE che si collega a /api/events/stream
 * e mostra toast sugli eventi principali.
 */

import { useEffect } from "react";
import { useToast } from "@/components/common/ToastProvider";

type Props = {
  /** opzionale: disabilita i toast */
  silent?: boolean;
};

export default function LiveEventsClient({ silent }: Props) {
  const { toast } = useToast();

  useEffect(() => {
    const es = new EventSource("/api/events/stream");

    es.addEventListener("ready", (evt) => {
      if (!silent) {
        toast({
          title: "Live updates attive",
          description: "Connessione agli eventi stabilita.",
        });
      }
    });

    es.addEventListener("ping", () => {
      // niente toast per i ping — sono solo keep-alive
    });

    es.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);
        if (!silent) {
          toast({
            title: "Nuovo evento",
            description: JSON.stringify(data),
          });
        }
      } catch {
        /* ignore parse error */
      }
    });

    es.onerror = () => {
      if (!silent) {
        toast({
          title: "Connessione live interrotta",
          description: "Riprovo automaticamente…",
          variant: "destructive",
        });
      }
      // EventSource tenta il retry automaticamente
    };

    return () => {
      es.close();
    };
  }, [silent, toast]);

  // Non rende nulla a schermo, è solo side-effect
  return null;
}
