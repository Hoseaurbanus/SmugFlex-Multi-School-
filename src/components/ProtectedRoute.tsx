import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSchool } from '../contexts/SchoolContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser, isLoading } = useSchool();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading session...</span>
      </div>
    );
  }

  // Check if user is authenticated
  if (!currentUser || !currentUser.token) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  // Check school status (multi-tenant)
  if (currentUser.school_status && currentUser.school_status !== 'Active') {
    if (currentUser.school_status === 'Suspended') {
      return <Navigate to="/login?reason=suspended" replace />;
    }
    if (currentUser.school_status === 'Pending') {
      return <Navigate to="/login?reason=pending" replace />;
    }
    return <Navigate to="/login?reason=inactive" replace />;
  }

  // Check access expiry
  if (currentUser.access_until) {
    const accessUntil = new Date(currentUser.access_until);
    if (accessUntil < new Date()) {
      return <Navigate to="/login?reason=expired" replace />;
    }
  }

  return <>{children}</>;
}
