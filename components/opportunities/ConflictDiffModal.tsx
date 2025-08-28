"use client";

/**
 * Modal per la risoluzione dei conflitti di sincronizzazione.
 * Rispetta la regola react-hooks: gli hook sono chiamati prima di ogni return.
 * REPLACE FULL FILE.
 */

import { useState } from "react";
import type { Opportunity } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  remote: Opportunity;
  local: Opportunity;
  onResolve: (strategy: "keepLocal" | "takeRemote" | "merge") => void;
}

export default function ConflictDiffModal({
  open,
  onClose,
  remote,
  local,
  onResolve,
}: Props) {
  // Hook SEMPRE in testa (prima di qualsiasi return condizionale)
  const [tab, setTab] = useState<"remote" | "local" | "merge">("remote");

  if (!open) return null;

  const current =
    tab === "remote" ? remote : tab === "local" ? local : { ...remote, ...local };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Conflitto di sincronizzazione</h3>
          <button onClick={onClose} className="text-neutral-600" aria-label="Chiudi">
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 border rounded ${
              tab === "remote" ? "bg-neutral-100" : ""
            }`}
            onClick={() => setTab("remote")}
          >
            Remote
          </button>
