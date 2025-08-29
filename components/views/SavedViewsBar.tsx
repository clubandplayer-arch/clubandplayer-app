"use client";

/**
 * Barra minimale per gestire "Saved Views".
 */

import { useEffect, useMemo, useState } from "react";
// IMPORT RELATIVO al provider
import { useToast } from "../common/ToastProvider";

type View = {
  id: string;
  name: string;
  params: Record<string, unknown>;
};

export default function SavedViewsBar() {
  const toastApi = useToast() as any;
  const notify = (opts: any) => {
    if (toastApi?.toast) return toastApi.toast(opts);
    if (toastApi?.show) return toastApi.show(opts);
    if (toastApi?.add) return toastApi.add(opts);
    if (typeof toastApi === "function") return toastApi(opts);
    return void 0;
  };

  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch("/api/views")
      .then((r) => r.json())
      .then((data: View[]) => {
        if (isMounted) setViews(data);
      })
      .catch(() => {
        notify({ title: "Errore caricamento viste", variant: "destructive" });
      })
      .finally(() => setLoading(false));
    return () => {
      isMounted = false;
    };
  }, []); // notify non è critico qui

  const hasViews = useMemo(() => views.length > 0, [views]);

  const saveView = async () => {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Vista ${views.length + 1}`,
        params: { example: true },
      }),
    });
    if (!res.ok) {
      notify({ title: "Errore salvataggio", variant: "destructive" });
      return;
    }
    const saved = (await res.json()) as View;
    setViews((prev) => [saved, ...prev]);
    notify({ title: "Vista salvata", description: saved.name });
  };

  return (
    <div className="w-full border rounded-xl p-3 mb-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Saved Views</h3>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          onClick={saveView}
          disabled={loading}
        >
          Salva vista
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">Caricamento…</div>}

      {!loading && !hasViews && (
        <div className="text-sm text-gray-500">Nessuna vista salvata.</div>
      )}

      {!loading && hasViews && (
        <ul className="flex flex-wrap gap-2">
          {views.map((v) => (
            <li key={v.id}>
              <span className="text-sm px-2 py-1 rounded-lg border inline-block">
                {v.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
