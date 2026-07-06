import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface LogoOpeningProps {
  onComplete: () => void;
}

export default function LogoOpening({ onComplete }: LogoOpeningProps) {
  const [phase, setPhase] = useState<"letters" | "expand" | "done">("letters");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("expand"), 1200);
    const t2 = setTimeout(() => setPhase("done"), 2200);
    const t3 = setTimeout(() => onComplete(), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090B]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, #6366F1 0%, #A855F7 40%, #EC4899 100%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center gap-1">
        {/* S Letter */}
        <motion.span
          className="text-8xl md:text-[10rem] font-black tracking-tighter"
          style={{
            background:
              "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          initial={{ opacity: 0, y: 40, rotateX: -90 }}
          animate={{
            opacity: 1,
            y: 0,
            rotateX: 0,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          S
        </motion.span>

        {/* M Letter */}
        <motion.span
          className="text-8xl md:text-[10rem] font-black tracking-tighter"
          style={{
            background:
              "linear-gradient(135deg, #EC4899 0%, #F97316 50%, #6366F1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          initial={{ opacity: 0, y: 40, rotateX: -90 }}
          animate={{
            opacity: 1,
            y: 0,
            rotateX: 0,
          }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          M
        </motion.span>

        {/* Expanding text */}
        <motion.div
          className="overflow-hidden flex"
          initial={{ width: 0, opacity: 0 }}
          animate={
            phase !== "letters"
              ? { width: "auto", opacity: 1 }
              : { width: 0, opacity: 0 }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="text-8xl md:text-[10rem] font-black tracking-tighter whitespace-nowrap"
            style={{
              background:
                "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #6366F1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ugFlex
          </span>
        </motion.div>
      </div>

      {/* Underline sweep */}
      <motion.div
        className="absolute bottom-1/2 translate-y-[5rem] md:translate-y-[6rem] h-1 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #6366F1, #EC4899, #F97316)",
        }}
        initial={{ width: 0 }}
        animate={phase !== "letters" ? { width: "60%" } : { width: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Sparkle particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white"
          initial={{
            opacity: 0,
            scale: 0,
            x: 0,
            y: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: 1,
            delay: 0.8 + i * 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  );
}
