'use client';

import React from 'react';
import {
  applyAdminLayout,
  createAdminElement,
  deleteAdminElement,
  duplicateAdminElement,
} from '@/services/adminApi';
import { Page, PageElement, PageElementType } from '@/types/book';
import {
  applyLayoutTemplate,
  extractContentFromPage,
  LayoutPresetDefinition,
} from '@/templates/layoutPresets';
import type { useAutosavePage } from '@/hooks/useAutosavePage';

type Autosave = ReturnType<typeof useAutosavePage>;

export interface PageElementActionsContext {
  pageId: string;
  pageRef: React.MutableRefObject<Page | null>;
  selectedElementId: string | null;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  setSaving: (saving: boolean) => void;
  setToast: (toast: null) => void;
  showToast: (message: string, tone?: 'success' | 'warning', ms?: number) => void;
  updatePage: (update: (prev: Page) => Page, description?: string) => void;
  adoptServerPage: (fresh: Page) => void;
  runServerMutation: Autosave['runServerMutation'];
  markElementOnServer: Autosave['markElementOnServer'];
  markElementDeleted: Autosave['markElementDeleted'];
  flushAutosave: Autosave['flush'];
}

/** Server-side element mutations of the page editor (apply layout, add, duplicate, delete). Uses no React hooks. */
export function usePageElementActions({
  pageId,
  pageRef,
  selectedElementId,
  setSelectedElementId,
  setSaving,
  setToast,
  showToast,
  updatePage,
  adoptServerPage,
  runServerMutation,
  markElementOnServer,
  markElementDeleted,
  flushAutosave,
}: PageElementActionsContext) {
  const mutationErrorMessage = (err: any, fallback: string) =>
    err?.name === 'PageConflictPendingError' ? err.message : err?.message || fallback;

  // Apply Layout Template
  const handleApplyLayoutTemplate = async (templateDef: LayoutPresetDefinition) => {
    const current = pageRef.current;
    if (!current) return;
    setSaving(true);
    setToast(null);

    try {
      const extractedContent = extractContentFromPage(current);
      const newlyArrangedPage = applyLayoutTemplate(
        {
          ...current,
          pageNumber: current.pageNumber,
          side: current.side,
        },
        templateDef,
        extractedContent
      );

      const elementsToSave = newlyArrangedPage.elements.map((el) => ({
        type: el.type,
        slot: el.slot,
        zIndex: el.zIndex,
        order: el.order,
        visible: el.visible,
        locked: el.locked,
        opacity: el.opacity,
        transform: el.transform,
        style: el.style,
        data: el.data,
        interaction: el.interaction,
      }));

      // Atomic Apply Layout (single transaction replaces elements & sets isCustomized=false).
      // All element ids change, so the undo stack would point at elements that no longer exist.
      await runServerMutation(() => applyAdminLayout(pageId, templateDef.id, elementsToSave), {
        updatedAtFrom: (refreshed: any) => refreshed?.updatedAt,
        apply: (refreshed: Page) => {
          adoptServerPage(refreshed);
          setSelectedElementId(refreshed.elements?.[0]?.id ?? null);
          return refreshed;
        },
      });

      showToast(
        `Đã áp dụng bố cục "${templateDef.name}". Lịch sử hoàn tác đã được đặt lại.`,
        'success',
        4000
      );
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi áp dụng bố cục mới'));
    } finally {
      setSaving(false);
    }
  };

  // Add new element to page
  const handleAddElement = async (type: PageElementType) => {
    const current = pageRef.current;
    if (!current) return;
    const maxZ = (current.elements || []).reduce((max, el) => Math.max(max, el.zIndex ?? 1), 0);
    const newZ = maxZ + 1;

    let defaultData: any = {};
    let defaultStyle: any = {};

    switch (type) {
      case 'TEXT':
        defaultData = { text: 'Nội dung kỷ niệm mới', variant: 'body' };
        defaultStyle = {
          fontFamily: 'Cormorant Garamond',
          fontSize: 24,
          color: '#292522',
          textAlign: 'left',
        };
        break;
      case 'IMAGE':
        defaultData = {
          src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389698/phuc_trang_memories/her-pic-1.jpg',
          objectFit: 'contain',
        };
        defaultStyle = { polaroidFrame: true, washiTape: true };
        break;
      case 'VIDEO':
        defaultData = {
          src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789389686/phuc_trang_memories/26-06-2323.mp4',
          thumbnailUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390296/phuc_trang_memories/26-06-2323_thumb.jpg',
        };
        defaultStyle = { polaroidFrame: true, washiTape: true };
        break;
      case 'SHAPE':
        defaultData = { shapeType: 'line', strokeColor: '#C99A9A', strokeWidth: 2 };
        break;
      case 'DECORATION':
        defaultData = { decorationType: 'washi-tape' };
        break;
    }

    const newElementPayload = {
      pageId,
      type,
      zIndex: newZ,
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0.1, y: 0.3, width: 0.4, height: 0.2, rotation: 0, scale: 1 },
      style: defaultStyle,
      data: defaultData,
    };

    try {
      await runServerMutation(() => createAdminElement(newElementPayload), {
        apply: (created: PageElement) => {
          // Known on the server: undoing the add deletes it there on the next save
          markElementOnServer(created.id);
          updatePage(
            (prev) => ({ ...prev, isCustomized: true, elements: [...prev.elements, created] }),
            `Thêm phần tử ${type}`
          );
          setSelectedElementId(created.id);
          return pageRef.current;
        },
      });
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi thêm phần tử mới'));
    }
  };

  // Duplicate selected element
  const handleDuplicateSelected = async () => {
    if (!selectedElementId) return;
    const sourceId = selectedElementId;
    // A local-only element (e.g. restored by undo, not saved yet) cannot be duplicated server-side
    if (!(await flushAutosave())) {
      alert('Chưa lưu được trang hiện tại. Vui lòng thử lại trước khi nhân bản.');
      return;
    }
    try {
      await runServerMutation(() => duplicateAdminElement(sourceId, 0.03, 0.03), {
        apply: (dup: PageElement) => {
          markElementOnServer(dup.id);
          updatePage(
            (prev) => ({ ...prev, isCustomized: true, elements: [...prev.elements, dup] }),
            'Nhân bản phần tử'
          );
          setSelectedElementId(dup.id);
          return pageRef.current;
        },
      });
      showToast('Đã nhân bản phần tử!', 'success', 2500);
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi nhân bản phần tử'));
    }
  };

  // Delete element
  const handleDeleteElement = async (elementId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi trang?')) return;
    try {
      await runServerMutation(
        async () => {
          try {
            return await deleteAdminElement(elementId);
          } catch (err: any) {
            // Never reached the server (e.g. added then undone/redone before saving): local removal is enough
            if (err?.status === 404) return null;
            throw err;
          }
        },
        {
          apply: () => {
            // Gone on the server: undoing the delete re-creates it through the save endpoint (type + slot)
            markElementDeleted(elementId);
            updatePage(
              (prev) => ({
                ...prev,
                isCustomized: true,
                elements: prev.elements.filter((el) => el.id !== elementId),
              }),
              'Xóa phần tử'
            );
            return pageRef.current;
          },
        }
      );
      setSelectedElementId(null);
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi xóa phần tử'));
    }
  };

  return { handleApplyLayoutTemplate, handleAddElement, handleDuplicateSelected, handleDeleteElement };
}
