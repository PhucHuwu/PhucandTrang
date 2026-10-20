'use client';

import React from 'react';
import { Book, Page } from '@/types/book';
import { ValidationReport } from '@/services/adminApi';
import { LayoutPresetDefinition } from '@/templates/layoutPresets';
import LayoutPresetPicker from '@/components/admin/LayoutPresetPicker';
import SaveAsLayoutModal from '@/components/admin/SaveAsLayoutModal';
import VersionHistoryModal from '@/components/admin/VersionHistoryModal';
import PublishValidationModal from '@/components/admin/PublishValidationModal';
import type { PageConflictInfo } from '@/hooks/useAutosavePage';
import ConflictDialog from './ConflictDialog';

export interface EditorModalsProps {
  page: Page;
  journal: Book | null;
  showLayoutPicker: boolean;
  setShowLayoutPicker: (open: boolean) => void;
  handleApplyLayoutTemplate: (templateDef: LayoutPresetDefinition) => void;
  showSaveAsLayout: boolean;
  setShowSaveAsLayout: (open: boolean) => void;
  showHistoryModal: boolean;
  setShowHistoryModal: (open: boolean) => void;
  onRollbackSuccess: () => void | Promise<void>;
  conflict: PageConflictInfo | null;
  conflictDismissed: boolean;
  setConflictDismissed: (dismissed: boolean) => void;
  resolvingConflict: boolean;
  handleReloadLatest: () => void;
  handleOverwrite: () => void;
  validationModal: { bookId: string; report: ValidationReport } | null;
  setValidationModal: (modal: { bookId: string; report: ValidationReport } | null) => void;
  refreshJournal: () => void;
  showToast: (message: string) => void;
}

/** Every dialog of the page editor: layout picker, save-as-template, version history, conflict and publish validation. */
export default function EditorModals({
  page,
  journal,
  showLayoutPicker,
  setShowLayoutPicker,
  handleApplyLayoutTemplate,
  showSaveAsLayout,
  setShowSaveAsLayout,
  showHistoryModal,
  setShowHistoryModal,
  onRollbackSuccess,
  conflict,
  conflictDismissed,
  setConflictDismissed,
  resolvingConflict,
  handleReloadLatest,
  handleOverwrite,
  validationModal,
  setValidationModal,
  refreshJournal,
  showToast,
}: EditorModalsProps) {
  return (
    <>
      {/* Layout Preset Picker Modal */}
      {showLayoutPicker && (
        <LayoutPresetPicker
          isOpen={showLayoutPicker}
          onClose={() => setShowLayoutPicker(false)}
          onSelectLayout={handleApplyLayoutTemplate}
          currentTemplateId={page?.layoutTemplateId || page?.layout}
          hasCustomizations={page?.isCustomized}
        />
      )}

      {/* Save Current Page as Layout Template Modal */}
      {showSaveAsLayout && (
        <SaveAsLayoutModal
          isOpen={showSaveAsLayout}
          onClose={() => setShowSaveAsLayout(false)}
          page={page}
          onSaved={() => {
            showToast('Đã lưu bố cục thành Layout Template mới!');
          }}
        />
      )}

      {/* Version History & Rollback Modal */}
      {journal && (
        <VersionHistoryModal
          bookId={journal.id}
          bookTitle={journal.title}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onRollbackSuccess={onRollbackSuccess}
        />
      )}

      <ConflictDialog
        open={Boolean(conflict) && !conflictDismissed}
        busy={resolvingConflict}
        onReload={handleReloadLatest}
        onOverwrite={handleOverwrite}
        onClose={() => setConflictDismissed(true)}
      />

      {/* Publish Validation & Confirmation Modal */}
      {validationModal && (
        <PublishValidationModal
          bookId={validationModal.bookId}
          isOpen={true}
          onClose={() => setValidationModal(null)}
          report={validationModal.report}
          onPublishSuccess={() => {
            refreshJournal();
            showToast('Đã xuất bản thành công bản phát hành mới!');
          }}
        />
      )}
    </>
  );
}
