import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: UserRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required and the user doesn't have it, redirect to their dashboard
  if (allowedRole && user?.role !== allowedRole) {
    const redirectTo = user?.role === 'recruiter' ? '/search' : '/upload';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
