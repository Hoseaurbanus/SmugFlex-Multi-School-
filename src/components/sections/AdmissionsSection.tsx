import { motion } from "framer-motion";
import { FileText, Search, ClipboardCheck, MailCheck } from "lucide-react";

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Application Submission",
    description: "Complete and submit the online application form along with required documentation and application fee.",
  },
  {
    icon: Search,
    step: "02",
    title: "Document Review",
    description: "Our admissions team reviews all submitted documents to verify eligibility and completeness.",
  },
  {
    icon: ClipboardCheck,
    step: "03",
    title: "Entrance Assessment",
    description: "Qualified candidates are invited for an entrance examination and oral interview.",
  },
  {
    icon: MailCheck,
    step: "04",
    title: "Admission Decision",
    description: "Successful candidates receive an admission letter with further instructions for enrollment.",
  },
];

export function AdmissionsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Admissions</span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            Admissions Process
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            A straightforward process designed to identify and welcome students who will thrive at SmugFlex.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-[#FFD700] border-dashed border-t-2 border-[#FFD700]/30" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#0A2540] flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                    <Icon className="w-7 h-7 md:w-10 md:h-10 text-[#FFD700]" />
                  </div>
                  <div className="text-[#FFD700] font-bold text-sm mb-2">{item.step}</div>
                  <h3 className="text-xl font-bold font-['Montserrat'] text-[#0A2540] mb-3">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-10 py-4 bg-[#FFD700] text-[#0A2540] text-sm font-bold rounded-full hover:bg-[#ffed4a] transition-all shadow-xl">
            Begin Application
          </button>
        </motion.div>
      </div>
    </section>
  );
}
