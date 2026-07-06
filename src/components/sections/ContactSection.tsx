import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const contactInfo = [
  { icon: MapPin, label: "School Address", value: "Billiri Town, Gombe State, Nigeria" },
  { icon: Phone, label: "Phone Number", value: "+234 (0) 803 000 0000" },
  { icon: Mail, label: "Email Address", value: "info@smugflex.com" },
  { icon: Clock, label: "School Hours", value: "Mon – Fri, 7:30 AM – 3:30 PM" },
];

export function ContactSection() {
  return (
    <section id="contact" className="py-20 scroll-mt-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Contact</span>
          <h2 className="text-3xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            Get in Touch
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Have questions about admissions, academics, or school life? We&apos;d love to hear from you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactInfo.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#0A2540]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-[#0A2540]" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{item.label}</div>
                      <div className="font-medium text-gray-900">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg h-[300px]">
              <iframe
                title="SmugFlex Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3936.5!2d10.9!3d9.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMzAnMDAuMCJOIDEwwrA1NCcwMC4wIkU!5e0!3m2!1sen!2sng!4v1"
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <form className="bg-white p-6 md:p-10 rounded-2xl shadow-xl" onSubmit={(e) => e.preventDefault()}>
              <h3 className="text-2xl font-bold font-['Montserrat'] text-[#0A2540] mb-6">Send Us a Message</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] p-3.5 outline-none transition-all"
                      placeholder="Your full name"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] p-3.5 outline-none transition-all"
                      placeholder="your@email.com"
                      type="email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] p-3.5 outline-none transition-all"
                    placeholder="How can we help?"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] p-3.5 outline-none transition-all"
                    placeholder="Write your message..."
                    rows={5}
                  />
                </div>
                <button
                  className="w-full py-4 bg-[#0A2540] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a5c] transition-all shadow-lg active:scale-[0.98] cursor-pointer"
                  type="submit"
                >
                  Send Message
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
