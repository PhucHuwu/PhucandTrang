'use client';

import { useEffect, useRef } from 'react';

// Open dialogs, innermost last. Only the topmost one reacts to Escape/Tab.
const stack: HTMLElement[] = [];

export function useAdminDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    stack.push(dialog);
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((item) => item.getClientRects().length);
    focusable()[0]?.focus();
    // Clicking a non-focusable area (e.g. a card) moves focus to <body>, so listen on the document.
    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== dialog) return;
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      const inside = dialog.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (!inside || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === dialog && stack[stack.length - 1] === dialog) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    dialog.addEventListener('click', onBackdrop);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      dialog.removeEventListener('click', onBackdrop);
      stack.splice(stack.indexOf(dialog), 1);
      if (!stack.length) document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return ref;
}
