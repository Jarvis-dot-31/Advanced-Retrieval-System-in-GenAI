'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: UserRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // If a specific role is required and the user doesn't have it, redirect to their dashboard
    if (allowedRole && user?.role !== allowedRole) {
      const redirectTo = user?.role === 'recruiter' ? '/search' : '/upload';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, user, allowedRole, router]);

  // Don't render children until auth checks pass
  if (!isAuthenticated) {
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
