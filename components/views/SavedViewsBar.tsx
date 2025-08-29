/* eslint-disable no-empty */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/common/ToastProvider";

type View = {
  id: string;
  name: string;
  scope: "opportunities" | "clubs";
  queryString: string;
  createdAt: string;
};

function useLocalSubscriptions() {
  const key = "saved_views_subscriptions";
  const [subs, setSubs] = useState<Record<string, true>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSubs(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (next: Record<string, true>) => {
    setSubs(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const isSubscribed = (id: string) => !!subs[id];
  const add = (id: string) => save({ ...subs, [id]: true });
  const remove = (id: string) => {
    const c = { ...subs };
    delete (c as any)[id];
    save(c);
  };

  return { isSubscribed, add, remove };
}

export default function SavedViewsBar({ scope }: { scope: "opportunities" | "clubs" }) {
  const [views, setViews] = useState<View[]>([]);
  const [sel, setSel] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const { show } = useToast();
  const { isSubscribed, add, remove } = useLocalSubscriptions();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/views", { cache: "no-store" });
      const json = await res.json();
      const all: View[] = Array.isArray(json?.items) ? json.items : [];
      setViews(all.filter((v) => v.scope === scope));
    })();
  }, [scope]);

  const currentView = useMemo(() => views.find((v) => v.id === sel), [sel, views]);

  function applyView(v: View) {
    const qs = v.queryString.startsWith("?") ? v.queryString.slice(1) : v.queryString;
    router.replace(`${pathname}?${qs}`);
    show({ title: "Vista applicata", description: v.name, tone: "success" });
  }

  async function subscribe(v: View) {
    try {
      const res = await fetch(`/api/views/${v.id}/subscribe`, { method: "POST" });
      if (!res.ok) throw new Error("Subscribe failed");
      add(v.id);
      show({ title: "Sottoscritto", description: v.name, tone: "success" });
    } catch (e: any) {
      show({ title: "Errore sottoscrizione", description: e?.message ?? "Imprevisto", tone: "error" });
    }
  }

  async function unsubscribe(v: View) {
    try {
      const res = await fetch(`/api/views/${v.id}/unsubscribe`, { method: "POST" });
      if (!res.ok) throw new Error("Unsubscribe failed");
      remove(v.id);
      show({ title: "Disiscritto", description: v.name, tone: "default" });
    } catch (e: any) {
      show({ title: "Errore disiscrizione", description: e?.message ?? "Imprevisto", tone: "error" });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3">
      <div className="flex items-end gap-2">
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Saved views</span>
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="border rounded-xl px-3 py-2 min-w-[260px]"
          >
            <option value="">Scegli una vista…</option>
            {views.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        {currentView && (
          <>
            <button
              className="px-3 py-2 rounded-xl border"
              onClick={() => applyView(currentView)}
              title="Applica la vista selezionata"
            >
              Applica
            </button>

            {!isSubscribed(currentView.id) ? (
              <button
                className="px-3 py-2 rounded-xl border"
                onClick={() => subscribe(currentView)}
                title="Ricevi notifiche su questa vista"
              >
                Subscribe
              </button>
            ) : (
              <button
                className="px-3 py-2 rounded-xl border"
                onClick={() => unsubscribe(currentView)}
                title="Interrompi notifiche su questa vista"
              >
                Unsubscribe
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
