import { useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  ArrowRight,
  CreditCard,
  Clock,
  Sparkles,
  TrendingUp,
  Users,
  BarChart3,
  ChevronDown,
} from "lucide-react";

interface HeroSectionProps {
  id?: string;
  setActiveSection: (section: string) => void;
  onLoginClick: () => void;
}

export default function HeroSection({
  id,
  setActiveSection,
  onLoginClick,
}: HeroSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (isInView) setActiveSection("hero");
  }, [isInView, setActiveSection]);

  return (
    <section
      ref={ref}
      id={id}
      className="relative min-h-screen flex items-center overflow-hidden bg-[#09090B]"
    >
      {/* Mesh gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-30 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, #6366F1 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, #EC4899 0%, transparent 70%)",
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating decorative elements */}
      {[
        { icon: TrendingUp, x: "10%", y: "20%", delay: 0, color: "#6366F1" },
        { icon: Users, x: "85%", y: "25%", delay: 1, color: "#EC4899" },
        { icon: BarChart3, x: "5%", y: "75%", delay: 2, color: "#10B981" },
        { icon: Sparkles, x: "90%", y: "70%", delay: 0.5, color: "#F97316" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:flex"
          style={{ left: item.x, top: item.y }}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          <div
            className="p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
            style={{ boxShadow: `0 0 30px ${item.color}20` }}
          >
            <item.icon className="w-5 h-5" style={{ color: item.color }} />
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#6366F1]/10 to-[#EC4899]/10 border border-[#6366F1]/20 mb-8"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#10B981]">
                <Sparkles className="w-3 h-3 text-white" />
              </span>
              <span className="text-sm font-medium text-gray-300">
                New v2.0 — Now with CBT Exams
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 text-white"
            >
              Run Your School{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #6366F1 0%, #A855F7 40%, #EC4899 80%, #F97316 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Smarter
              </span>
              ,<br />
              Not Harder
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-400 max-w-lg mb-10 leading-relaxed"
            >
              The all-in-one platform for modern schools. Manage results,
              attendance, fees, and CBT exams — all in one place.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <button
                onClick={onLoginClick}
                className="relative group inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-bold text-white rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] transition-all" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <span className="relative z-10">Get Started Free</span>
                <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-6"
            >
              {[
                { icon: CreditCard, text: "No credit card required" },
                { icon: Clock, text: "Setup in 5 minutes" },
                { icon: Sparkles, text: "Free first term" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <item.icon className="w-4 h-4 text-[#10B981]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right side — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 60, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden md:block lg:block"
          >
            {/* Main dashboard card */}
            <div className="relative rounded-3xl border border-white/10 bg-[#111113]/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
              {/* Dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Dashboard Overview</p>
                  <p className="text-lg font-bold text-white">
                    Welcome back, Admin
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                </div>
              </div>

              {/* Stat cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  {
                    label: "Total Students",
                    value: "1,248",
                    change: "+12%",
                    color: "#6366F1",
                  },
                  {
                    label: "Revenue",
                    value: "₦4.2M",
                    change: "+28%",
                    color: "#10B981",
                  },
                  {
                    label: "Pass Rate",
                    value: "94.7%",
                    change: "+3.2%",
                    color: "#EC4899",
                  },
                  {
                    label: "Staff Active",
                    value: "86",
                    change: "+5",
                    color: "#F97316",
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-bold text-white">
                        {stat.value}
                      </p>
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          color: stat.color,
                          backgroundColor: `${stat.color}15`,
                        }}
                      >
                        {stat.change}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mini chart */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-gray-500 mb-3">
                  Student Performance Trend
                </p>
                <div className="flex items-end gap-1.5 h-16">
                  {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map(
                    (h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          background: `linear-gradient(to top, #6366F1, #EC4899)`,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{
                          delay: 0.8 + i * 0.05,
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Floating stat cards */}
            <motion.div
              className="absolute -top-6 -right-6 p-4 rounded-2xl bg-[#111113]/90 backdrop-blur-xl border border-white/10 shadow-xl"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#10B981]/15">
                  <TrendingUp className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">This Week</p>
                  <p className="text-sm font-bold text-white">
                    +127 Students
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-[#111113]/90 backdrop-blur-xl border border-white/10 shadow-xl"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6366F1]/15">
                  <BarChart3 className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Exam Scores</p>
                  <p className="text-sm font-bold text-white">Avg 78.3%</p>
                </div>
              </div>
            </motion.div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#6366F1]/10 via-[#EC4899]/10 to-[#06B6D4]/10 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-xs text-gray-600 tracking-widest uppercase">
          Scroll
        </span>
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </motion.div>
    </section>
  );
}
