import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, ArrowRight } from "lucide-react";

const portals = [
  {
    title: "Student Portal",
    icon: GraduationCap,
    description: "Access your academic records, view results, check attendance, and manage your profile.",
    features: ["View examination results", "Check attendance records", "Download report cards", "Update personal information"],
    color: "from-[#0A2540] to-[#1a3a5c]",
  },
  {
    title: "Parent Portal",
    icon: Users,
    description: "Stay informed about your child's academic progress, attendance, and school announcements.",
    features: ["Monitor academic progress", "Track attendance history", "Receive school announcements", "Communicate with teachers"],
    color: "from-[#FFD700] to-[#e6c200]",
    textColor: "text-[#0A2540]",
    btnClass: "bg-[#0A2540] text-white hover:bg-[#1a3a5c]",
  },
];

export function PortalSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#FFD700] font-bold tracking-widest text-sm uppercase">Portal Access</span>
          <h2 className="text-4xl md:text-5xl font-bold font-['Montserrat'] text-[#0A2540] mt-2 mb-4">
            Your Portal, Your Hub
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Secure access to academic records, results, and school resources — anytime, anywhere.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {portals.map((portal, i) => {
            const Icon = portal.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -5 }}
                className={`rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${portal.color} ${portal.textColor || "text-white"}`}
              >
                <div className="p-8 md:p-10">
                  <Icon className={`w-12 h-12 mb-6 ${portal.textColor === "text-[#0A2540]" ? "text-[#0A2540]" : "text-[#FFD700]"}`} />
                  <h3 className={`text-2xl font-bold font-['Montserrat'] mb-4 ${portal.textColor || "text-white"}`}>
                    {portal.title}
                  </h3>
                  <p className={`${portal.textColor ? "text-[#0A2540]" : "text-white/80"} mb-6 leading-relaxed`}>
                    {portal.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {portal.features.map((feature, j) => (
                      <li key={j} className={`flex items-center gap-3 text-sm ${portal.textColor ? "text-[#0A2540]/90" : "text-white/70"}`}>
                        <ArrowRight className={`w-4 h-4 ${portal.textColor === "text-[#0A2540]" ? "text-[#0A2540]" : "text-[#FFD700]"}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/login")}
                    className={`w-full py-3.5 rounded-full text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${portal.btnClass || "bg-[#FFD700] text-[#0A2540] hover:bg-[#ffed4a]"}`}
                  >
                    Sign In <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
