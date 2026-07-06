import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";

interface TestimonialsProps {
  id: string;
  setActiveSection: (section: string) => void;
}

const testimonials = [
  {
    quote:
      "SmugFlex transformed how we manage results. What used to take our teachers two days now takes 20 minutes. The CBT feature alone saved us millions in exam paper costs.",
    name: "Mrs. Folake Adebayo",
    role: "Principal, Sunshine Academy, Lagos",
    initials: "FA",
    gradient: "from-[#6366F1] to-[#8B5CF6]",
  },
  {
    quote:
      "Our parents love paying fees online through Paystack. No more queues, no more cash handling. The receipt system is instant and transparent.",
    name: "Mr. Chukwuemeka Okoro",
    role: "Administrator, Great Foundation Schools, Abuja",
    initials: "CO",
    gradient: "from-[#F97316] to-[#FB923C]",
  },
  {
    quote:
      "The student portal is a game-changer. Our students now take CBT exams on their phones and get results instantly. It has improved our exam preparation significantly.",
    name: "Hauwa Ibrahim",
    role: "Vice Principal, Royal Crown Academy, Kano",
    initials: "HI",
    gradient: "from-[#EC4899] to-[#F472B6]",
  },
];

export function Testimonials({ id, setActiveSection }: TestimonialsProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () =>
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const handleNext = () =>
    setActive((prev) => (prev + 1) % testimonials.length);

  return (
    <section
      id={id}
      ref={ref}
      className="py-24 md:py-32 bg-[#09090B] relative overflow-hidden"
    >
      {/* Ambient glows */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[#6366F1]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[#EC4899]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 text-[#EC4899] font-bold tracking-[0.2em] text-xs uppercase mb-4 px-4 py-1.5 rounded-full border border-[#EC4899]/20 bg-[#EC4899]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899] animate-pulse" />
            Testimonials
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mt-3 mb-5 tracking-tight">
            Trusted by Schools Across{" "}
            <span className="bg-gradient-to-r from-[#EC4899] to-[#F97316] bg-clip-text text-transparent">
              Nigeria
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
            Hear from school administrators who use SmugFlex every day.
          </p>
        </motion.div>

        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              whileHover={{ y: -8 }}
              className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm p-8 border border-white/[0.06] hover:border-white/[0.12] transition-all group"
            >
              {/* Gradient accent line */}
              <div
                className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r ${item.gradient} opacity-40 group-hover:opacity-80 transition-opacity`}
              />

              <Quote className="w-8 h-8 text-white/10 mb-5" />

              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-4 h-4 fill-[#F97316] text-[#F97316]"
                  />
                ))}
              </div>

              <p className="text-white/70 leading-relaxed mb-8 italic text-sm md:text-base">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                >
                  {item.initials}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {item.name}
                  </div>
                  <div className="text-gray-500 text-xs">{item.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div
          className="md:hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50) handleNext();
                else if (info.offset.x > 50) handlePrev();
              }}
              className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm p-6 border border-white/[0.06] touch-pan-y"
            >
              <div
                className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${testimonials[active].gradient} opacity-40`}
              />

              <Quote className="w-7 h-7 text-white/10 mb-4" />
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-3 h-3 fill-[#F97316] text-[#F97316]"
                  />
                ))}
              </div>
              <p className="text-white/70 leading-relaxed mb-6 italic text-sm">
                &ldquo;{testimonials[active].quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonials[active].gradient} flex items-center justify-center text-white font-bold text-xs shadow-lg`}
                >
                  {testimonials[active].initials}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {testimonials[active].name}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {testimonials[active].role}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899]"
                      : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
