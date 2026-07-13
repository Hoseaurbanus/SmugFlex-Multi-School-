import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { superAdminAuth } from '../../services/superAdminAuthService';
import { API_CONFIG } from '../../config/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School, Shield, LogOut, Users, Search, Check, X, Ban, Clock,
  Plus, RefreshCw, Activity, BarChart3, ChevronDown, Menu,
  Settings, Bell, BookOpen, FileText, Calculator, ClipboardList,
  GraduationCap, Trash2, Edit, Eye, Power, PowerOff, Key,
  ChevronRight, AlertTriangle, Globe, Mail, Phone, MapPin,
  Calendar, Hash, Layers, UserCog, Download, MoreVertical
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('super_admin_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_CONFIG.BASE_URL}${url}`, { ...options, headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
    return data;
  };

  const searchRef = useRef(search);
  const statusFilterRef = useRef(statusFilter);
  searchRef.current = search;
  statusFilterRef.current = statusFilter;

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.STATS);
      setStats(data.data);
    } catch { toast.error('Failed to load stats'); }
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
  }, [activeTab, fetchStats, fetchSchools, fetchPending, fetchActivity]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchSchools(); }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchSchools]);

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
      setSchoolModules(data.data);
    } catch { toast.error('Failed to load modules'); }
  };

  const handleToggleModule = async (moduleName: string, enabled: boolean) => {
    if (!selectedSchool) return;
    const updated = schoolModules.map(m => m.module_name === moduleName ? { ...m, is_enabled: enabled ? 1 : 0 } : m);
    setSchoolModules(updated);
    try {
      await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.MODULES(selectedSchool.id), {
        method: 'PUT', body: JSON.stringify({ modules: [{ module_name: moduleName, is_enabled: enabled ? 1 : 0 }] })
      });
      toast.success(`${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) { toast.error(e.message); fetchModules(selectedSchool.id); }
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0A2540] text-white z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-[#0A2540]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SmugFlex</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.key ? 'bg-white/15 text-white shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-[#0A2540]">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500 hidden sm:block">
            {superAdminAuth.getCurrentUser()?.username}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0A2540] flex items-center justify-center text-white text-xs font-bold">
            {superAdminAuth.getCurrentUser()?.first_name?.[0]}{superAdminAuth.getCurrentUser()?.last_name?.[0]}
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0A2540]" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ─── DASHBOARD TAB ─── */}
              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
                  {/* Welcome Hero */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#0d2f52] to-[#112240] p-6 sm:p-8">
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
                    {[
                      { label: 'Total Schools', value: stats?.total_schools || 0, icon: School, gradient: 'from-[#0A2540] to-[#1a3a5c]', subtitle: 'All registered' },
                      { label: 'Active', value: stats?.active_schools || 0, icon: Check, gradient: 'from-emerald-500 to-teal-500', subtitle: 'Running now' },
                      { label: 'Pending', value: stats?.pending_schools || 0, icon: Clock, gradient: 'from-amber-500 to-orange-500', subtitle: 'Awaiting review' },
                      { label: 'Suspended', value: stats?.suspended_schools || 0, icon: Ban, gradient: 'from-red-500 to-rose-500', subtitle: 'On hold' },
                    ].map((card, i) => {
                      const animVal = useAnimatedCounter(card.value);
                      const Icon = card.icon;
                      return (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-3`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 tabular-nums">{animVal.toLocaleString()}</p>
                            <p className="text-sm text-gray-500 font-medium mt-0.5">{card.label}</p>
                            <p className="text-[11px] text-gray-400">{card.subtitle}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Total Students', value: stats?.total_students || 0, icon: GraduationCap, color: '#6366F1' },
                      { label: 'Total Teachers', value: stats?.total_teachers || 0, icon: Users, color: '#10B981' },
                      { label: 'New This Month', value: stats?.new_schools_this_month || 0, icon: Plus, color: '#F97316' },
                    ].map((card, i) => {
                      const animVal = useAnimatedCounter(card.value);
                      const Icon = card.icon;
                      return (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} whileHover={{ y: -3 }} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4" style={{ color: card.color }} />
                            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                          </div>
                          <p className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 tabular-nums">{animVal.toLocaleString()}</p>
                        </motion.div>
                      );
                    })}
                    {/* Plan Distribution */}
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <p className="text-xs text-gray-500 font-medium mb-3">Plan Distribution</p>
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
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="h-1 bg-gradient-to-r from-[#0A2540] via-purple-500 to-pink-500" />
                    <div className="p-5 sm:p-6">
                      <h3 className="text-sm font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#0A2540] to-purple-500" />
                        Recent Activity
                      </h3>
                      {activityLogs.slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {activityLogs.slice(0, 5).map((log, i) => (
                            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }} className="flex items-center gap-3 group">
                              <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                <Activity className="w-4 h-4 text-[#0A2540]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{log.action.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-gray-400">{log.school_name} &middot; {log.super_admin_name}</p>
                              </div>
                              <span className="text-[11px] text-gray-300 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-7 h-7 text-gray-200" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">No activity yet</p>
                          <p className="text-xs text-gray-300 mt-1">Actions will appear here</p>
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
                    <h2 className="text-2xl font-bold text-[#0A2540]">Schools</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)}
                          className="pl-9 h-10 rounded-lg border-gray-200" />
                      </div>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {schools.map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { setOpenMenuId(null); openSchoolDetail(school); }}>
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2540] to-[#1a4a7a] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {school.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-[#0A2540] truncate">{school.name}</h3>
                                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColor(school.status)}`}>{school.status}</span>
                                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${planColor(school.plan)}`}>{school.plan}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {school.student_count} students</span>
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {school.teacher_count} teachers</span>
                                  {school.suffix && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {school.suffix}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 relative" ref={openMenuId === school.id ? menuRef : undefined}>
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === school.id ? null : school.id); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                  aria-label="School actions"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                                {openMenuId === school.id && (
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
                                    style={{ animation: 'fadeSlideUp 0.15s ease both' }}>
                                    <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); openModules(school); }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-blue-50 transition-colors text-gray-700">
                                      <Layers className="w-3.5 h-3.5" /> Modules
                                    </button>
                                    <button onClick={async e => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        try {
                                          const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.RESET_ADMIN_PASSWORD(school.id));
                                          setCredentials({ admin_identity: data.data?.admin_identity, admin_password: data.data?.temp_password });
                                          setShowCredentials(true);
                                        } catch (err: any) { toast.error(err.message); }
                                      }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-blue-50 transition-colors text-gray-700">
                                      <Key className="w-3.5 h-3.5" /> Reset Password
                                    </button>
                                    <div className="border-t border-gray-100" />
                                    <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); setSelectedSchool(school as any); setShowDelete(true); }}
                                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2.5 hover:bg-red-50 transition-colors text-red-600">
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {schools.length === 0 && (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-8 text-center text-gray-400">
                          <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No schools found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── PENDING TAB ─── */}
              {activeTab === 'pending' && (
                <motion.div key="pending" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#0A2540]">Pending Approvals</h2>
                    <Button onClick={() => setShowCreateSchool(true)} className="bg-[#0A2540] hover:bg-[#0d3558] text-white">
                      <Plus className="w-4 h-4 mr-2" /> Add School Manually
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {pendingSchools.map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[#0A2540]">{school.name}</h3>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {school.email}</span>
                                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {school.phone}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {school.city}, {school.state}</span>
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(school.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" onClick={() => { setApproveSuffix(''); setSelectedSchool(school); setShowApproveDialog(true); }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                                  <Check className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedSchool(school); setShowReject(true); }}
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
                        <CardContent className="p-8 text-center text-gray-400">
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
                  <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Module Control</h2>
                  <p className="text-sm text-gray-500 mb-6">Enable or disable features for each school. Click a school to manage its modules.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schools.filter(s => s.status === 'active').map((school, i) => (
                      <motion.div key={school.id} variants={slideIn} transition={{ delay: i * 0.03 }}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full" onClick={() => openModules(school)}>
                          <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2540] to-[#1a4a7a] flex items-center justify-center text-white font-bold text-sm">
                                {school.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-[#0A2540] text-sm">{school.name}</h3>
                                <p className="text-xs text-gray-500">{school.student_count} students</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {MODULE_LIST.slice(0, 5).map(m => (
                                <span key={m.key} className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-100 text-emerald-700">{m.label}</span>
                              ))}
                              {MODULE_LIST.length > 5 && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded bg-gray-100 text-gray-500">+{MODULE_LIST.length - 5} more</span>
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
                  <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Activity Log</h2>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">School</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Admin</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activityLogs.map(log => (
                              <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#0A2540]/10 text-[#0A2540]">
                                    {log.action.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{log.school_name || '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{log.super_admin_name}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                            {activityLogs.length === 0 && (
                              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No activity recorded</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
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
            <DialogTitle className="text-[#0A2540]">{selectedSchool?.name}</DialogTitle>
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
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <item.icon className="w-3 h-3" /> {item.label}
                    </div>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
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
                  <div key={item.label} className="p-3 bg-[#0A2540]/5 rounded-lg text-center">
                    <p className="text-xl font-bold text-[#0A2540]">{item.value}</p>
                    <p className="text-[10px] text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSchool.status === 'active' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setShowExtendAccess(true); }}><Clock className="w-3 h-3 mr-1" /> Extend Access</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowSuspend(true); }} className="text-amber-600 border-amber-200 hover:bg-amber-50"><Ban className="w-3 h-3 mr-1" /> Suspend</Button>
                    <Button size="sm" variant="outline" onClick={() => { handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.DEACTIVATE(selectedSchool.id)); }}
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"><PowerOff className="w-3 h-3 mr-1" /> Deactivate</Button>
                  </>
                )}
                {(selectedSchool.status === 'inactive' || selectedSchool.status === 'suspended') && (
                  <Button size="sm" onClick={() => handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.ACTIVATE(selectedSchool.id))}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"><Power className="w-3 h-3 mr-1" /> Activate</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { openModules(selectedSchool); setShowSchoolDetail(false); }}>
                  <Layers className="w-3 h-3 mr-1" /> Modules
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const data = await apiCall(API_CONFIG.ENDPOINTS.SUPER_ADMIN.RESET_ADMIN_PASSWORD(selectedSchool.id));
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
            <DialogTitle className="text-[#0A2540]">Modules — {selectedSchool?.name}</DialogTitle>
            <DialogDescription>Enable or disable features for this school</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MODULE_LIST.map(mod => {
              const modData = schoolModules.find(m => m.module_name === mod.key);
              const isEnabled = modData?.is_enabled === 1 || modData?.is_enabled === true;
              return (
                <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <mod.icon className={`w-4 h-4 ${isEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{mod.label}</p>
                      {modData?.disabled_reason && <p className="text-[10px] text-red-500">{modData.disabled_reason}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleToggleModule(mod.key, !isEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Approve Registration</DialogTitle>
            <DialogDescription>Set a suffix for {selectedSchool?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">School Suffix (2-6 characters)</Label>
              <Input value={approveSuffix} onChange={e => setApproveSuffix(e.target.value.toLowerCase())}
                placeholder="e.g. gra, smk" className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-1">Leave blank to auto-generate from school name</p>
            </div>
            <Button onClick={() => handleApprove(selectedSchool!.id, approveSuffix)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading}>
              {actionLoading ? 'Approving...' : 'Approve School'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reject Registration</DialogTitle>
            <DialogDescription>Reject {selectedSchool?.name}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <Button onClick={() => { handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.REJECT(selectedSchool!.id), { reason: rejectReason }); setShowReject(false); setRejectReason(''); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspend} onOpenChange={setShowSuspend}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Suspend School</DialogTitle>
            <DialogDescription>Suspend {selectedSchool?.name}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Reason" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
            <Button onClick={() => { handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.SUSPEND(selectedSchool!.id), { reason: suspendReason }); setShowSuspend(false); setSuspendReason(''); }}
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
            <DialogTitle className="text-[#0A2540]">Extend Access</DialogTitle>
            <DialogDescription>Extend access for {selectedSchool?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Extend by (days)</Label>
              <Input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={() => { handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.EXTEND_ACCESS(selectedSchool!.id), { days: parseInt(extendDays) }); setShowExtendAccess(false); }}
              className="w-full bg-[#0A2540] hover:bg-[#0d3558] text-white" disabled={actionLoading}>
              {actionLoading ? 'Extending...' : 'Extend Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
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
            <Button onClick={() => { handleAction(API_CONFIG.ENDPOINTS.SUPER_ADMIN.DELETE(selectedSchool!.id)); setShowDelete(false); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>
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
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Login Identity</p>
                <p className="text-sm font-mono font-bold text-[#0A2540]">{credentials.admin_identity}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Password</p>
                <p className="text-sm font-mono font-bold text-[#0A2540]">{credentials.admin_password}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create School Dialog */}
      <Dialog open={showCreateSchool} onOpenChange={setShowCreateSchool}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Create New School</DialogTitle>
            <DialogDescription>Add a school directly to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">School Name *</Label>
                <Input value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} placeholder="e.g. Grace Academy" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Email *</Label>
                <Input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} placeholder="admin@school.com" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Phone</Label>
                <Input value={newSchool.phone} onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })} placeholder="+234..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Suffix</Label>
                <Input value={newSchool.suffix} onChange={e => setNewSchool({ ...newSchool, suffix: e.target.value.toLowerCase() })} placeholder="Auto-generated if blank" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-600">Address</Label>
                <Input value={newSchool.address} onChange={e => setNewSchool({ ...newSchool, address: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">City</Label>
                <Input value={newSchool.city} onChange={e => setNewSchool({ ...newSchool, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">State</Label>
                <Input value={newSchool.state} onChange={e => setNewSchool({ ...newSchool, state: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Plan</Label>
                <select value={newSchool.plan} onChange={e => setNewSchool({ ...newSchool, plan: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm mt-1">
                  <option value="trial">Trial (Free)</option>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <Button onClick={handleCreateSchool} className="w-full bg-[#0A2540] hover:bg-[#0d3558] text-white" disabled={actionLoading}>
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
