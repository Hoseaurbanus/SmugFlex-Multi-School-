import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, GraduationCap, Shield, Users, Award } from "lucide-react";

const trustIndicators = [
  { icon: GraduationCap, label: "Academic Excellence", desc: "98% pass rate in national exams" },
  { icon: Users, label: "Qualified Teachers", desc: "Highly trained professional staff" },
  { icon: Shield, label: "Safe Environment", desc: "Secure & nurturing campus" },
  { icon: Award, label: "Strong Results", desc: "Consistent top-tier performance" },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-[#0A2540]">
      <div className="absolute inset-0">
        <img
          alt="SmugFlex campus building with students"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida/ADBb0uj6HftylL9xLJV_mlJvQn57FS2bIhEO0y5IQBkfubM2kMlFNproM3y_JGhoUKVUgFkISn-pPZj6lkkmtmNCuubO2F8TN0pQ6ANH0VpunaLkf6sxGQ-mJjqDW9f1MxfqaHxRfThgFt4F9Zc2BoVnQ2G9vyn7LqG4_6pBS-WZsvhPpQm9SOjUldvilrBnX6cygVAJ_v0s5xquGUqhi2iP9PzEMGOqKppVpF3Dv6veALeBIAtRRXNqc4pbYJk6"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A2540]/85 via-[#0A2540]/50 to-[#0A2540]/20" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center px-4 py-1.5 bg-[#FFD700] text-[#0A2540] rounded-full text-xs font-bold tracking-widest uppercase mb-6">
            Welcome to Excellence
          </span>

          <h1 className="text-[28px] md:text-5xl lg:text-6xl font-bold font-['Montserrat'] text-white leading-[1.1] mb-6">
            Building Future Leaders Through Academic Excellence and Christian Values
          </h1>

          <p className="text-base md:text-xl text-white/80 leading-relaxed mb-8 md:mb-10 max-w-2xl">
            Nurturing minds and spirits in an environment of integrity, innovation, and faith.
            Join a community where every student is empowered to excel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 bg-[#FFD700] text-[#0A2540] text-sm font-bold rounded-full hover:bg-[#ffed4a] transition-all shadow-xl"
            >
              Apply for Admission
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/login")}
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white text-sm font-bold rounded-full hover:bg-white/20 transition-all border-2 border-white/30 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Student Portal Login
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-12 md:mt-20"
        >
          {trustIndicators.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-5 border border-white/10 hover:bg-white/15 transition-all"
              >
                <Icon className="w-8 h-8 text-[#FFD700] mb-3" />
                <h3 className="text-white font-semibold font-['Montserrat'] text-sm mb-1">{item.label}</h3>
                <p className="text-white/60 text-xs">{item.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
