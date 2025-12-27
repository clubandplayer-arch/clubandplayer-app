'use client';

import { useMemo, useState } from 'react';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import ChatFloatingButton from '@/components/messaging/ChatFloatingButton';
import { DirectMessageInbox } from '@/components/messaging/DirectMessageInbox';
import { DirectMessageThread } from '@/components/messaging/DirectMessageThread';
import type { DirectThreadSummary } from '@/lib/services/messaging';

type DockState = 'closed' | 'list' | 'thread';

export function MessagingDock() {
  const [dockState, setDockState] = useState<DockState>('closed');
  const [activeThread, setActiveThread] = useState<DirectThreadSummary | null>(null);

  const openList = () => setDockState('list');
  const closeDock = () => {
    setDockState('closed');
    setActiveThread(null);
  };

  const handleThreadSelect = (thread: DirectThreadSummary) => {
    setActiveThread(thread);
    setDockState('thread');
  };

  const handleCloseThread = () => {
    setDockState('list');
    setActiveThread(null);
  };

  const panelWidths = useMemo(
    () => 'w-full max-w-[360px] md:max-w-[380px] lg:max-w-[400px]',
    [],
  );

  const activeThreadTitle =
    activeThread?.other?.full_name?.trim?.() ||
    activeThread?.other?.display_name?.trim?.() ||
    'Senza nome';

  return (
    <div className="hidden md:block">
      <ChatFloatingButton onClick={dockState === 'closed' ? openList : closeDock} />

      {dockState !== 'closed' && (
        <div className={`fixed bottom-0 right-0 top-16 z-40 ${panelWidths}`}>
          <div className="flex h-full flex-col rounded-tl-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                  <MaterialIcon name="mail" fontSize="small" />
                </span>
                <div className="text-sm font-semibold text-neutral-900">Messaggi</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDock}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Chiudi dock messaggi"
                >
                  <MaterialIcon name="close" fontSize="small" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden px-4 pb-4">
              <DirectMessageInbox
                hideHeader
                className="h-full border-0 bg-white p-0 shadow-none"
                onSelectThread={handleThreadSelect}
              />
            </div>
          </div>
        </div>
      )}

      {dockState === 'thread' && activeThread && (
        <div
          className="fixed bottom-0 right-[360px] z-40 hidden flex h-[60vh] w-full max-w-[520px] flex-col overflow-hidden md:block md:right-[380px] md:max-h-[65vh] lg:right-[400px]"
        >
          <DirectMessageThread
            targetProfileId={activeThread.otherProfileId}
            targetDisplayName={activeThreadTitle}
            targetAvatarUrl={activeThread.otherAvatarUrl}
            layout="dock"
            onClose={handleCloseThread}
            className="h-full max-h-full"
          />
        </div>
      )}
    </div>
  );
}
