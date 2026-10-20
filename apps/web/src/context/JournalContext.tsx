'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getJournal } from '@/services/adminApi';
import { Book } from '@/types/book';

interface JournalContextValue {
  journal: Book | null;
  journalId: string | null;
  loading: boolean;
  error: string | null;
  refreshJournal: () => Promise<void>;
}

const JournalContext = createContext<JournalContextValue>({
  journal: null,
  journalId: null,
  loading: true,
  error: null,
  refreshJournal: async () => {},
});

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [journal, setJournal] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the most recent refresh may write state; an older response arriving late is dropped
  const requestIdRef = useRef(0);

  const fetchCanonicalJournal = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await getJournal();
      if (requestId !== requestIdRef.current) return;
      setJournal(data);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message || 'Không thể tải cuốn nhật ký');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanonicalJournal();
  }, [fetchCanonicalJournal]);

  return (
    <JournalContext.Provider
      value={{
        journal,
        journalId: journal?.id || null,
        loading,
        error,
        refreshJournal: fetchCanonicalJournal,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  return useContext(JournalContext);
}
