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
  const { isAuthenticated, user, loading, needsRoleSelection } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // If user needs to select a role first (Google OAuth first sign-in)
    if (needsRoleSelection) {
      router.replace('/select-role');
      return;
    }

    // If a specific role is required and the user doesn't have it, redirect to their dashboard
    if (allowedRole && user?.role !== allowedRole) {
      const redirectTo = user?.role === 'recruiter' ? '/search' : '/upload';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, user, allowedRole, loading, needsRoleSelection, router]);

  // Don't render children until auth checks pass
  if (loading || !isAuthenticated) {
    return null;
  }

  if (needsRoleSelection) {
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
