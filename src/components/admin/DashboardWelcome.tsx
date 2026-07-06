import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "motion/react";
import {
  Users,
  GraduationCap,
  ClipboardText,
  Bell,
  UserPlus,
  BookOpen,
  ChartBar,
  Gear,
  CalendarBlank,
  CaretRight,
  Clock,
  Lightning,
  ArrowsClockwise,
} from "@phosphor-icons/react";

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

/* ── Mini sparkline SVG ────────────────────────────────── */
function MiniSparkline({ color, data }: { color: string; data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
    <span className="text-muted-foreground text-sm font-medium">
      {dateStr} &middot; {timeStr}
    </span>
  );
}

/* ── Gradient sparkline data (deterministic per label) ─── */
const sparkData: Record<string, number[]> = {
  Students: [12, 15, 14, 18, 16, 22, 20, 25, 24, 28, 26, 30],
  Staff: [5, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11],
  Pending: [8, 6, 9, 5, 7, 4, 6, 3, 5, 2, 4, 1],
  Messages: [3, 5, 4, 7, 6, 8, 7, 10, 9, 12, 11, 14],
};

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
      icon: Users,
      label: "Students",
      value: activeStudents,
      animated: animatedStudents,
      color: "#6366F1",
      gradient: "from-indigo-500 to-indigo-600",
      bgLight: "bg-indigo-50",
      trend: "+12%",
      action: "manage-students",
    },
    {
      icon: GraduationCap,
      label: "Staff",
      value: activeTeachers,
      animated: animatedTeachers,
      color: "#10B981",
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      trend: "+5%",
      action: "manage-users",
    },
    {
      icon: ClipboardText,
      label: "Pending",
      value: pendingResults,
      animated: animatedPending,
      color: "#F97316",
      gradient: "from-orange-500 to-amber-500",
      bgLight: "bg-orange-50",
      trend: pendingResults > 0 ? `${pendingResults}` : "0",
      action: "results-management",
    },
    {
      icon: Bell,
      label: "Messages",
      value: unreadCount,
      animated: animatedMessages,
      color: "#EC4899",
      gradient: "from-pink-500 to-rose-500",
      bgLight: "bg-pink-50",
      trend: unreadCount > 0 ? `${unreadCount}` : "0",
      action: "view-messages",
    },
  ];

  const quickActions = [
    { icon: UserPlus, label: "Register User", action: "register-user", gradient: "from-indigo-500 to-indigo-600" },
    { icon: BookOpen, label: "Manage Classes", action: "manage-classes", gradient: "from-emerald-500 to-teal-500" },
    { icon: ChartBar, label: "Results", action: "results-management", gradient: "from-orange-500 to-amber-500" },
    { icon: Gear, label: "Settings", action: "settings", gradient: "from-pink-500 to-rose-500" },
  ];

  return (
    <div ref={ref} className="space-y-6 sm:space-y-8">
      {/* ───────── HERO SECTION ───────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-white to-indigo-50/50 border border-border p-6 sm:p-8 lg:p-10"
      >
        {/* Background mesh blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/[0.04] blur-[80px]" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-pink-500/[0.04] blur-[60px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/[0.02] blur-[100px]" />
        </div>

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #6366F1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm font-medium mb-1"
            >
              <LiveDateTime />
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground tracking-tight"
            >
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                {adminName}
              </span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-2 mt-3"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-heading font-semibold border border-indigo-100">
                <Lightning className="w-3 h-3" />
                {schoolName}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-heading font-semibold">
                <CalendarBlank className="w-3 h-3" />
                {currentAcademicYear} &middot; {currentTerm}
              </span>
            </motion.div>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3 }}
            onClick={handleRefresh}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white text-sm font-heading font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-shadow cursor-pointer flex-shrink-0"
          >
            <ArrowsClockwise className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
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
              className="group relative overflow-hidden rounded-2xl bg-white border border-border p-4 sm:p-5 text-left cursor-pointer transition-shadow duration-300 hover:shadow-xl"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${stat.color}08 0%, transparent 70%)`,
                }}
              />

              {/* Gradient top accent line */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
                    style={{ boxShadow: `0 4px 14px ${stat.color}25` }}
                  >
                    <Icon weight="bold" className="w-5 h-5 text-white" />
                  </div>
                  <MiniSparkline color={stat.color} data={sparkData[stat.label]} />
                </div>

                <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground tabular-nums">
                  {stat.animated.toLocaleString()}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <span
                    className="text-[11px] font-heading font-semibold px-1.5 py-0.5 rounded-md"
                    style={{
                      color: stat.color,
                      backgroundColor: `${stat.color}10`,
                    }}
                  >
                    {stat.trend}
                  </span>
                </div>
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
          className="bg-white rounded-2xl border border-border p-5 sm:p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">
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
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-border cursor-pointer transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                    <Icon weight="bold" className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-heading font-semibold text-muted-foreground group-hover:text-foreground transition-colors text-center">
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
          className="bg-white rounded-2xl border border-border overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-5 sm:p-6">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-4">
              Academic Session
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <CalendarBlank weight="bold" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-heading font-bold text-foreground">
                    {currentAcademicYear}
                  </p>
                  <p className="text-sm text-muted-foreground">{currentTerm}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-border">
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
          className="bg-white rounded-2xl border border-border overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-heading font-semibold text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => onNavigate("view-messages")}
                  className="text-xs font-heading font-semibold text-primary hover:text-primary-hover transition-colors"
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
                          <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-snug truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.sentDate).toLocaleDateString()}
                          </p>
                        </div>
                        <CaretRight
                          weight="bold"
                          className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all mt-1 flex-shrink-0"
                        />
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Bell weight="light" className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  No new notifications
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
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
