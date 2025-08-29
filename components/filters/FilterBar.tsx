"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function FilterBar({ scope }: { scope: "opportunities" | "clubs" }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, val: string) {
    const next = new URLSearchParams(sp.toString());
    if (val) next.set(key, val);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const region = sp.get("region") ?? "";
  const level = sp.get("level") ?? "";
  const role = sp.get("role") ?? "";

  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 flex-wrap items-end">
        <span className="text-xs text-gray-500 mr-2">Filtri ({scope})</span>

        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Regione</span>
          <input
            className="border rounded-xl px-3 py-2"
            value={region}
            onChange={(e) => setParam("region", e.target.value)}
            placeholder="es. Lazio"
          />
        </label>

        {scope === "clubs" ? (
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Livello</span>
            <input
              className="border rounded-xl px-3 py-2"
              value={level}
              onChange={(e) => setParam("level", e.target.value)}
              placeholder="es. Dilettanti"
            />
          </label>
        ) : (
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">Ruolo</span>
            <input
              className="border rounded-xl px-3 py-2"
              value={role}
              onChange={(e) => setParam("role", e.target.value)}
              placeholder="es. Coach"
            />
          </label>
        )}

        <button
          className="ml-auto px-3 py-2 rounded-xl border"
          onClick={() => router.replace(pathname)}
          title="Pulisci filtri"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
