import { useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  FileText,
  Monitor,
  DollarSign,
  Users,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

interface FeaturesSectionProps {
  id?: string;
  setActiveSection: (section: string) => void;
}

const features = [
  {
    icon: FileText,
    title: "Results Management",
    description:
      "Enter scores, compile results, generate report cards with real-time analytics",
    color: "#6366F1",
    gradient: "from-[#6366F1] to-[#818CF8]",
    bgGlow: "#6366F1",
    span: "md:col-span-2 md:row-span-2",
    large: true,
  },
  {
    icon: Monitor,
    title: "CBT Exams",
    description:
      "Built-in computer-based testing with question banks, timed exams, and auto-scoring",
    color: "#EC4899",
    gradient: "from-[#EC4899] to-[#F472B6]",
    bgGlow: "#EC4899",
    span: "md:col-span-2",
    large: false,
  },
  {
    icon: DollarSign,
    title: "Fee Collection",
    description:
      "Collect payments online via Paystack, track balances, generate receipts",
    color: "#10B981",
    gradient: "from-[#10B981] to-[#34D399]",
    bgGlow: "#10B981",
    span: "md:col-span-1",
    large: false,
  },
  {
    icon: Users,
    title: "Staff Management",
    description:
      "Manage teachers, accountants, and admin staff with role-based access",
    color: "#F97316",
    gradient: "from-[#F97316] to-[#FB923C]",
    bgGlow: "#F97316",
    span: "md:col-span-1",
    large: false,
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    description:
      "Mark and track student attendance with detailed reports and summaries",
    color: "#06B6D4",
    gradient: "from-[#06B6D4] to-[#22D3EE]",
    bgGlow: "#06B6D4",
    span: "md:col-span-2",
    large: false,
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Generate comprehensive reports, broadsheets, and performance analytics",
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6] to-[#A78BFA]",
    bgGlow: "#8B5CF6",
    span: "md:col-span-2 md:row-span-2",
    large: true,
  },
];

export default function FeaturesSection({
  id,
  setActiveSection,
}: FeaturesSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { amount: 0.2 });

  useEffect(() => {
    if (isInView) setActiveSection("features");
  }, [isInView, setActiveSection]);

  return (
    <section
      ref={ref}
      id={id}
      className="relative py-24 md:py-32 bg-[#09090B] overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
          style={{
            background:
              "radial-gradient(circle, #6366F1 0%, #EC4899 50%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 mb-6"
          >
            <span className="text-sm font-medium text-[#818CF8]">
              Everything you need
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 text-white"
          >
            One platform.{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Total control.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto"
          >
            Everything your school needs to operate efficiently — from student
            records to financial management, all in one beautiful dashboard.
          </motion.p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={`group relative rounded-3xl border border-white/[0.06] bg-[#111113]/60 backdrop-blur-sm p-6 md:p-8 overflow-hidden transition-all duration-300 hover:border-white/10 ${feature.span} ${
                feature.large ? "min-h-[280px]" : "min-h-[200px]"
              }`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -4 }}
            >
              {/* Hover glow */}
              <div
                className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                style={{
                  background: `radial-gradient(circle at center, ${feature.bgGlow}15 0%, transparent 70%)`,
                }}
              />

              {/* Background pattern for large cards */}
              {feature.large && (
                <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" aria-hidden="true">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full"
                    style={{ color: feature.color }}
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                    />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div
                className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-5 shadow-lg`}
                style={{
                  boxShadow: `0 8px 24px ${feature.bgGlow}25`,
                }}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-white/90 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base group-hover:text-gray-300 transition-colors">
                {feature.description}
              </p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${feature.color}, transparent)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
