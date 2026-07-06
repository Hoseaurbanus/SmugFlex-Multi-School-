import { motion } from "framer-motion";
import { BookOpen, Heart } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="py-20 scroll-mt-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                className="w-full h-full object-cover"
                alt="Academic corridor with sunlight streaming through windows at SmugFlex"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOJCl4BPGnwYUV8aQWqHOm4djCT8Cu8Z7O8hnSdS4SEVYTSQKzXGvM-Dbx3oiyf0M21LWEfO-9ZgUqEq9RoSgaXXn8cyrEHtlAmqMJVmxP300CkjAWx6tn5OzK5tB4EwIGftD-C3p5jDSLF-WMmTnlAKxNLaTl39rqDRR59obMp9QhbqvzY5jlTiBS8tr2DWjGaOOy1bJENfPYOI-Yp4oRyWnJ48mqKW-pbemUUSMhDqTvjVwtTvyBYLyCzS82qECHMHATwg7R2iIB"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-3/4 h-3/4 bg-[#FFD700]/10 rounded-2xl -z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">About Us</span>
            <h2 className="text-3xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] leading-tight">
              Our Legacy &amp; Vision
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
               Founded on the bedrock of innovation and excellence, SmugFlex has spent
              over two decades molding young minds into pillars of society. Our vision transcends mere
              academic instruction; we strive to ignite a passion for lifelong learning and a commitment
              to faithful service.
            </p>

            <div className="grid grid-cols-1 gap-6 pt-4">
              <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#0A2540]/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-[#0A2540]" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold font-['Montserrat'] text-gray-900">Our Mission</h4>
                  <p className="text-gray-600">To provide a holistic, Christ-centered education that develops the intellectual, spiritual, and social potential of every student.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-[#B8860B]" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold font-['Montserrat'] text-gray-900">Our Values</h4>
                  <p className="text-gray-600">Integrity, excellence, discipline, and faith — the four pillars that guide every aspect of campus life.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
