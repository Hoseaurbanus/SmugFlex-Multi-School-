import { motion, useInView, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Trophy,
  Monitor,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  CreditCard,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Timer,
  Star,
  CircleDollarSign,
  Receipt,
  PiggyBank,
} from "lucide-react";

interface PlatformShowcaseProps {
  id: string;
  setActiveSection: (section: string) => void;
}

const tabs = [
  { key: "results", label: "Results", icon: Trophy },
  { key: "cbt", label: "CBT Exam", icon: Monitor },
  { key: "fees", label: "Fee Management", icon: Wallet },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function ResultsPanel({ isInView }: { isInView: boolean }) {
  const students = [
    { name: "Adebayo Chioma", score: 92, grade: "A1", pos: 1, trend: "up" },
    { name: "Okafor David", score: 87, grade: "A1", pos: 2, trend: "up" },
    { name: "Ibrahim Fatima", score: 84, grade: "B2", pos: 3, trend: "down" },
    { name: "Eze Samuel", score: 79, grade: "B2", pos: 4, trend: "up" },
    { name: "Adeyemi Blessing", score: 76, grade: "B3", pos: 5, trend: "down" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Class Average", value: "78.4%", icon: TrendingUp, color: "text-emerald-400" },
          { label: "Highest Score", value: "92%", icon: Star, color: "text-amber-400" },
          { label: "Total Students", value: "42", icon: Users, color: "text-indigo-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-white/5 rounded-xl p-3 border border-white/10"
          >
            <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} />
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-white/40">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            JSS 2A — First Term Results
          </span>
          <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
            2025/2026
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {students.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                {s.pos}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{s.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    s.grade.startsWith("A")
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {s.grade}
                </span>
                <span className="text-sm font-bold text-white w-8 text-right">{s.score}</span>
                {s.trend === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-400 rotate-90" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CbtPanel({ isInView }: { isInView: boolean }) {
  const [selected, setSelected] = useState<number | null>(0);

  const questions = [
    { q: "What is the chemical formula for water?", options: ["CO2", "H2O", "NaCl", "O2"], correct: 1 },
    { q: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
    { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correct: 2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Biology 101</div>
            <div className="text-[10px] text-white/40">30 questions · 45 mins</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
          <Timer className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold text-red-400 tabular-nums">32:14</span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < 3
                ? "bg-emerald-500"
                : i === 3
                  ? "bg-indigo-500"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            Q4
          </span>
          <span className="text-xs text-white/40">of 30</span>
        </div>
        <p className="text-sm font-medium text-white mb-4 leading-relaxed">
          {questions[0].q}
        </p>
        <div className="space-y-2">
          {["A. CO₂", "B. H₂O", "C. NaCl", "D. O₂"].map((opt, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                selected === i
                  ? "bg-indigo-500/20 border-indigo-500/50 text-white border"
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="font-medium">{opt}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/10 transition-colors">
          Previous
        </button>
        <button className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
          Next Question
        </button>
      </div>
    </div>
  );
}

function FeesPanel({ isInView }: { isInView: boolean }) {
  const collections = [
    { label: "Tuition", amount: "₦8,200,000", pct: 92, color: "bg-emerald-500" },
    { label: "Development Levy", amount: "₦1,400,000", pct: 75, color: "bg-indigo-500" },
    { label: "Sports Fee", amount: "₦600,000", pct: 60, color: "bg-amber-500" },
    { label: "Exam Fee", amount: "₦950,000", pct: 85, color: "bg-pink-500" },
  ];

  const recentPayments = [
    { name: "Adebayo C.", amount: "₦120,000", time: "2m ago", status: "success" },
    { name: "Okafor D.", amount: "₦85,000", time: "15m ago", status: "success" },
    { name: "Ibrahim F.", amount: "₦120,000", time: "1h ago", status: "pending" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Collected", value: "₦12.5M", icon: CircleDollarSign, color: "text-emerald-400", bg: "from-emerald-500/10 to-transparent" },
          { label: "Outstanding", value: "₦3.2M", icon: AlertTriangle, color: "text-amber-400", bg: "from-amber-500/10 to-transparent" },
          { label: "Paid Students", value: "892", icon: CheckCircle2, color: "text-indigo-400", bg: "from-indigo-500/10 to-transparent" },
          { label: "Defaulters", value: "67", icon: XCircle, color: "text-red-400", bg: "from-red-500/10 to-transparent" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`bg-gradient-to-br ${stat.bg} rounded-xl p-3 border border-white/10`}
          >
            <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} />
            <div className="text-base font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-white/40">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
          Collection Progress
        </div>
        <div className="space-y-3">
          {collections.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">{c.label}</span>
                <span className="text-white/40 font-medium">{c.amount}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${c.pct}%` } : {}}
                  transition={{ duration: 1, delay: 0.7 + i * 0.15 }}
                  className={`h-full rounded-full ${c.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Recent Payments
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {recentPayments.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{p.name}</div>
                <div className="text-[10px] text-white/40">{p.time}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white">{p.amount}</div>
                <div
                  className={`text-[10px] ${
                    p.status === "success" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {p.status === "success" ? "Paid" : "Pending"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlatformShowcase({ id, setActiveSection }: PlatformShowcaseProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [activeTab, setActiveTab] = useState<TabKey>("results");

  useEffect(() => {
    if (isInView) setActiveSection(id);
  }, [isInView, id, setActiveSection]);

  return (
    <section id={id} ref={ref} className="py-20 md:py-28 bg-[#09090B] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(236,72,153,0.08),transparent_50%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-indigo-400 font-bold tracking-[0.2em] text-xs uppercase mb-4 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            Platform Preview
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
            See SmugFlex{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              in Action
            </span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-base md:text-lg">
            Explore the features that help schools manage results, exams, and finances in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex bg-white/5 rounded-2xl p-1.5 border border-white/10 backdrop-blur-sm overflow-x-auto max-w-full scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    isActive ? "text-white" : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-[#111113] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-[#18181B] border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 ml-3">
                <div className="bg-white/5 rounded-md px-3 py-1 text-[10px] text-white/30 border border-white/5 text-center">
                  app.smugflex.com/{activeTab === "results" ? "results" : activeTab === "cbt" ? "exams" : "fees"}
                </div>
              </div>
            </div>

            <div className="p-5 min-h-[420px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === "results" && <ResultsPanel isInView={isInView} />}
                  {activeTab === "cbt" && <CbtPanel isInView={isInView} />}
                  {activeTab === "fees" && <FeesPanel isInView={isInView} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
