import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "motion/react";
import {
  Users,
  GraduationCap,
  ClipboardList,
  Bell,
  UserPlus,
  BookOpen,
  BarChart3,
  Settings,
  Calendar,
  ChevronRight,
  Clock,
  Zap,
  RefreshCw,
  Mail,
  FileText,
} from "lucide-react";

interface DashboardWelcomeProps {
  adminName: string;
  schoolName: string;
  currentAcademicYear: string;
  currentTerm: string;
  activeStudents: number;
  activeTeachers: number;
  pendingResults: number;
  unreadCount: number;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    sentDate: string;
    isRead: boolean;
  }>;
  onNavigate: (id: string) => void;
  onRefresh: () => Promise<void>;
}

/* ── Animated counter hook ─────────────────────────────── */
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

/* ── Date/time display ─────────────────────────────────── */
function LiveDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="text-sm font-medium">
      {dateStr} &middot; {timeStr}
    </span>
  );
}

/* ── Floating orb (decorative) ──────────────────────────── */
function FloatingOrb({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full blur-2xl opacity-30 pointer-events-none ${className}`}
    />
  );
}

export default function DashboardWelcome({
  adminName,
  schoolName,
  currentAcademicYear,
  currentTerm,
  activeStudents,
  activeTeachers,
  pendingResults,
  unreadCount,
  notifications,
  onNavigate,
  onRefresh,
}: DashboardWelcomeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [refreshing, setRefreshing] = useState(false);

  const animatedStudents = useAnimatedCounter(activeStudents);
  const animatedTeachers = useAnimatedCounter(activeTeachers);
  const animatedPending = useAnimatedCounter(pendingResults);
  const animatedMessages = useAnimatedCounter(unreadCount);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [onRefresh]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    {
      icon: Student,
      label: "Students",
      value: activeStudents,
      animated: animatedStudents,
      color: "#6366F1",
      bgGradient: "from-indigo-500 to-violet-500",
      bgLight: "bg-indigo-50",
      ring: "ring-indigo-100",
      action: "manage-students",
      subtitle: "Active enrollment",
    },
    {
      icon: ChalkboardTeacher,
      label: "Staff",
      value: activeTeachers,
      animated: animatedTeachers,
      color: "#10B981",
      bgGradient: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50",
      ring: "ring-emerald-100",
      action: "manage-users",
      subtitle: "Teaching & non-teaching",
    },
    {
      icon: ClipboardText,
      label: "Pending",
      value: pendingResults,
      animated: animatedPending,
      color: "#F97316",
      bgGradient: "from-orange-500 to-amber-500",
      bgLight: "bg-orange-50",
      ring: "ring-orange-100",
      action: "results-management",
      subtitle: "Awaiting approval",
    },
    {
      icon: EnvelopeSimpleOpen,
      label: "Messages",
      value: unreadCount,
      animated: animatedMessages,
      color: "#EC4899",
      bgGradient: "from-pink-500 to-rose-500",
      bgLight: "bg-pink-50",
      ring: "ring-pink-100",
      action: "view-messages",
      subtitle: "Unread notifications",
    },
  ];

  const quickActions = [
    { icon: UserPlus, label: "Register User", action: "register-user", gradient: "from-[#0A2540] to-[#1a3a5c]" },
    { icon: BookOpen, label: "Manage Classes", action: "manage-classes", gradient: "from-emerald-500 to-teal-500" },
    { icon: ChartBar, label: "Results", action: "results-management", gradient: "from-orange-500 to-amber-500" },
    { icon: Gear, label: "Settings", action: "settings", gradient: "from-[#0A2540] to-[#1a3a5c]" },
  ];

  return (
    <div ref={ref} className="space-y-5 sm:space-y-6">
      {/* ───────── HERO SECTION ───────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2540] via-[#0d2f52] to-[#112240] p-6 sm:p-8 lg:p-10"
      >
        {/* Animated background orbs */}
        <FloatingOrb className="w-48 h-48 bg-indigo-400 -top-12 -right-12" />
        <FloatingOrb className="w-36 h-36 bg-cyan-400 bottom-0 left-0" />
        <FloatingOrb className="w-24 h-24 bg-purple-400 top-1/2 left-1/3" />

        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10">
          {/* Top row: date + refresh */}
          <div className="flex items-center justify-between mb-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.1 }}
              className="text-white/50 text-sm"
            >
              <LiveDateTime />
            </motion.p>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3 }}
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </motion.button>
          </div>

          {/* Greeting */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white leading-tight"
          >
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
              {adminName}
            </span>
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.5, delay: 0.5, ease: "easeInOut" }}
              className="inline-block ml-2"
            >
              👋
            </motion.span>
          </motion.h1>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-2 mt-4"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold">
              <Zap className="w-3 h-3 text-amber-300" />
              {schoolName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/70 text-xs font-semibold">
              <Calendar className="w-3 h-3" />
              {currentAcademicYear} &middot; {currentTerm}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ───────── STAT CARDS ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.45 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(stat.action)}
              className="group relative bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 text-left cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300`}
                  style={{ boxShadow: `0 4px 14px ${stat.color}25` }}
                >
                  <Icon weight="bold" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>

                {/* Number */}
                <p className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 tabular-nums leading-none">
                  {stat.animated.toLocaleString()}
                </p>

                {/* Label */}
                <p className="text-sm text-gray-500 font-medium mt-1">{stat.label}</p>

                {/* Subtitle */}
                <p className="text-[11px] text-gray-400 mt-0.5">{stat.subtitle}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ───────── BOTTOM GRID ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* ── Quick Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <h3 className="text-sm font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#0A2540] to-[#1a3a5c]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate(item.action)}
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 cursor-pointer transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <Icon weight="bold" className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-heading font-semibold text-gray-500 group-hover:text-gray-900 transition-colors text-center">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Academic Session ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.45 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="h-1 bg-gradient-to-r from-[#0A2540] via-purple-500 to-pink-500" />
          <div className="p-5 sm:p-6">
            <h3 className="text-sm font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
              Academic Session
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Calendar weight="bold" className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-heading font-bold text-gray-900">
                    {currentAcademicYear}
                  </p>
                  <p className="text-sm text-gray-500">{currentTerm}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-sm font-heading font-semibold text-emerald-600">
                  In Progress
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-heading font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-rose-500" />
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => onNavigate("view-messages")}
                  className="text-xs font-heading font-semibold text-[#0A2540] hover:underline transition-colors"
                >
                  View all
                </button>
              )}
            </div>
            {unreadCount > 0 ? (
              <div className="space-y-3">
                {notifications
                  .filter((n) => !n.isRead)
                  .slice(0, 3)
                  .map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      className="cursor-pointer group"
                      onClick={() => onNavigate("view-messages")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors leading-snug truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-300 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.sentDate).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight
                          weight="bold"
                          className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all mt-1 flex-shrink-0"
                        />
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Bell weight="light" className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  No new notifications
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  You're all caught up!
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
