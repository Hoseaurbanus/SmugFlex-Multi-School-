import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationServiceProvider } from './contexts/NotificationService';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { SchoolProvider, useSchool } from './contexts/SchoolContext';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

// Lazy load heavy dashboard components
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const AccountantDashboard = lazy(() => import('./components/AccountantDashboard').then(module => ({ default: module.AccountantDashboard })));
const UniversalParentDashboardFixed = lazy(() => import('./components/UniversalParentDashboardFixed').then(module => ({ default: module.UniversalParentDashboardFixed })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

function App() {
  const navigate = useNavigate();

  return (
    <SchoolProvider>
      <ConnectionProvider>
        <NotificationServiceProvider>
          <Toaster position="top-right" richColors />
          <AppContent navigate={navigate} />
        </NotificationServiceProvider>
      </ConnectionProvider>
    </SchoolProvider>
  );
}

function AppContent({ navigate }: { navigate: any }) {
  const { logout } = useSchool();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigateToLogin={() => navigate('/login')} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingSpinner />}><AdminDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><Suspense fallback={<LoadingSpinner />}><TeacherDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/accountant" element={<ProtectedRoute requiredRole="accountant"><Suspense fallback={<LoadingSpinner />}><AccountantDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/parent" element={<ProtectedRoute requiredRole="parent"><Suspense fallback={<LoadingSpinner />}><UniversalParentDashboardFixed onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
