'use client';

import { createPortal } from 'react-dom';

/**
 * Renders dialogs at <body> level. Editor panels create stacking contexts (z-index) and
 * container-query containment, which would otherwise trap a `fixed` dialog under the page header.
 * Portals synchronously so useAdminDialog sees its ref on the first effect; dialogs only open
 * after user interaction, so this never runs during SSR.
 */
export default function DialogPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
