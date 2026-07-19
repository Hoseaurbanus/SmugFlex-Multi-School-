import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { Check, Zap, Crown, Sparkles } from "lucide-react";

interface PricingSectionProps {
  id: string;
  setActiveSection: (section: string) => void;
  onRegisterClick?: () => void;
}

const plans = [
  {
    name: "Basic",
    price: 350,
    description: "Essential tools for small schools",
    icon: Zap,
    gradient: "from-[#6366F1] to-[#818CF8]",
    buttonStyle: "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.1]",
    badge: null,
    features: [
      "Up to 300 students",
      "Results management",
      "Attendance tracking",
      "Fee collection via Paystack",
      "Staff management",
      "3 admin accounts",
      "Email support",
    ],
  },
  {
    name: "Standard",
    price: 400,
    description: "Complete management suite",
    icon: Sparkles,
    gradient: "from-[#F97316] via-[#EC4899] to-[#6366F1]",
    buttonStyle: "bg-gradient-to-r from-[#6366F1] to-[#EC4899] text-white hover:opacity-90 shadow-lg shadow-[#6366F1]/25",
    badge: "POPULAR",
    features: [
      "Up to 800 students",
      "Everything in Basic",
      "CBT exams",
      "Report cards & broadsheets",
      "Parent portal",
      "Notifications & messaging",
      "5 admin accounts",
      "Priority support",
    ],
  },
  {
    name: "Premium",
    price: 500,
    description: "Advanced features for large schools",
    icon: Crown,
    gradient: "from-[#EC4899] to-[#F472B6]",
    buttonStyle: "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.1]",
    badge: null,
    features: [
      "Unlimited students",
      "Everything in Standard",
      "AI question generation",
      "Custom branding (your logo)",
      "Automated data backup",
      "WhatsApp integration",
      "Unlimited admin accounts",
      "Phone + email support",
      "Dedicated account manager",
    ],
  },
];

export function PricingSection({ id, setActiveSection, onRegisterClick }: PricingSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [studentCount, setStudentCount] = useState(200);

  useEffect(() => {
    if (isInView) setActiveSection(id);
  }, [isInView, id, setActiveSection]);

  return (
    <section
      id={id}
      ref={ref}
      className="py-24 md:py-32 bg-[#09090B] relative overflow-hidden"
    >
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#6366F1]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F97316]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 text-[#F97316] font-bold tracking-[0.2em] text-xs uppercase mb-4 px-4 py-1.5 rounded-full border border-[#F97316]/20 bg-[#F97316]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
            Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mt-3 mb-5 tracking-tight">
            Simple, Per-Student{" "}
            <span className="bg-gradient-to-r from-[#F97316] to-[#EC4899] bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
            Pay only for the students you manage. No hidden fees. Your first term is free.
          </p>
        </motion.div>

        {/* Student count calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-4 mb-14"
        >
          <span className="text-sm text-gray-400 font-medium">
            How many students?
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setStudentCount(Math.max(50, studentCount - 50))}
              className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:bg-white/[0.1] hover:text-white font-bold transition-all text-lg"
              aria-label="Decrease student count"
            >
              −
            </button>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              className="w-40 sm:w-64 accent-[#6366F1]"
              aria-label="Number of students"
            />
            <button
              onClick={() => setStudentCount(Math.min(2000, studentCount + 50))}
              className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:bg-white/[0.1] hover:text-white font-bold transition-all text-lg"
              aria-label="Increase student count"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-white">
              {studentCount.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm font-medium">students</span>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const isPopular = plan.badge === "POPULAR";
            const termCost = plan.price * studentCount;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                whileHover={{ y: -8 }}
                className={`relative rounded-2xl p-[1px] ${
                  isPopular
                    ? "bg-gradient-to-b from-[#6366F1] via-[#EC4899] to-[#F97316]"
                    : "bg-white/[0.06]"
                }`}
                style={
                  isPopular
                    ? { boxShadow: "0 0 60px rgba(99,102,241,0.15), 0 0 120px rgba(236,72,153,0.1)" }
                    : undefined
                }
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-5 py-1.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full shadow-lg">
                      <span className="text-white text-xs font-bold tracking-wider uppercase">
                        {plan.badge}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`relative rounded-2xl p-7 md:p-8 h-full flex flex-col ${
                    isPopular ? "bg-[#0f0f13]" : "bg-[#0c0c10]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-gray-500 text-lg">₦</span>
                      <span className="text-4xl font-extrabold text-white">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">
                        /student/term
                      </span>
                    </div>
                    <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-sm text-gray-400">
                        ~₦<span className="text-white font-semibold">{termCost.toLocaleString()}</span>
                        /term for {studentCount} students
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <button
                    onClick={onRegisterClick}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all mb-7 ${plan.buttonStyle}`}
                  >
                    Get Started
                  </button>

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        <div className="w-5 h-5 rounded-md bg-[#10B981]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#10B981]" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
