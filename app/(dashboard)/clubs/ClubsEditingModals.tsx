'use client';

import dynamic from 'next/dynamic';

import type { Club } from '@/types/club';

type Props = {
  openCreate: boolean;
  onCloseCreate: () => void;
  editClub: Club | null;
  onCloseEdit: () => void;
  onReload: () => void;
};

const Modal = dynamic(() => import('@/components/ui/Modal'));
const ClubForm = dynamic(() => import('@/components/clubs/ClubForm'));

export default function ClubsEditingModals({
  openCreate,
  onCloseCreate,
  editClub,
  onCloseEdit,
  onReload,
}: Props) {
  return (
    <>
      <Modal open={openCreate} title="Nuovo club" onClose={onCloseCreate}>
        <ClubForm
          onCancel={onCloseCreate}
          onSaved={() => {
            onCloseCreate();
            onReload();
          }}
        />
      </Modal>

      <Modal
        open={!!editClub}
        title={`Modifica: ${editClub?.display_name || editClub?.name || ''}`}
        onClose={onCloseEdit}
      >
        {editClub && (
          <ClubForm
            initial={editClub}
            onCancel={onCloseEdit}
            onSaved={() => {
              onCloseEdit();
              onReload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
