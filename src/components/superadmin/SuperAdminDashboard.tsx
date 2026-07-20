import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { superAdminAuth } from '../../services/superAdminAuthService';
import { API_CONFIG } from '../../config/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  School, Shield, LogOut, Users, Search, Check, X, Ban, Clock,
  Plus, Activity, BarChart3, Menu,
  Bell, BookOpen, FileText, Calculator, ClipboardList,
  GraduationCap, Trash2, Power, PowerOff, Key,
  ChevronRight, ChevronLeft, AlertTriangle, Globe, Mail, Phone, MapPin,
  Calendar, Hash, Layers, MoreVertical, Loader2
} from 'lucide-react';

const MODULE_LIST = [
  { key: 'students', label: 'Students', icon: GraduationCap },
  { key: 'teachers', label: 'Teachers', icon: Users },
  { key: 'results', label: 'Results', icon: FileText },
  { key: 'cbt', label: 'CBT Exams', icon: BookOpen },
  { key: 'fees', label: 'Fees & Payments', icon: Calculator },
  { key: 'attendance', label: 'Attendance', icon: ClipboardList },
  { key: 'assignments', label: 'Assignments', icon: BookOpen },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'accountant', label: 'Accountant', icon: Calculator },
];

interface PlatformStats {
  total_schools: number;
  active_schools: number;
  pending_schools: number;
  inactive_schools: number;
  suspended_schools: number;
  total_students: number;
  total_teachers: number;
  new_schools_this_month: number;
  trial_schools: number;
  basic_schools: number;
  standard_schools: number;
  premium_schools: number;
}

interface SchoolRecord {
  id: number;
  name: string;
  suffix: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  access_until: string;
  suffix_locked: boolean;
  created_at: string;
  student_count: number;
  teacher_count: number;
}

interface SchoolDetail extends SchoolRecord {
  address: string;
  city: string;
  state: string;
  website: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  parent_count: number;
  accountant_count: number;
  payment_count: number;
  class_count: number;
  term_count: number;
}

interface ActivityLog {
  id: number;
  super_admin_name: string;
  action: string;
  school_name: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface SchoolModule {
  module_name: string;
  is_enabled: number;
  disabled_reason: string | null;
}

type Tab = 'dashboard' | 'schools' | 'pending' | 'modules' | 'activity';

const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } };
const slideIn = { hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.3 } } };

function AnimatedPrimaryCard({ label, value, icon: Icon, gradient, subtitle, delay }: {
  label: string; value: number; icon: any; gradient: string; subtitle: string; delay: number;
}) {
  const animVal = useAnimatedCounter(value);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:border-[var(--border)]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] tabular-nums">{animVal.toLocaleString()}</p>
        <p className="text-sm text-[var(--muted-foreground)] font-medium mt-0.5">{label}</p>
        <p className="text-[11px] text-[var(--muted-foreground)]/60">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function AnimatedSecondaryCard({ label, value, icon: Icon, color, delay }: {
  label: string; value: number; icon: any; color: string; delay: number;
}) {
  const animVal = useAnimatedCounter(value);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -3 }} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-xs text-[var(--muted-foreground)] font-medium">{label}</p>
      </div>
      <p className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] tabular-nums">{animVal.toLocaleString()}</p>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-5">
      <div className="skeleton w-11 h-11 rounded-xl mb-3" />
      <div className="skeleton w-20 h-8 rounded mb-1" />
      <div className="skeleton w-24 h-4 rounded mb-0.5" />
      <div className="skeleton w-28 h-3 rounded" />
    </div>
  );
}

