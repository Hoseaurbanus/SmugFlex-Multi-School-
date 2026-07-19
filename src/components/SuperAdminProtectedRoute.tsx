import React from 'react';
import { Navigate } from 'react-router-dom';
import { superAdminAuth } from '../services/superAdminAuthService';

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
}

export function SuperAdminProtectedRoute({ children }: SuperAdminProtectedRouteProps) {
  const isAuthenticated = superAdminAuth.isAuthenticated();
  const currentUser = superAdminAuth.getCurrentUser();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <>{children}</>;
}
