'use client';

import { useEffect, useRef } from 'react';

/** Apple platform check without the deprecated navigator.platform. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaPlatform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  if (uaPlatform) return /mac|ios/i.test(uaPlatform);
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
  return target.isContentEditable || Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
}

interface UndoRedoShortcutOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Returns true while a gesture (drag / transform) is in progress; shortcuts are ignored then. */
  isBlocked?: () => boolean;
}

/**
 * Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl+Y redo (non-Apple). Ignores keystrokes aimed at
 * form controls, buttons and contenteditable regions so native text undo keeps working there.
 */
export function useUndoRedoShortcuts(options: UndoRedoShortcutOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const isApple = isApplePlatform();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || isEditableTarget(e.target)) return;

      const modifier = isApple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (!modifier) return;

      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = (key === 'z' && e.shiftKey) || (!isApple && key === 'y' && !e.shiftKey);
      if (!isUndo && !isRedo) return;

      e.preventDefault();
      const { canUndo, canRedo, undo, redo, isBlocked } = optionsRef.current;
      if (isBlocked?.()) return;
      if (isUndo && canUndo) undo();
      else if (isRedo && canRedo) redo();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
