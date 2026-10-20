'use client';

import React, { useCallback } from 'react';
import { Page, PageElement } from '@/types/book';

export interface PageEditCallbacksContext {
  pageRef: React.MutableRefObject<Page | null>;
  selectedElementId: string | null;
  updatePage: (update: (prev: Page) => Page, description?: string) => void;
  recordHistory: (page: Page, description: string) => void;
}

/** Local (client-only) edit callbacks of the page editor; each one records its own undo step. */
export function usePageEditCallbacks({ pageRef, selectedElementId, updatePage, recordHistory }: PageEditCallbacksContext) {
  // Update selected element property locally
  const updateSelectedElement = useCallback((updater: (el: any) => any) => {
    if (!selectedElementId) return;
    updatePage(
      (prevPage) => ({
        ...prevPage,
        isCustomized: true,
        elements: (prevPage.elements || []).map((el) =>
          el.id === selectedElementId ? (updater(el) as PageElement) : el
        ),
      }),
      'Chỉnh sửa thuộc tính phần tử'
    );
  }, [selectedElementId, updatePage]);

  // Update normalized transform when dragged or resized on Konva Canvas
  const handleUpdateElementTransform = useCallback(
    (id: string, normalizedTransform: { x: number; y: number; width: number; height: number; rotation: number }) => {
      updatePage(
        (prevPage) => ({
          ...prevPage,
          isCustomized: true,
          elements: (prevPage.elements || []).map((el) =>
            el.id === id ? { ...el, transform: { ...el.transform, ...normalizedTransform } } : el
          ),
        }),
        'Thay đổi vị trí / kích thước phần tử'
      );
    },
    [updatePage]
  );

  const handleUpdateActiveArea = useCallback(
    (id: string, activeArea: { left: number; top: number; width: number; height: number }) => {
      updatePage(
        (prevPage) => ({
          ...prevPage,
          isCustomized: true,
          elements: prevPage.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  interaction: {
                    ...(el.interaction || { enabled: true, action: 'none' }),
                    activeArea,
                  },
                }
              : el
          ),
        }),
        'Cập nhật vùng bấm tương tác'
      );
    },
    [updatePage]
  );

  /** Metadata fields: every keystroke updates the page, one undo step is recorded when the field loses focus. */
  const updateMetadata = useCallback(
    (fields: Partial<Page>) => {
      updatePage((prev) => ({ ...prev, isCustomized: true, ...fields }));
    },
    [updatePage]
  );
  const commitMetadataHistory = useCallback(() => {
    if (pageRef.current) recordHistory(pageRef.current, 'Cập nhật thông tin trang');
  }, [recordHistory]);

  return {
    updateSelectedElement,
    handleUpdateElementTransform,
    handleUpdateActiveArea,
    updateMetadata,
    commitMetadataHistory,
  };
}
