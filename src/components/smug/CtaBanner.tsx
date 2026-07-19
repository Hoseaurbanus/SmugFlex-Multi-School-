import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

interface CtaBannerProps {
  id: string;
  setActiveSection: (section: string) => void;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export function CtaBanner({ id, setActiveSection, onLoginClick, onRegisterClick }: CtaBannerProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section id={id} ref={ref} className="py-20 md:py-28 bg-[#09090B] relative overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-[128px] animate-pulse" style={{ animationDelay: "2s" }} />
          </div>

          {/* Animated floating blobs */}
          <motion.div
            className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/10 rounded-full"
            animate={{ x: [0, -25, 0], y: [0, 15, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute top-1/3 right-10 w-3 h-3 bg-white/40 rounded-full"
            animate={{ y: [-10, 10, -10], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/3 left-12 w-2 h-2 bg-white/30 rounded-full"
            animate={{ y: [8, -8, 8], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute top-8 right-1/3 w-1.5 h-1.5 bg-amber-300/60 rounded-full"
            animate={{ y: [-5, 5, -5], x: [-3, 3, -3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Decorative dots grid */}
          <div className="absolute top-6 left-6 grid grid-cols-4 gap-2 opacity-20">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white" />
            ))}
          </div>
          <div className="absolute bottom-6 right-6 grid grid-cols-4 gap-2 opacity-20">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white" />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-16 md:px-12 md:py-20 lg:px-20 lg:py-24 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-white/20"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight font-heading"
            >
              Ready to Transform
              <br />
              Your School?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-white/70 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed"
            >
              Join 50+ schools already using SmugFlex to manage their operations.
              Your first term is completely free — no strings attached.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                onClick={onRegisterClick}
                whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="group px-8 py-4 bg-white text-[#09090B] rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-xl hover:bg-white/90 transition-colors"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
              <motion.button
                onClick={onLoginClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-bold text-base border-2 border-white/30 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Talk to Sales
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
