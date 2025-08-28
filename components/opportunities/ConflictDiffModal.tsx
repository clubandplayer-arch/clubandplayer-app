"use client";

/**
 * Modal per risolvere conflitti di sincronizzazione.
 * FILE COMPLETO — REPLACE FULL.
 * (Hook sempre dichiarati prima di qualsiasi return condizionale)
 */

import React, { useState } from "react";
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
  // Hook SEMPRE in testa
  const [tab, setTab] = useState<"remote" | "local" | "merge">("remote");

  // Early return (ora è lecito perché l'hook è già stato chiamato)
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
              tab === "remote" ? "bg-neutr
