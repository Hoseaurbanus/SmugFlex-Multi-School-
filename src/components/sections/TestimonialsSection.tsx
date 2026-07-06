import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "SmugFlex gave me more than an education — it gave me character. The teachers genuinely care about each student's success, and the Christian environment shaped who I am today.",
    name: "David Ibrahim",
    role: "Alumnus, Class of 2020",
    avatar: "DI",
  },
  {
    quote: "As a parent, I couldn't ask for a better school. The discipline, academic rigor, and digital tools my children receive at SmugFlex gives me peace of mind every single day.",
    name: "Mrs. Grace Daniel",
    role: "Parent",
    avatar: "GD",
  },
  {
    quote: "Teaching at SmugFlex has been the most rewarding experience of my career. The students are eager to learn, and the administration provides all the support we need to deliver quality education.",
    name: "Mr. Samuel John",
    role: "Senior Teacher, Mathematics",
    avatar: "SJ",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Testimonials</span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            What People Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Hear from those who have experienced the SmugFlex difference.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-gray-50 rounded-2xl p-8 relative hover:shadow-lg transition-all"
            >
              <Quote className="w-8 h-8 text-[#FFD700] mb-4 opacity-50" />
              <p className="text-gray-700 leading-relaxed mb-6 italic">&ldquo;{item.quote}&rdquo;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0A2540] flex items-center justify-center text-white font-bold text-sm">
                  {item.avatar}
                </div>
                <div>
                  <div className="font-semibold font-['Montserrat'] text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
