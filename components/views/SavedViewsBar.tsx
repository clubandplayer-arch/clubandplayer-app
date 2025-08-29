"use client";

import React, { useCallback } from "react";
import { useToast } from "@/components/common/ToastProvider";

type Props = {
  scope: "clubs" | "opportunities";
};

export default function SavedViewsBar({ scope }: Props) {
  const { show } = useToast();

  const onSaveCurrent = useCallback(() => {
    // placeholder: qui metterai la logica reale di salvataggio vista
    show({
      title: "Vista salvata",
      description: `Ho salvato la vista corrente per '${scope}'.`,
      tone: "success",
      durationMs: 2500,
    });
  }, [scope, show]);

  return (
    <div className="w-full border-b">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-medium">Saved views</span>
        <button
          type="button"
          onClick={onSaveCurrent}
          className="text-sm px-2 py-1 rounded border"
        >
          Save current
        </button>
      </div>
    </div>
  );
}
