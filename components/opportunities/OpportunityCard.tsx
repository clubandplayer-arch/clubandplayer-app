"use client";

import React from "react";
// Import RELATIVO (niente alias @/)
import { SyncBadge } from "../common/SyncBadge";

type SyncStatus =
  | "synced"
  | "outdated"
  | "conflict"
  | "local_edits"
  | "error"
  | "never_synced";

interface Opportunity {
  id: string;
  title: string;
  club?: { id: string; name?: string };
  clubName?: string;
  role?: string;
  level?: string;
  location?: { city?: string; province?: string; region?: string };
  expiresAt?: string;
  stipendRange?: { min?: number; max?: number; currency?: "EUR" | string };
  tags?: string[];
  syncStatus?: SyncStatus;
  lastSyncAt?: string;
  description?: string;
}

function formatCurrency(v?: number, currency: string = "EUR") {
  if (!v && v !== 0) return undefined;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const expires =
    opportunity.expiresAt ? new Date(opportunity.expiresAt) : undefined;

  return (
    <article className="border rounded-xl p-4 flex flex-col gap-2 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-tight">
            {opportunity.title}
          </h3>
          {(opportunity.club?.name || opportunity.clubName) && (
            <p className="text-sm text-neutral-600">
              {opportunity.club?.name || opportunity.clubName}
            </p>
          )}
        </div>
        <SyncBadge status={opportunity.syncStatus} />
      </div>

      <div className="text-sm text-neutral-700 flex flex-wrap gap-3">
        {opportunity.role && (
          <span>
            Ruolo: <strong>{opportunity.role}</strong>
          </span>
        )}
        {opportunity.level && (
          <span>
            Livello: <strong>{opportunity.level}</strong>
          </span>
        )}
        {opportunity.location?.city && (
          <span>
            📍 {opportunity.location.city}
            {opportunity.location?.province ? ` (${opportunity.location.province})` : ""}
          </span>
        )}
        {expires && (
          <span>
            Scade: <strong>{expires.toLocaleDateString()}</strong>
          </span>
        )}
        {opportunity.stipendRange?.min != null && (
          <span>Compenso da {formatCurrency(opportunity.stipendRange.min)}</span>
        )}
      </div>

      {opportunity.tags?.length ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {opportunity.tags.map((t) => (
            <span
              key={t}
              className="text-xs border rounded-full px-2 py-1 bg-neutral-50"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex justify-between items-center pt-2">
        <a
          href={`/opportunities/${opportunity.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          Dettagli
        </a>
        {opportunity.lastSyncAt && (
          <span className="text-xs text-neutral-500">
            sync: {new Date(opportunity.lastSyncAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </article>
  );
}
