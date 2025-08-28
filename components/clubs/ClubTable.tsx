"use client";

// Tabella Club con badge di sincronizzazione.
// Import RELATIVO per evitare errori con alias @/

import React from "react";
import { SyncBadge } from "../common/SyncBadge";

type SyncStatus =
  | "synced"
  | "outdated"
  | "conflict"
  | "local_edits"
  | "error"
  | "never_synced";

interface Club {
  id: string;
  name: string;
  city?: string;
  province?: string;
  region?: string;
  level?: "Pro" | "Dilettanti" | "Giovanili" | "Scuola Calcio" | string;
  badges?: Array<"verified" | "partner" | "premium" | string>;
  logoUrl?: string;
  lastSyncAt?: string;
  syncStatus?: SyncStatus;
}

interface Props {
  items: Club[];
  total: number;
}

export default function ClubTable({ items, total }: Props) {
  return (
    <div className="w-full overflow-auto border rounded-2xl bg-white">
      <table className="min-w-[800px] w-full text-sm">
        <thead>
          <tr className="text-left border-b bg-neutral-50">
            <th className="p-3 font-medium">Nome</th>
            <th className="p-3 font-medium">Località</th>
            <th className="p-3 font-medium">Livello</th>
            <th className="p-3 font-medium">Badge</th>
            <th className="p-3 font-medium">Sync</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b hover:bg-neutral-50">
              <td className="p-3">
                <a
                  href={`/clubs/${c.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {c.name}
                </a>
              </td>
              <td className="p-3">
                {c.city}
                {c.province ? ` (${c.province})` : ""} • {c.region}
              </td>
              <td className="p-3">{c.level || "—"}</td>
              <td className="p-3">
                {c.badges && c.badges.length > 0 ? c.badges.join(", ") : "—"}
              </td>
              <td className="p-3">
                <SyncBadge status={c.syncStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-neutral-500 p-3">Totale: {total}</div>
    </div>
  );
}
