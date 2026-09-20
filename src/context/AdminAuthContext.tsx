'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminUser, checkAdminAuth, logoutAdmin, getCachedAdminUser } from '@/services/adminApi';

interface AdminAuthContextType {
  user: AdminUser | null;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | null;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  isEditor: false,
  isViewer: false,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(getCachedAdminUser());
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === '/admin/login';

  const refreshUser = useCallback(async () => {
    try {
      const data = await checkAdminAuth();
      setUser(data.user);
    } catch {
      setUser(null);
      if (!isLoginPage) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    if (!isLoginPage) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [isLoginPage, refreshUser]);

  const logout = async () => {
    await logoutAdmin();
    setUser(null);
    router.push('/admin/login');
  };

  const role = user?.role || null;
  const isAdmin = role === 'ADMIN';
  const isEditor = role === 'ADMIN' || role === 'EDITOR';
  const isViewer = role === 'VIEWER';

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isEditor,
        isViewer,
        loading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
