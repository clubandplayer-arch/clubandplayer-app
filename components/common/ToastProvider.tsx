"use client";

/**
 * ToastProvider + useToast
 * - Nessuna dipendenza esterna
 * - Portal su <body>
 * - API: const { show } = useToast(); show({ title, description?, tone?, durationMs? })
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: "default" | "success" | "error";
  durationMs?: number;
};

type ToastContextValue = {
  show: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, durationMs: 3500, tone: "default", ...t };
    setToasts((prev) => [...prev, toast]);
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, toast.durationMs);
    return () => clearTimeout(timeout);
  }, []);

  const ctx = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={
                  "min-w-[260px] max-w-[420px] rounded-xl border px-4 py-3 shadow-md text-sm bg-white " +
                  (t.tone === "success"
                    ? "border-green-200"
                    : t.tone === "error"
                    ? "border-rose-200"
                    : "border-gray-200")
                }
              >
                <div className="font-semibold mb-0.5">{t.title}</div>
                {t.description && (
                  <div className="text-gray-600">{t.description}</div>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
