"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "default" | "success" | "error" | "warning" | "info";
type Toast = {
  id: string;
  title?: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextType = {
  show: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, durationMs: 3000, tone: "default", ...t };
    setToasts((prev) => [...prev, toast]);
    const ms = toast.durationMs!;
    if (ms! > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, ms);
    }
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* container */}
      <div className="fixed z-[1000] top-4 right-4 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto min-w-[260px] max-w-[360px] rounded-2xl border shadow bg-white p-3"
            role="status"
            aria-live="polite"
          >
            <div className="text-sm font-medium">
              {iconForTone(t.tone)} {t.title}
            </div>
            {t.description ? (
              <div className="mt-1 text-sm text-gray-600">{t.description}</div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function iconForTone(tone: ToastTone = "default") {
  const map: Record<ToastTone, string> = {
    default: "🔔",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  return <span className="mr-1">{map[tone]}</span>;
}
