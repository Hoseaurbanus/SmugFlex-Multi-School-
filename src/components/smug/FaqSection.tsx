import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqSectionProps {
  id: string;
  setActiveSection: (section: string) => void;
}

const faqs = [
  {
    question: "How long is the free trial?",
    answer:
      "Your free trial lasts one full term — no credit card required. You get full access to all features so you can evaluate SmugFlex with your real school data before committing.",
  },
  {
    question: "Can I import existing student data?",
    answer:
      "Yes! SmugFlex supports CSV import for students, staff, and fee records. Simply download our template, fill in your data, and upload it. The system will validate and import everything automatically.",
  },
  {
    question: "Is there a limit on users?",
    answer:
      "User limits depend on your plan. Basic supports up to 3 admin accounts, Standard up to 5, and Premium offers unlimited admin accounts. Student limits range from 300 (Basic) to unlimited (Premium).",
  },
  {
    question: "Do you support online payments?",
    answer:
      "Absolutely. We integrate with Paystack for seamless online payments. Parents and students can pay school fees using debit cards, bank transfers, and USSD — all receipts are generated automatically.",
  },
  {
    question: "Can parents access the platform?",
    answer:
      "Yes! Every plan includes a parent portal where parents can view their child's results, check attendance records, pay fees online, and receive school notifications — all through a web browser on any device.",
  },
  {
    question: "What happens after my subscription expires?",
    answer:
      "Your data is never deleted. After expiry, you get read-only access to your records. You can still view results, reports, and financial data. To resume full operations, simply renew your subscription.",
  },
];

export function FaqSection({ id, setActiveSection }: FaqSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6366F1]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 text-[#6366F1] font-bold tracking-[0.2em] text-xs uppercase mb-4 px-4 py-1.5 rounded-full border border-[#6366F1]/20 bg-[#6366F1]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            FAQ
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mt-3 mb-5 tracking-tight">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-[#6366F1] to-[#EC4899] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
            Everything you need to know about SmugFlex.
          </p>
        </motion.div>

        {/* 2-column grid on desktop */}
        <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className="group"
            >
              <div
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  openIndex === i
                    ? "bg-white/[0.04] border-[#6366F1]/30 shadow-lg shadow-[#6366F1]/5"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left"
                  aria-expanded={openIndex === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span
                    className={`font-semibold text-sm md:text-base pr-4 transition-colors ${
                      openIndex === i ? "text-white" : "text-white/80"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-5 h-5 transition-colors ${
                        openIndex === i
                          ? "text-[#6366F1]"
                          : "text-gray-500"
                      }`}
                    />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div
                        id={`faq-answer-${i}`}
                        className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-gray-400 leading-relaxed border-t border-white/[0.04] pt-4"
                      >
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
