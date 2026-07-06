import { motion, useInView } from "motion/react";
import { useRef, useEffect } from "react";
import { UserPlus, Users, Rocket } from "lucide-react";

interface HowItWorksProps {
  id: string;
  setActiveSection: (section: string) => void;
}

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Register Your School",
    description:
      "Sign up in 2 minutes. Choose your school name, set up classes, and invite your team.",
    gradient: "from-[#6366F1] to-[#8B5CF6]",
    glowColor: "rgba(99,102,241,0.3)",
  },
  {
    icon: Users,
    number: "02",
    title: "Add Students & Staff",
    description:
      "Import students via CSV or add them manually. Assign teachers to classes and subjects.",
    gradient: "from-[#F97316] to-[#FB923C]",
    glowColor: "rgba(249,115,22,0.3)",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Start Managing",
    description:
      "Enter results, track attendance, collect fees, and generate report cards — all from one dashboard.",
    gradient: "from-[#EC4899] to-[#F472B6]",
    glowColor: "rgba(236,72,153,0.3)",
  },
];

export function HowItWorks({ id, setActiveSection }: HowItWorksProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  useEffect(() => {
    const observerRef = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActiveSection(id);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observerRef.observe(ref.current);
    return () => observerRef.disconnect();
  }, [id, setActiveSection]);

  return (
    <section
      id={id}
      ref={ref}
      className="py-24 md:py-32 bg-[#09090B] relative overflow-hidden"
    >
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6366F1]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#EC4899]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 text-[#6366F1] font-bold tracking-[0.2em] text-xs uppercase mb-4 px-4 py-1.5 rounded-full border border-[#6366F1]/20 bg-[#6366F1]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            How It Works
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mt-3 mb-5 tracking-tight">
            Up and Running in{" "}
            <span className="bg-gradient-to-r from-[#6366F1] via-[#EC4899] to-[#F97316] bg-clip-text text-transparent">
              3 Steps
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
            Get your school online in minutes. No technical skills required.
          </p>
        </motion.div>

        {/* Vertical Timeline */}
        <div className="relative max-w-5xl mx-auto">
          {/* Center line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#6366F1]/50 via-[#EC4899]/50 to-[#F97316]/50 md:-translate-x-px" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.2 }}
                className={`relative flex items-center gap-6 sm:gap-8 mb-16 sm:mb-20 last:mb-0 md:gap-0 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content Card */}
                <div
                  className={`flex-1 md:w-1/2 ${
                    isEven ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"
                  } pl-20 md:pl-0`}
                >
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/[0.06] hover:border-white/[0.12] transition-all group"
                  >
                    <div
                      className={`inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-4 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}
                    >
                      Step {step.number}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-5">
                      {step.description}
                    </p>

                    {/* Screenshot placeholder */}
                    <div className="w-full h-36 md:h-44 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center overflow-hidden relative group-hover:border-white/[0.1] transition-all">
                      <div className="absolute inset-0 bg-gradient-to-br opacity-20" style={{background: `linear-gradient(135deg, ${step.glowColor}, transparent)`}} />
                      <div className="relative flex flex-col items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/20 text-xs font-medium tracking-wider uppercase">Dashboard Preview</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Center node */}
                <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{
                      delay: 0.4 + i * 0.2,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="relative"
                  >
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 0 30px ${step.glowColor}` }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.gradient} animate-ping opacity-20`}
                    />
                  </motion.div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1 md:w-1/2" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
