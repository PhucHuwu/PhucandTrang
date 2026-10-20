'use client';

import { useEffect, useState } from 'react';

type PresenceMessage =
  | { type: 'hello'; tabId: string; pageId: string }
  | { type: 'here'; tabId: string; pageId: string }
  | { type: 'bye'; tabId: string; pageId: string };

const CHANNEL_NAME = 'admin-page-editor';

/**
 * Reports whether the same page is open in another editor tab of this browser, so the editor can
 * warn before the two tabs overwrite each other (the server only detects it on the next save).
 */
export function usePageTabPresence(pageId: string): boolean {
  const [otherTabs, setOtherTabs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    const tabId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const peers = new Set<string>();
    const sync = () => setOtherTabs(Array.from(peers));

    channel.onmessage = (event: MessageEvent<PresenceMessage>) => {
      const msg = event.data;
      if (!msg || msg.pageId !== pageId || msg.tabId === tabId) return;
      if (msg.type === 'hello') {
        peers.add(msg.tabId);
        channel.postMessage({ type: 'here', tabId, pageId } satisfies PresenceMessage);
      } else if (msg.type === 'here') {
        peers.add(msg.tabId);
      } else if (msg.type === 'bye') {
        peers.delete(msg.tabId);
      }
      sync();
    };

    channel.postMessage({ type: 'hello', tabId, pageId } satisfies PresenceMessage);

    const sayBye = () => {
      try {
        channel.postMessage({ type: 'bye', tabId, pageId } satisfies PresenceMessage);
      } catch {
        // Channel already closed
      }
    };
    window.addEventListener('pagehide', sayBye);

    return () => {
      window.removeEventListener('pagehide', sayBye);
      sayBye();
      channel.close();
      setOtherTabs([]);
    };
  }, [pageId]);

  return otherTabs.length > 0;
}
