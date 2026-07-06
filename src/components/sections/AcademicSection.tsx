import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Briefcase, CheckCircle } from "lucide-react";

const programs = [
  {
    title: "Junior Secondary (JSS 1–3)",
    icon: BookOpen,
    description: "A broad-based curriculum building foundational knowledge across sciences, arts, and vocational subjects.",
    highlights: ["Basic Science & Technology", "Pre-Vocational Studies", "Cultural & Creative Arts", "Mathematics & English"],
  },
  {
    title: "Senior Secondary (SSS 1–3)",
    icon: FlaskConical,
    description: "Specialized academic tracks preparing students for university and professional careers.",
    highlights: ["Science (STEM Track)", "Arts & Humanities", "Commercial Studies", "ICT & Computer Science"],
    popular: true,
  },
  {
    title: "Academic Streams",
    icon: Briefcase,
    description: "Three specialized streams — Science, Arts, and Commerce — tailored to student aptitudes.",
    highlights: ["Pure & Applied Sciences", "Literature & Social Sciences", "Accounting & Business", "Career Counseling"],
  },
];

export function AcademicSection() {
  return (
    <section id="academics" className="py-20 scroll-mt-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Academics</span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            Our Academic Structure
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            A tiered approach to secondary education that caters to diverse career paths and learning styles.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {programs.map((program, i) => {
            const Icon = program.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all ${program.popular ? "ring-2 ring-[#FFD700]" : ""}`}
              >
                {program.popular && (
                  <div className="bg-[#FFD700] text-[#0A2540] text-center text-xs font-bold py-1.5 tracking-widest uppercase">
                    Most Popular
                  </div>
                )}
                <div className="p-5 md:p-8">
                  <div className="w-14 h-14 rounded-xl bg-[#0A2540]/10 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-[#0A2540]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold font-['Montserrat'] text-[#0A2540] mb-4">{program.title}</h3>
                  <p className="text-gray-600 mb-6">{program.description}</p>
                  <ul className="space-y-3">
                    {program.highlights.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-700">
                        <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                        <span>{item}</span>
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
