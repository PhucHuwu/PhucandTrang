'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminUser, checkAdminAuth, logoutAdmin } from '@/services/adminApi';

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isAuthenticated: false,
  isAdmin: true,
  isEditor: true,
  isViewer: false,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
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

  const isAuthenticated = Boolean(user);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin: true,   // Single Admin architecture: authenticated admin has full CMS access
        isEditor: true,
        isViewer: false,
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
