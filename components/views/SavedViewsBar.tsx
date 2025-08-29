"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/common/ToastProvider";

type Scope = "clubs" | "opportunities";

type Props = {
  scope: Scope;
};

type SavedView = {
  id: string;
  name: string;
  /** Querystring completo (es: "?q=roma&country=IT&scope=opportunities") */
  params: string;
  createdAt: number;
};

const storageKey = (scope: Scope) => `saved_views:${scope}`;

export default function SavedViewsBar({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { success, info } = useToast();

  const [name, setName] = useState("");
  const [list, setList] = useState<SavedView[]>([]);

  // Inizializza elenco da localStorage per lo scope corrente
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(scope));
      setList(raw ? (JSON.parse(raw) as SavedView[]) : []);
    } catch {
      setList([]);
    }
  }, [scope]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setList(next);
      try {
        localStorage.setItem(storageKey(scope), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [scope]
  );

  // Parametri correnti (includi sempre scope per coerenza)
  const currentParams = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.set("scope", scope);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [sp, scope]);

  const onSaveCurrent = useCallback(() => {
    const displayName = name.trim() || new Date().toLocaleString();
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: displayName,
      params: currentParams,
      createdAt: Date.now(),
    };
    const next = [view, ...list].slice(0, 20); // tieni al massimo 20 viste
    persist(next);
    setName("");
    success("", {
      title: "Vista salvata",
      description: `“${displayName}” (${scope})`,
      duration: 2500,
    });
  }, [name, currentParams, list, persist, scope, success]);

  const onApply = useCallback(
    (v: SavedView) => {
      router.replace(`${pathname}${v.params}`, { scroll: false });
      info("", {
        title: "Vista applicata",
        description: v.name,
        duration: 2000,
      });
    },
    [router, pathname, info]
  );

  const onDelete = useCallback(
    (id: string) => {
      const next = list.filter((x) => x.id !== id);
      persist(next);
      info("", { title: "Vista eliminata", duration: 1600 });
    },
    [list, persist, info]
  );

  if (!pathname) return null;

  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center">
        <span className="text-sm font-medium text-slate-600">
          Saved views — <span className="font-semibold">{scope}</span>
        </span>

        {/* Input + Salva */}
        <div className="flex items-center gap-2 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome vista (es. Roma + IT)"
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="button"
            onClick={onSaveCurrent}
            className="text-sm px-3 py-2 rounded-lg border hover:bg-slate-50"
          >
            Salva vista
          </button>
        </div>

        {/* Elenco viste salvate */}
        {list.length > 0 ? (
          <div className="w-full md:w-auto flex flex-wrap gap-2">
            {list.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-1 rounded-full border px-2 py-1 text-sm"
                title={v.params}
              >
                <button
                  type="button"
                  onClick={() => onApply(v)}
                  className="px-2 py-0.5 hover:underline"
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(v.id)}
                  className="rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                  aria-label={`Elimina ${v.name}`}
                  title="Elimina"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Nessuna vista salvata</div>
        )}
      </div>
    </div>
  );
}
