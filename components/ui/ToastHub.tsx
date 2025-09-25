'use client';

import { useEffect, useRef, useState } from 'react';

export type ToastItem = {
  id: number;
  type?: 'success' | 'error' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

const EVENT_NAME = 'app:toast';

export default function ToastHub() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  useEffect(() => {
    function onEvt(e: Event) {
      const ce = e as CustomEvent<Partial<ToastItem>>;
      const detail = ce.detail || {};
      const id = idRef.current++;
      const item: ToastItem = {
        id,
        type: detail.type ?? 'success',
        message: detail.message ?? '',
        actionLabel: detail.actionLabel,
        onAction: detail.onAction,
        durationMs: detail.durationMs ?? 3200,
      };
      setToasts((prev) => [...prev, item]);

      // auto dismiss
      const t = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, item.durationMs);
      return () => clearTimeout(t);
    }

    window.addEventListener(EVENT_NAME, onEvt as EventListener);
    return () => window.removeEventListener(EVENT_NAME, onEvt as EventListener);
  }, []);

  return (
    <>
      {/* Aria-live per tecnologie assistive */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {toasts.length > 0 ? toasts[toasts.length - 1].message : ''}
      </div>

      {/* Stack visivo dei toast */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4 sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={[
              'pointer-events-auto rounded-xl border px-3 py-2 shadow',
              'bg-white dark:bg-neutral-900',
              'dark:border-neutral-700',
              t.type === 'success' && 'border-green-300',
              t.type === 'error' && 'border-red-300',
              t.type === 'info' && 'border-neutral-300',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-block h-2.5 w-2.5 rounded-full',
                  t.type === 'success' && 'bg-green-500',
                  t.type === 'error' && 'bg-red-500',
                  t.type === 'info' && 'bg-neutral-500',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate">{t.message}</div>
                {t.actionLabel && t.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        t.onAction?.();
                      } finally {
                        setToasts((prev) => prev.filter((x) => x.id !== t.id));
                      }
                    }}
                    className="mt-1 rounded-md border px-2 py-0.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
