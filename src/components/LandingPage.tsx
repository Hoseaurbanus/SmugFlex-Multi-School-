import { useState, useEffect, Component, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import LogoOpening from "./smug/LogoOpening";
import Header from "./smug/Header";
import HeroSection from "./smug/HeroSection";
import FeaturesSection from "./smug/FeaturesSection";
import { HowItWorks } from "./smug/HowItWorks";
import { PlatformShowcase } from "./smug/PlatformShowcase";
import { PricingSection } from "./smug/PricingSection";
import { FaqSection } from "./smug/FaqSection";
import { CtaBanner } from "./smug/CtaBanner";
import { PremiumFooter } from "./smug/PremiumFooter";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090B] text-white">
          <div className="text-center px-6">
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">Please refresh the page or try again later.</p>
            <a href="/" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#EC4899] text-white font-semibold text-sm">
              Go Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister?: () => void;
}

export function LandingPage({ onNavigateToLogin, onNavigateToRegister }: LandingPageProps) {
  const [showOpening, setShowOpening] = useState(true);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOpening(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setShowOpening(false);
    }
  }, [prefersReducedMotion]);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AnimatePresence mode="wait">
        {showOpening ? (
          <LogoOpening key="opening" onComplete={() => setShowOpening(false)} />
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <Header
              activeSection={activeSection}
              onLoginClick={onNavigateToLogin}
              onRegisterClick={onNavigateToRegister || onNavigateToLogin}
            />
            <main>
              <HeroSection
                id="hero"
                setActiveSection={setActiveSection}
                onLoginClick={onNavigateToLogin}
              />
              <FeaturesSection id="features" setActiveSection={setActiveSection} />
              <HowItWorks id="how-it-works" setActiveSection={setActiveSection} />
              <PlatformShowcase id="showcase" setActiveSection={setActiveSection} />
              <PricingSection id="pricing" setActiveSection={setActiveSection} onRegisterClick={onNavigateToRegister || onNavigateToLogin} />
              <FaqSection id="faq" setActiveSection={setActiveSection} />
              <CtaBanner
                id="cta"
                setActiveSection={setActiveSection}
                onLoginClick={onNavigateToLogin}
                onRegisterClick={onNavigateToRegister || onNavigateToLogin}
              />
            </main>
            <PremiumFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
