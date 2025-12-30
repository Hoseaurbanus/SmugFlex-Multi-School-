import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSchool } from '../contexts/SchoolContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser } = useSchool();

  // Check if user is authenticated
  if (!currentUser || !currentUser.token) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