function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1">
              <div className="skeleton w-40 h-4 rounded mb-2" />
              <div className="skeleton w-56 h-3 rounded" />
            </div>
            <div className="skeleton w-16 h-6 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Animated counter hook */
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [pendingSchools, setPendingSchools] = useState<SchoolRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolDetail | null>(null);
  const [schoolModules, setSchoolModules] = useState<SchoolModule[]>([]);
  const [showSchoolDetail, setShowSchoolDetail] = useState(false);
  const [showModules, setShowModules] = useState(false);
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [showExtendAccess, setShowExtendAccess] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [extendDays, setExtendDays] = useState('90');
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [approveSuffix, setApproveSuffix] = useState('');
  const [newSchool, setNewSchool] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', suffix: '', plan: 'trial' });
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [disabledReasonInput, setDisabledReasonInput] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<{ moduleName: string; label: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [pendingSortOrder, setPendingSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [extendPreset, setExtendPreset] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId !== null) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    const handleClickOutsideUserMenu = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutsideUserMenu);
    return () => document.removeEventListener('mousedown', handleClickOutsideUserMenu);
  }, [showUserMenu]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('super_admin_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_CONFIG.BASE_URL}${url}`, { ...options, headers: getAuthHeaders() });
    const data = await res.json();
    if (res.status === 401) { superAdminAuth.logout(); navigate('/super-admin/login'); throw new Error('Session expired'); }
    if (!res.ok || !data.success) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  };

  const searchRef = useRef(search);
  const statusFilterRef = useRef(statusFilter);
  const isInitialMount = useRef(true);
  searchRef.current = search;
  statusFilterRef.current = statusFilter;

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.STATS);
      setStats(data.data);
    } catch (e: any) {
      if (e.message !== 'Session expired') toast.error('Failed to load stats: ' + (e.message || 'Unknown error'));
    }
  }, []);

  const fetchSchools = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilterRef.current) params.set('status', statusFilterRef.current);
      if (searchRef.current) params.set('search', searchRef.current);
      const data = await apiCall(`${API_CONFIG.ENDPOINTS.SUPER_ADMIN.SCHOOLS}?${params}`);
      setSchools(data.data);
    } catch { toast.error('Failed to load schools'); }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.PENDING);
      setPendingSchools(data.data);
    } catch { toast.error('Failed to load pending registrations'); }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.ACTIVITY_LOGS);
      const logs = data.data;
      setActivityLogs(Array.isArray(logs) ? logs : logs?.items || logs?.data || []);
    } catch { toast.error('Failed to load activity logs'); }
  }, []);

  useEffect(() => {
    const user = superAdminAuth.getCurrentUser();
    if (!user) { navigate('/super-admin/login'); return; }
    setLoading(true);
    Promise.all([fetchStats(), fetchSchools(), fetchPending(), fetchActivity()])
      .finally(() => setLoading(false));
  }, [navigate, fetchStats, fetchSchools, fetchPending, fetchActivity]);

  useEffect(() => {
    if (activeTab === 'schools') fetchSchools();
    if (activeTab === 'pending') fetchPending();
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'dashboard') fetchStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, fetchStats, fetchSchools, fetchPending, fetchActivity]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSchoolDetail(false);
        setShowModules(false);
        setShowCreateSchool(false);
        setShowExtendAccess(false);
        setShowReject(false);
        setShowSuspend(false);
        setShowDelete(false);
        setShowCredentials(false);
        setShowApproveDialog(false);
        setOpenMenuId(null);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const timer = setTimeout(() => { fetchSchools(); }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchSchools]);

  useEffect(() => { setSchoolsPage(1); }, [search, statusFilter]);
  useEffect(() => { setActivityPage(1); }, [activeTab]);

  // Auto-refresh stats every 30 seconds while on dashboard tab
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const interval = setInterval(() => { fetchStats(); }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchStats]);

  // Auto-refresh pending registrations every 60 seconds
  useEffect(() => {
    if (activeTab !== 'pending') return;
    const interval = setInterval(() => { fetchPending(); }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, fetchPending]);

  // Auto-refresh activity logs every 60 seconds
  useEffect(() => {
    if (activeTab !== 'activity') return;
    const interval = setInterval(() => { fetchActivity(); }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, fetchActivity]);

  const handleLogout = () => { superAdminAuth.logout(); navigate('/super-admin/login'); };

  const handleAction = async (url: string, body?: any) => {
    setActionLoading(true);
    try {
      await apiCall(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      toast.success('Action completed');
      fetchSchools(); fetchPending(); fetchStats();
      setShowSchoolDetail(false); setShowExtendAccess(false); setShowReject(false);
      setShowSuspend(false); setShowDelete(false);
      return true;
    } catch (e: any) { toast.error(e.message); return false; }
    finally { setActionLoading(false); }
  };

  const handleApprove = async (id: number, suffix?: string) => {
    setActionLoading(true);
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.APPROVE(id), {
        method: 'POST',
        body: JSON.stringify({ suffix: suffix || undefined })
      });
      toast.success('School approved');
      setCredentials(data.data);
      setShowCredentials(true);
      setShowApproveDialog(false);
      setApproveSuffix('');
      fetchSchools(); fetchPending(); fetchStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  const handleCreateSchool = async () => {
    if (!newSchool.name || !newSchool.email) { toast.error('Name and email required'); return; }
    setActionLoading(true);
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.CREATE_SCHOOL, { method: 'POST', body: JSON.stringify(newSchool) });
      setCredentials(data.data);
      setShowCredentials(true);
      setShowCreateSchool(false);
      setNewSchool({ name: '', email: '', phone: '', address: '', city: '', state: '', suffix: '', plan: 'trial' });
      fetchSchools(); fetchStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  const fetchModules = async (schoolId: number) => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.MODULES(schoolId));
      setSchoolModules(Array.isArray(data.data) ? data.data : []);
    } catch { toast.error('Failed to load modules'); }
  };

  const handleToggleModule = async (moduleName: string, enabled: boolean, reason?: string) => {
    if (!selectedSchool) return;
    setTogglingModule(moduleName);
    const updated = (Array.isArray(schoolModules) ? schoolModules : []).map(m => m.module_name === moduleName ? { ...m, is_enabled: enabled ? 1 : 0, disabled_reason: enabled ? null : (reason || m.disabled_reason) } : m);
    setSchoolModules(updated);
    try {
      await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.MODULES(selectedSchool.id), {
        method: 'PUT', body: JSON.stringify({ modules: [{ module_name: moduleName, is_enabled: enabled ? 1 : 0, disabled_reason: enabled ? null : (reason || null) }] })
      });
      toast.success(`${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) { toast.error(e.message); fetchModules(selectedSchool.id); }
    finally { setTogglingModule(null); }
  };

  const openSchoolDetail = async (school: SchoolRecord) => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.SCHOOL_DETAIL(school.id));
      setSelectedSchool(data.data);
      setShowSchoolDetail(true);
    } catch { toast.error('Failed to load school details'); }
  };

  const openModules = async (school: SchoolRecord) => {
    setSelectedSchool(school as SchoolDetail);
    await fetchModules(school.id);
    setShowModules(true);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'inactive': return 'bg-gray-100 text-gray-600';
      case 'suspended': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const planColor = (p: string) => {
    switch (p) {
      case 'trial': return 'bg-blue-100 text-blue-700';
      case 'basic': return 'bg-purple-100 text-purple-700';
      case 'standard': return 'bg-orange-100 text-orange-700';
      case 'premium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const sidebarItems: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'schools', label: 'Schools', icon: <School className="w-5 h-5" />, badge: schools.length || undefined },
    { key: 'pending', label: 'Pending Approvals', icon: <Clock className="w-5 h-5" />, badge: pendingSchools.length || undefined },
    { key: 'modules', label: 'Module Control', icon: <Layers className="w-5 h-5" /> },
    { key: 'activity', label: 'Activity Log', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <>
    <style>{`
      @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[var(--sidebar)] text-white z-50 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`${sidebarCollapsed ? 'p-3' : 'p-5'} border-b border-white/10`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
              <Shield className="w-5 h-5 text-[var(--sidebar)]" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold tracking-tight">SmugFlex</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Admin Portal</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scrollbar">
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all relative ${activeTab === item.key ? 'bg-white/15 text-white shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              title={sidebarCollapsed ? item.label : undefined}>
              {activeTab === item.key && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--sidebar-primary)]" />
              )}
              {item.icon}
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.key === 'pending' ? 'bg-amber-500 text-[var(--sidebar)]' : item.key === 'schools' ? 'bg-emerald-500 text-white' : 'bg-[var(--sidebar-primary)] text-white'}`}>{item.badge}</span>
                  )}
                </>
              )}
              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 space-y-2 border-t border-white/10">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-3 px-2 py-2 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
          <div className="border-t border-white/10 pt-2">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all">
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 lg:px-6 h-16 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-[var(--muted)] rounded-lg" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <button className="relative p-2 hover:bg-[var(--muted)] rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5 text-[var(--muted-foreground)]" />
              {pendingSchools.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--destructive)]" />
              )}
            </button>
          </div>
          <div className="text-sm text-[var(--muted-foreground)] hidden sm:block">
            {superAdminAuth.getCurrentUser()?.username}
          </div>
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-[var(--sidebar)] flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-[var(--primary)] transition-all"
              aria-label="User menu">
              {superAdminAuth.getCurrentUser()?.first_name?.[0]}{superAdminAuth.getCurrentUser()?.last_name?.[0]}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden"
                style={{ animation: 'fadeSlideUp 0.15s ease both' }}>
                <div className="p-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{superAdminAuth.getCurrentUser()?.first_name} {superAdminAuth.getCurrentUser()?.last_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{superAdminAuth.getCurrentUser()?.username}</p>
                </div>
                <button onClick={handleLogout} className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-red-50 transition-colors text-red-600">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="skeleton h-40 rounded-2xl" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
              <SkeletonList count={3} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ─── DASHBOARD TAB ─── */}
              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
                  {/* Welcome Hero */}
                  <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: 'var(--gradient-hero)' }}>
                    {/* Animated orbs */}
                    <motion.div animate={{ y: [0, -12, 0], x: [0, 6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl -top-10 -right-10 pointer-events-none" />
                    <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute w-32 h-32 bg-amber-400/10 rounded-full blur-3xl bottom-0 left-0 pointer-events-none" />
                    {/* Dot pattern */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 text-sm">
                          {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-white mt-1">
                          Welcome back, <span className="bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent">{superAdminAuth.getCurrentUser()?.first_name || 'Admin'}</span>
                          <motion.span animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }} transition={{ duration: 2.5, delay: 0.5, ease: "easeInOut" }} className="inline-block ml-2">👋</motion.span>
                        </motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white/50 text-sm mt-2">
                          Platform overview &middot; {stats?.total_schools || 0} schools onboarded
                        </motion.p>
                      </div>
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Button onClick={() => setShowCreateSchool(true)} className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 rounded-xl font-semibold shadow-lg">
                          <Plus className="w-4 h-4 mr-2" /> Add School
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  {/* Primary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {([
                      { label: 'Total Schools', value: stats?.total_schools || 0, icon: School, gradient: 'from-[#0A2540] to-[#1a3a5c]', subtitle: 'All registered', trend: '↑ 12%' },
                      { label: 'Active', value: stats?.active_schools || 0, icon: Check, gradient: 'from-emerald-500 to-teal-500', subtitle: 'Running now', trend: '↑ 8%' },
                      { label: 'Pending', value: stats?.pending_schools || 0, icon: Clock, gradient: 'from-amber-500 to-orange-500', subtitle: 'Awaiting review', trend: '↓ 3%' },
                      { label: 'Suspended', value: stats?.suspended_schools || 0, icon: Ban, gradient: 'from-red-500 to-rose-500', subtitle: 'On hold', trend: '↓ 5%' },
                    ] as const).map((card, i) => (
                      <AnimatedPrimaryCard key={card.label} label={card.label} value={card.value} icon={card.icon} gradient={card.gradient} subtitle={`${card.subtitle} · ${card.trend}`} delay={0.1 + i * 0.06} />
                    ))}
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {([
                      { label: 'Total Students', value: stats?.total_students || 0, icon: GraduationCap, color: '#6366F1' },
                      { label: 'Total Teachers', value: stats?.total_teachers || 0, icon: Users, color: '#10B981' },
                      { label: 'New This Month', value: stats?.new_schools_this_month || 0, icon: Plus, color: '#F97316' },
                    ] as const).map((card, i) => (
                      <AnimatedSecondaryCard key={card.label} label={card.label} value={card.value} icon={card.icon} color={card.color} delay={0.3 + i * 0.06} />
                    ))}
                    {/* Plan Distribution */}
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 sm:p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <p className="text-xs text-[var(--muted-foreground)] font-medium mb-3">Plan Distribution</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Trial', value: stats?.trial_schools || 0, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
                          { label: 'Basic', value: stats?.basic_schools || 0, bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
                          { label: 'Standard', value: stats?.standard_schools || 0, bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
                          { label: 'Premium', value: stats?.premium_schools || 0, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
                        ].map((p) => (
                          <div key={p.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${p.bg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                            <span className={`text-[11px] font-semibold ${p.text}`}>{p.label}: {p.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Recent Activity */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-purple-500 to-pink-500" />
                    <div className="p-5 sm:p-6">
                      <h3 className="text-sm font-heading font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--primary)] to-purple-500" />
                        Recent Activity
                      </h3>
                      {activityLogs.slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {activityLogs.slice(0, 5).map((log, i) => (
                            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }} className="flex items-center gap-3 group">
                              <div className="w-9 h-9 rounded-xl bg-[var(--muted)]/30 group-hover:bg-[var(--muted)] flex items-center justify-center flex-shrink-0 transition-colors">
                                <Activity className="w-4 h-4 text-[var(--foreground)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)] truncate">{log.action.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-[var(--muted-foreground)]/60">{log.school_name} &middot; {log.super_admin_name}</p>
                              </div>
                              <span className="text-[11px] text-[var(--muted-foreground)]/60 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-14 h-14 rounded-2xl bg-[var(--muted)]/30 flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-7 h-7 text-[var(--muted-foreground)]/40" />
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)] font-medium">No activity yet</p>
                          <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">Actions will appear here</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* ─── SCHOOLS TAB ─── */}
              {activeTab === 'schools' && (
                <motion.div key="schools" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">Schools</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                        <Input placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)}
                          className="pl-9 h-10 rounded-lg" />
                      </div>
                      <Select value={statusFilter} onValueChange={val => setStatusFilter(val)}>
                        <SelectTrigger className="w-[150px] h-10">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(() => {
                    const perPage = 10;
                    const totalPages = Math.ceil(schools.length / perPage);
                    const paginatedSchools = schools.slice((schoolsPage - 1) * perPage, schoolsPage * perPage);
                    return (
                      <>
                  <div className="space-y-3">
                    {paginatedSchools.map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { setOpenMenuId(null); openSchoolDetail(school); }}>
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2540] to-[#1a4a7a] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {school.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-[var(--foreground)] truncate">{school.name}</h3>
                                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColor(school.status)}`}>{school.status}</span>
                                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${planColor(school.plan)}`}>{school.plan}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {school.student_count} students</span>
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {school.teacher_count} teachers</span>
                                  {school.suffix && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {school.suffix}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 relative" ref={openMenuId === school.id ? menuRef : undefined}>
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === school.id ? null : school.id); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors"
                                  aria-label="School actions"
                                >
                                  <MoreVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </button>
                                {openMenuId === school.id && (
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden"
                                    style={{ animation: 'fadeSlideUp 0.15s ease both' }}>
                                    <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); openModules(school); }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors text-[var(--foreground)]/80">
                                      <Layers className="w-3.5 h-3.5" /> Modules
                                    </button>
                                    <button onClick={async e => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        try {
                                          const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.RESET_ADMIN_PASSWORD(school.id), { method: 'POST' });
                                          setCredentials({ admin_identity: data.data?.admin_identity, admin_password: data.data?.temp_password });
                                          setShowCredentials(true);
                                        } catch (err: any) { toast.error(err.message); }
                                      }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors text-[var(--foreground)]/80">
                                      <Key className="w-3.5 h-3.5" /> Reset Password
                                    </button>
                                    <div className="border-t border-[var(--border)]" />
                                    <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); setSelectedSchool(school as any); setShowDelete(true); }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-red-50 transition-colors text-red-600">
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                )}
                                <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]/60" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {paginatedSchools.length === 0 && schools.length === 0 && (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-[var(--muted-foreground)]">
                          <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No schools found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Page {schoolsPage} of {totalPages} ({schools.length} schools)
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={schoolsPage <= 1} onClick={() => setSchoolsPage(p => p - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={schoolsPage >= totalPages} onClick={() => setSchoolsPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                      </>
                    );
                  })()}
                </motion.div>
              )}

              {/* ─── PENDING TAB ─── */}
              {activeTab === 'pending' && (
                <motion.div key="pending" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">Pending Approvals</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select value={pendingSortOrder} onValueChange={val => setPendingSortOrder(val as 'newest' | 'oldest')}>
                        <SelectTrigger className="w-[140px] h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => setShowCreateSchool(true)} className="bg-[var(--sidebar)] hover:bg-[var(--sidebar)]/90 text-white w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add School Manually
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[...pendingSchools].sort((a, b) => {
                      const dateA = new Date(a.created_at).getTime();
                      const dateB = new Date(b.created_at).getTime();
                      return pendingSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                    }).map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[var(--foreground)]">{school.name}</h3>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {school.email}</span>
                                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {school.phone}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {'city' in school ? (school as SchoolDetail).city : ''}, {'state' in school ? (school as SchoolDetail).state : ''}</span>
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(school.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" onClick={() => { setApproveSuffix(''); setSelectedSchool(school as SchoolDetail); setShowApproveDialog(true); }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                                  <Check className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedSchool(school as SchoolDetail); setShowReject(true); }}
                                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
                                  <X className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {pendingSchools.length === 0 && (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-[var(--muted-foreground)]">
                          <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No pending registrations</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── MODULES TAB ─── */}
              {activeTab === 'modules' && (
                <motion.div key="modules" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Module Control</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mb-6">Enable or disable features for each school. Click a school to manage its modules.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schools.filter(s => s.status === 'active').map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full" onClick={() => openModules(school)}>
                          <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sidebar)] to-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                                {school.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-[var(--foreground)] text-sm">{school.name}</h3>
                                <p className="text-xs text-[var(--muted-foreground)]">{school.student_count} students</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {MODULE_LIST.slice(0, 5).map(m => (
                                <span key={m.key} className="px-1.5 py-0.5 text-[9px] rounded bg-[var(--muted)]/40 text-[var(--muted-foreground)]">{m.label}</span>
                              ))}
                              {MODULE_LIST.length > 5 && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded bg-[var(--muted)]/30 text-[var(--muted-foreground)]">+{MODULE_LIST.length - 5} more</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── ACTIVITY TAB ─── */}
              {activeTab === 'activity' && (
                <motion.div key="activity" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Activity Log</h2>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[var(--muted)]/30">
                              <TableHead>Action</TableHead>
                              <TableHead>School</TableHead>
                              <TableHead>Admin</TableHead>
                              <TableHead>IP</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const perPage = 10;
                              const _totalPages = Math.ceil(activityLogs.length / perPage);
                              const paginatedLogs = activityLogs.slice((activityPage - 1) * perPage, activityPage * perPage);
                              return (
                                <>
                            {paginatedLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell>
                                  <Badge variant="outline" className="bg-[var(--primary)]/10 text-[var(--foreground)] border-0">
                                    {log.action.replace(/_/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[var(--foreground)]/80">{log.school_name || '—'}</TableCell>
                                <TableCell className="text-[var(--muted-foreground)]">{log.super_admin_name}</TableCell>
                                <TableCell className="text-[var(--muted-foreground)]/60 text-xs font-mono">{log.ip_address}</TableCell>
                                <TableCell className="text-[var(--muted-foreground)] text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            {activityLogs.length === 0 && (
                              <TableRow><TableCell colSpan={5} className="text-center py-8 text-[var(--muted-foreground)]">No activity recorded</TableCell></TableRow>
                            )}
                                </>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                  {(() => {
                    const totalPages = Math.ceil(activityLogs.length / 10);
                    return totalPages > 1 ? (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Page {activityPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)}>Previous</Button>
                          <Button size="sm" variant="outline" disabled={activityPage >= totalPages} onClick={() => setActivityPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* ─── DIALOGS ─── */}

      {/* School Detail Dialog */}
      <Dialog open={showSchoolDetail} onOpenChange={setShowSchoolDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">{selectedSchool?.name}</DialogTitle>
            <DialogDescription>School details and management</DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor(selectedSchool.status)}`}>{selectedSchool.status}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${planColor(selectedSchool.plan)}`}>{selectedSchool.plan}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: Mail, label: 'Email', value: selectedSchool.email },
                  { icon: Phone, label: 'Phone', value: selectedSchool.phone },
                  { icon: MapPin, label: 'Location', value: `${selectedSchool.address}, ${selectedSchool.city}, ${selectedSchool.state}` },
                  { icon: Globe, label: 'Website', value: selectedSchool.website || '—' },
                  { icon: Hash, label: 'Suffix', value: selectedSchool.suffix || 'Not assigned' },
                  { icon: Calendar, label: 'Access Until', value: selectedSchool.access_until ? new Date(selectedSchool.access_until).toLocaleDateString() : '—' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-[var(--muted)]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
                      <item.icon className="w-3 h-3" /> {item.label}
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Students', value: selectedSchool.student_count },
                  { label: 'Teachers', value: selectedSchool.teacher_count },
                  { label: 'Parents', value: selectedSchool.parent_count },
                  { label: 'Classes', value: selectedSchool.class_count },
                  { label: 'Payments', value: selectedSchool.payment_count },
                  { label: 'Terms', value: selectedSchool.term_count },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-[var(--foreground)]/5 rounded-lg text-center">
                    <p className="text-xl font-bold text-[var(--foreground)]">{item.value}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSchool.status === 'active' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setShowExtendAccess(true); }}><Clock className="w-3 h-3 mr-1" /> Extend Access</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowSuspend(true); }} className="text-amber-600 border-amber-200 hover:bg-amber-50"><Ban className="w-3 h-3 mr-1" /> Suspend</Button>
                    <Button size="sm" variant="outline" onClick={() => { if (window.confirm(`Deactivate ${selectedSchool?.name}? Users will not be able to log in.`)) handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.DEACTIVATE(selectedSchool.id)); }}
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"><PowerOff className="w-3 h-3 mr-1" /> Deactivate</Button>
                  </>
                )}
                {(selectedSchool.status === 'inactive' || selectedSchool.status === 'suspended') && (
                  <Button size="sm" onClick={() => { if (window.confirm(`Activate ${selectedSchool?.name}? This will restore access with a 90-day trial.`)) handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.ACTIVATE(selectedSchool.id)); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"><Power className="w-3 h-3 mr-1" /> Activate</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { openModules(selectedSchool); setShowSchoolDetail(false); }}>
                  <Layers className="w-3 h-3 mr-1" /> Modules
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.RESET_ADMIN_PASSWORD(selectedSchool.id), { method: 'POST' });
                    setCredentials({ admin_identity: data.data?.admin_identity, admin_password: data.data?.temp_password });
                    setShowCredentials(true);
                  } catch (e: any) { toast.error(e.message); }
                }}><Key className="w-3 h-3 mr-1" /> Reset Password</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDelete(true); }}
                  className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modules Dialog */}
      <Dialog open={showModules} onOpenChange={setShowModules}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">Modules — {selectedSchool?.name}</DialogTitle>
            <DialogDescription>Enable or disable features for this school</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {MODULE_LIST.map(mod => {
              const modData = (Array.isArray(schoolModules) ? schoolModules : []).find(m => m.module_name === mod.key);
              const isEnabled = modData?.is_enabled === 1 || (modData?.is_enabled as any) === true;
              const isToggling = togglingModule === mod.key;
              return (
                <motion.div key={mod.key}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${isEnabled ? 'border-emerald-200 bg-emerald-50/50' : 'border-[var(--border)] bg-[var(--background)]'} ${isToggling ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 ${isEnabled ? 'bg-emerald-100' : 'bg-[var(--muted)]/40'}`}>
                      <mod.icon className={`w-4 h-4 transition-colors duration-200 ${isEnabled ? 'text-emerald-600' : 'text-[var(--muted-foreground)]/60'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">{mod.label}</p>
                      {modData?.disabled_reason && !isEnabled && (
                        <p className="text-[10px] text-amber-600 mt-0.5 truncate">{modData.disabled_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="w-3 h-3 animate-spin text-[var(--muted-foreground)]" />}
                    <Switch
                      checked={isEnabled}
                      disabled={isToggling}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          setPendingDisable({ moduleName: mod.key, label: mod.label });
                          setDisabledReasonInput('');
                          setShowReasonDialog(true);
                        } else {
                          handleToggleModule(mod.key, true);
                        }
                      }}
                      aria-label={`Toggle ${mod.label}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={(open) => { setShowReasonDialog(open); if (!open) { setPendingDisable(null); setDisabledReasonInput(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Disable {pendingDisable?.label}?</DialogTitle>
            <DialogDescription>Optionally provide a reason for disabling this module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              placeholder="Reason (optional)"
              value={disabledReasonInput}
              onChange={e => setDisabledReasonInput(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowReasonDialog(false); setPendingDisable(null); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => {
                if (pendingDisable) {
                  handleToggleModule(pendingDisable.moduleName, false, disabledReasonInput || undefined);
                }
                setShowReasonDialog(false);
                setPendingDisable(null);
              }} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                Disable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">Approve Registration</DialogTitle>
            <DialogDescription>Set a suffix for {selectedSchool?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-[var(--muted-foreground)]">School Suffix (2-6 characters)</Label>
              <Input value={approveSuffix} onChange={e => setApproveSuffix(e.target.value.toLowerCase())}
                placeholder="e.g. gra, smk" className="mt-1" />
              <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">
                {!approveSuffix && selectedSchool?.name ? `Auto-generated from "${selectedSchool.name}" if left blank` : 'Leave blank to auto-generate from school name'}
              </p>
            </div>
            <Button onClick={() => handleApprove(selectedSchool!.id, approveSuffix)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading}>
              {actionLoading ? 'Approving...' : 'Approve School'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={(open) => { setShowReject(open); if (!open) setRejectReason(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reject Registration</DialogTitle>
            <DialogDescription>Reject {selectedSchool?.name}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
            <Button onClick={async () => { const ok = await handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.REJECT(selectedSchool!.id), { reason: rejectReason }); if (ok) { setShowReject(false); setRejectReason(''); } }}
              className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspend} onOpenChange={(open) => { setShowSuspend(open); if (!open) setSuspendReason(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Suspend School</DialogTitle>
            <DialogDescription>Suspend {selectedSchool?.name}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea placeholder="Reason" value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
            <Button onClick={async () => { const ok = await handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.SUSPEND(selectedSchool!.id), { reason: suspendReason }); if (ok) { setShowSuspend(false); setSuspendReason(''); } }}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={actionLoading}>
              {actionLoading ? 'Suspending...' : 'Suspend'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Access Dialog */}
      <Dialog open={showExtendAccess} onOpenChange={setShowExtendAccess}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">Extend Access</DialogTitle>
            <DialogDescription>Extend access for {selectedSchool?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-[var(--muted-foreground)]">Extend by (days)</Label>
              <div className="flex gap-2 mt-2 mb-3">
                {[30, 60, 90, 365].map(d => (
                  <button key={d} onClick={() => { setExtendDays(String(d)); setExtendPreset(d); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${extendPreset === d ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
                    {d}d
                  </button>
                ))}
              </div>
              <Input type="number" value={extendDays} onChange={e => { setExtendDays(e.target.value); setExtendPreset(null); }} className="mt-1" />
            </div>
            {parseInt(extendDays) > 0 && !isNaN(parseInt(extendDays)) && (
              <p className="text-xs text-[var(--muted-foreground)]">
                New access until: <span className="font-semibold text-[var(--foreground)]">
                  {new Date(Date.now() + parseInt(extendDays) * 86400000).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </p>
            )}
            <Button onClick={async () => {
              const days = parseInt(extendDays);
              if (isNaN(days) || days < 1) { toast.error('Enter at least 1 day'); return; }
              const ok = await handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.EXTEND_ACCESS(selectedSchool!.id), { days });
              if (ok) setShowExtendAccess(false);
            }}
              className="w-full bg-[var(--sidebar)] hover:bg-[var(--sidebar)]/90 text-white" disabled={actionLoading}>
              {actionLoading ? 'Extending...' : 'Extend Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteConfirmName(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Delete School</DialogTitle>
            <DialogDescription>This action cannot be undone. All data will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">
                You are about to permanently delete <strong>{selectedSchool?.name}</strong>. This will remove all students, teachers, results, and data associated with this school.
              </AlertDescription>
            </Alert>
            <div>
              <Label className="text-sm text-[var(--muted-foreground)]">Type school name to confirm</Label>
              <Input value={deleteConfirmName} onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={selectedSchool?.name || ''} className="mt-1" />
            </div>
            <Button onClick={async () => { const ok = await handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.DELETE(selectedSchool!.id)); if (ok) { setShowDelete(false); setDeleteConfirmName(''); } }}
              className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading || deleteConfirmName !== selectedSchool?.name}>
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2"><Key className="w-5 h-5" /> Admin Credentials</DialogTitle>
            <DialogDescription>Save these credentials — they will not be shown again.</DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 bg-[var(--muted)]/30 p-4 rounded-xl">
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase">Login Identity</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-bold text-[var(--foreground)] flex-1">{credentials.admin_identity}</p>
                  <button onClick={() => { navigator.clipboard.writeText(credentials.admin_identity); toast.success('Copied'); }}
                    className="p-1.5 hover:bg-[var(--muted)] rounded-lg transition-colors" title="Copy">
                    <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-bold text-[var(--foreground)] flex-1">{credentials.admin_password}</p>
                  <button onClick={() => { navigator.clipboard.writeText(credentials.admin_password); toast.success('Copied'); }}
                    className="p-1.5 hover:bg-[var(--muted)] rounded-lg transition-colors" title="Copy">
                    <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
                  </button>
                </div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`Identity: ${credentials.admin_identity}\nPassword: ${credentials.admin_password}`); toast.success('All credentials copied'); }}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-colors">
                Copy All
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create School Dialog */}
      <Dialog open={showCreateSchool} onOpenChange={setShowCreateSchool}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">Create New School</DialogTitle>
            <DialogDescription>Add a school directly to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">School Name *</Label>
                <Input value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} placeholder="e.g. Grace Academy" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">Email *</Label>
                <Input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} placeholder="admin@school.com" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">Phone</Label>
                <Input value={newSchool.phone} onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })} placeholder="+234..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">Suffix</Label>
                <Input value={newSchool.suffix} onChange={e => setNewSchool({ ...newSchool, suffix: e.target.value.toLowerCase() })} placeholder="Auto-generated if blank" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-[var(--muted-foreground)]">Address</Label>
                <Input value={newSchool.address} onChange={e => setNewSchool({ ...newSchool, address: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">City</Label>
                <Input value={newSchool.city} onChange={e => setNewSchool({ ...newSchool, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">State</Label>
                <Input value={newSchool.state} onChange={e => setNewSchool({ ...newSchool, state: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-[var(--muted-foreground)]">Plan</Label>
                <select value={newSchool.plan} onChange={e => setNewSchool({ ...newSchool, plan: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm mt-1">
                  <option value="trial">Trial (Free)</option>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <Button onClick={handleCreateSchool} className="w-full bg-[var(--sidebar)] hover:bg-[var(--sidebar)]/90 text-white" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create School'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

export default SuperAdminDashboard;
