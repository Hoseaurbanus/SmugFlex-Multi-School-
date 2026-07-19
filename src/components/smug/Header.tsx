import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  activeSection: string;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const navLinks = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export default function Header({
  activeSection,
  onLoginClick,
  onRegisterClick,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (mobileOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <a href="#hero" aria-label="SmugFlex - Back to top" className="flex items-center gap-2 group" onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <span className="text-xl font-extrabold tracking-tight font-heading">
                <span style={{ color: "#6366F1" }}>S</span>
                <span style={{ color: "#8B5CF6" }}>m</span>
                <span style={{ color: "#EC4899" }}>u</span>
                <span style={{ color: "#F97316" }}>g</span>
                <span style={{ color: "#06B6D4" }}>F</span>
                <span style={{ color: "#10B981" }}>l</span>
                <span style={{ color: "#3B82F6" }}>e</span>
                <span style={{ color: "#F43F5E" }}>x</span>
              </span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`relative px-3 lg:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 font-heading ${
                    activeSection === link.id
                      ? "text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {activeSection === link.id && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </a>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={onLoginClick}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                Login
              </button>
              <button
                onClick={onRegisterClick}
                className="relative group px-5 py-2.5 text-sm font-semibold text-white rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <span className="relative z-10">Get Started</span>
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="md:hidden relative p-2 text-gray-400 hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              id="mobile-drawer"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-72 bg-[#09090B]/95 backdrop-blur-xl border-l border-white/5 md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              tabIndex={-1}
            >
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-10">
                  <span className="text-xl font-extrabold font-heading">
                    <span style={{ color: "#6366F1" }}>S</span>
                    <span style={{ color: "#8B5CF6" }}>m</span>
                    <span style={{ color: "#EC4899" }}>u</span>
                    <span style={{ color: "#F97316" }}>g</span>
                    <span style={{ color: "#06B6D4" }}>F</span>
                    <span style={{ color: "#10B981" }}>l</span>
                    <span style={{ color: "#3B82F6" }}>e</span>
                    <span style={{ color: "#F43F5E" }}>x</span>
                  </span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1 mb-8">
                  {navLinks.map((link, i) => (
                    <motion.a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                        activeSection === link.id
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {link.label}
                    </motion.a>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onLoginClick();
                      setMobileOpen(false);
                    }}
                    className="w-full py-3 text-sm font-medium text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-all"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      onRegisterClick();
                      setMobileOpen(false);
                    }}
                    className="w-full py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899]"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
