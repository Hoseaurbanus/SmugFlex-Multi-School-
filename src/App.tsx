import React, { Suspense, lazy, useEffect, Component, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegistrationPage } from './components/RegistrationPage';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuperAdminProtectedRoute } from './components/SuperAdminProtectedRoute';
import { NotificationServiceProvider } from './contexts/NotificationService';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { AuthProvider, useAuth } from './contexts/domains/AuthContext';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getAuthToken } from './config/api';

// Lazy load heavy dashboard components
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const AccountantDashboard = lazy(() => import('./components/AccountantDashboard').then(module => ({ default: module.AccountantDashboard })));
const UniversalParentDashboardFixed = lazy(() => import('./components/UniversalParentDashboardFixed').then(module => ({ default: module.UniversalParentDashboardFixed })));
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const SuperAdminLoginPage = lazy(() => import('./components/superadmin/SuperAdminLoginPage').then(module => ({ default: module.SuperAdminLoginPage })));
const SuperAdminDashboard = lazy(() => import('./components/superadmin/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));

// Error boundary to prevent blank screens
class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.(); }} className="px-6 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-medium hover:bg-[#0d3558]">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <AuthProvider>
        <ConnectionProvider>
          <NotificationServiceProvider>
            <Toaster position="top-right" richColors />
            <AppContent navigate={navigate} />
          </NotificationServiceProvider>
        </ConnectionProvider>
      </AuthProvider>
    </SchoolProvider>
  );
}

function AppContent({ navigate }: { navigate: any }) {
  const { logout } = useAuth();

  // Proactive token expiry check — every 60 seconds
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logout();
          navigate('/login');
        }
      } catch {
        // Invalid token — clear it
        logout();
        navigate('/login');
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigateToLogin={() => navigate('/login')} onNavigateToRegister={() => navigate('/register')} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LoadingSpinner />}><AdminDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><Suspense fallback={<LoadingSpinner />}><TeacherDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/accountant" element={<ProtectedRoute requiredRole="accountant"><Suspense fallback={<LoadingSpinner />}><AccountantDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/parent" element={<ProtectedRoute requiredRole="parent"><Suspense fallback={<LoadingSpinner />}><UniversalParentDashboardFixed onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<LoadingSpinner />}><StudentDashboard onLogout={handleLogout} /></Suspense></ProtectedRoute>} />
      <Route path="/super-admin/login" element={<Suspense fallback={<LoadingSpinner />}><SuperAdminLoginPage /></Suspense>} />
      <Route path="/super-admin/dashboard" element={<SuperAdminProtectedRoute><ErrorBoundary><Suspense fallback={<LoadingSpinner />}><SuperAdminDashboard /></Suspense></ErrorBoundary></SuperAdminProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
