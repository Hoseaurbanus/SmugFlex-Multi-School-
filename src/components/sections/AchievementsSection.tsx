import { motion } from "framer-motion";
import { Trophy, Users, School, Star } from "lucide-react";

const achievements = [
  { icon: Trophy, stat: "98%", label: "Pass Rate" },
  { icon: School, stat: "25+", label: "Years of Legacy" },
  { icon: Users, stat: "500+", label: "Alumni Network" },
  { icon: Star, stat: "50+", label: "Qualified Staff" },
];

const milestones = [
  { value: "15:1", label: "Student-Teacher Ratio" },
  { value: "100%", label: "University Admission Rate" },
  { value: "95%", label: "Parent Satisfaction" },
  { value: "30+", label: "Extracurricular Clubs" },
];

export function AchievementsSection() {
  return (
    <section className="py-20 bg-[#0A2540]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Our Achievements</span>
          <h2 className="text-3xl md:text-5xl font-bold font-['Montserrat'] text-white mt-2 mb-4">
            Excellence in Numbers
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            Our track record speaks volumes about the quality of education and character formation at SmugFlex.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {achievements.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center p-4 md:p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
              >
                <Icon className="w-10 h-10 text-[#FFD700] mx-auto mb-4" />
                <div className="text-3xl md:text-5xl font-bold font-['Montserrat'] text-[#FFD700] mb-2">{item.stat}</div>
                <div className="text-gray-300 text-sm font-medium">{item.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="text-center p-4"
            >
              <div className="text-2xl font-bold font-['Montserrat'] text-white">{item.value}</div>
              <div className="text-gray-400 text-sm">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
