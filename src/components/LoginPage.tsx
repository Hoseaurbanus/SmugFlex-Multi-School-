import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ArrowRight,
  GraduationCap,
  Shield,
  CheckCircle,
  X,
  AlertTriangle,
  Info,
  Settings,
  BookUser,
  Briefcase,
  Heart,
  ArrowLeft,
  User,
  Lock,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/domains/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLES = [
  { value: "admin", label: "Administrator", icon: Settings },
  { value: "teacher", label: "Teacher", icon: BookUser },
  { value: "accountant", label: "Accountant", icon: Briefcase },
  { value: "parent", label: "Parent / Guardian", icon: Heart },
];

interface LoginFormInputs {
  userId: string;
  password: string;
}

interface StudentLoginFormInputs {
  studentClass: string;
  studentReg: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, studentLogin } = useAuth();

  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const roleRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    defaultValues: { userId: "", password: "" },
  });

  const {
    register: registerStudent,
    handleSubmit: handleStudentSubmit,
    formState: { errors: studentErrors },
    setValue: _setStudentValue,
    watch: _watchStudent,
  } = useForm<StudentLoginFormInputs>({
    defaultValues: { studentClass: "", studentReg: "" },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedRole = ROLES.find((r) => r.value === role);

  const onSubmit = async (data: LoginFormInputs) => {
    setError("");
    setInfoMessage("");
    setIsLoading(true);
    try {
      const user = await login(data.userId, data.password, role);
      if (user) {
        navigate(`/${user.role}`);
      } else {
        setError("Invalid credentials. Please check your username and password.");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onStudentSubmit = async (data: StudentLoginFormInputs) => {
    setError("");
    setInfoMessage("");
    if (!data.studentClass || !data.studentReg) {
      setError("Please select your class and enter your registration number.");
      return;
    }
    setStudentLoading(true);
    try {
      const user = await studentLogin(data.studentReg, data.studentClass);
      if (user) {
        setShowStudentModal(false);
        navigate("/student");
      } else {
        setError(
          "Student verification failed. Check your registration number and class."
        );
      }
    } catch (err: any) {
      setError(err.message || "Student login failed. Please try again.");
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row font-sans bg-white">
        {/* ───────── LEFT PANEL (FORM) ───────── */}
        <div className="flex-none w-full md:w-[46%] lg:w-[44%] mesh-gradient-bg flex flex-col md:min-h-screen overflow-y-auto z-10 relative">
          {/* Decorative corner accent */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-br-[100px] pointer-events-none" />

          <div className="flex flex-col flex-1 px-5 py-6 sm:px-6 sm:py-8 md:px-12 md:py-10 lg:px-16 max-w-[560px] mx-auto w-full relative">
            {/* Back to Home */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 mb-5 md:mb-8 text-sm text-gray-400 hover:text-[#09090B] transition-colors group"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to home</span>
              </button>
            </motion.div>

            {/* Logo + Heading */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-5 md:mb-8"
            >
              <div className="mb-4 md:mb-6">
                <span className="text-2xl font-extrabold tracking-tight font-heading">
                  <span style={{ color: "#6366F1" }}>S</span>
                  <span style={{ color: "#8B5CF6" }}>m</span>
                  <span style={{ color: "#EC4899" }}>u</span>
                  <span style={{ color: "#F97316" }}>g</span>
                  <span style={{ color: "#06B6D4" }}>F</span>
                  <span style={{ color: "#10B981" }}>l</span>
                  <span style={{ color: "#3B82F6" }}>e</span>
                  <span style={{ color: "#F43F5E" }}>x</span>
                </span>
              </div>
              <h1 className="text-3xl md:text-[2.1rem] font-bold leading-tight mb-2 text-[#09090B] tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500">
                Sign in to your account to access the portal
              </p>
            </motion.div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Role Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
                className="mb-5 relative z-[100]"
                ref={roleRef}
              >
                <label
                  htmlFor="login-role"
                  className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-2 text-gray-500"
                >
                  I am a
                </label>
                <div className="relative">
                  <button
                    type="button"
                    id="login-role"
                    onClick={() => setRoleOpen((o) => !o)}
                    className={`w-full h-12 px-4 border rounded-xl text-sm flex items-center justify-between transition-all duration-200 outline-none bg-white ${
                      roleOpen
                        ? "border-[#6366F1] shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={roleOpen}
                  >
                    <span className="flex items-center gap-2.5 text-[#09090B]">
                      {selectedRole && (
                        <selectedRole.icon className="w-4 h-4 text-[#6366F1]" />
                      )}
                      <span>{selectedRole?.label ?? "Select role"}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        roleOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {roleOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl z-50"
                        role="listbox"
                      >
                        {ROLES.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            role="option"
                            aria-selected={role === r.value}
                            onClick={() => {
                              setRole(r.value);
                              setRoleOpen(false);
                              setError("");
                              setInfoMessage("");
                            }}
                            className={`w-full px-4 py-3 text-sm text-left flex items-center gap-3 transition-colors duration-150 hover:bg-indigo-50 ${
                              role === r.value
                                ? "bg-indigo-50 text-[#6366F1]"
                                : "text-gray-700"
                            }`}
                          >
                            <r.icon
                              className={`w-4 h-4 ${
                                role === r.value
                                  ? "text-[#6366F1]"
                                  : "text-gray-400"
                              }`}
                            />
                            <span className="flex-1">{r.label}</span>
                            {role === r.value && (
                              <CheckCircle className="w-4 h-4 text-[#6366F1]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Username / Email */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.24 }}
                className="mb-5"
              >
                <label
                  htmlFor="login-username"
                  className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-2 text-gray-500"
                >
                  Username / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    id="login-username"
                    placeholder="Enter your username or email"
                    {...register("userId", {
                      required: "Username or email is required",
                    })}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit(onSubmit)()}
                    className={`w-full h-12 pl-10 pr-4 border rounded-xl text-sm bg-white text-[#09090B] outline-none transition-all duration-200 focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-gray-400 ${
                      errors.userId ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-label="Username or Email"
                    aria-invalid={!!errors.userId}
                    aria-describedby={errors.userId ? 'login-username-error' : undefined}
                    autoComplete="username"
                  />
                </div>
                {errors.userId && (
                  <p id="login-username-error" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.userId.message}
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="mb-3"
              >
                <label
                  htmlFor="login-password"
                  className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-2 text-gray-500"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    placeholder="••••••••"
                    {...register("password", {
                      required: "Password is required",
                    })}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit(onSubmit)()}
                    className={`w-full h-12 pl-10 pr-12 border rounded-xl text-sm bg-white text-[#09090B] outline-none transition-all duration-200 focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-gray-400 ${
                      errors.password ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-label="Password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="login-password-error" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.password.message}
                  </p>
                )}
              </motion.div>



              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 flex items-start gap-2.5 text-red-600"
                    role="alert"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Message */}
              <AnimatePresence>
                {infoMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mb-4 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 flex items-start gap-2.5 text-[#6366F1]"
                  >
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{infoMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.38 }}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none disabled:shadow-none shimmer-btn"
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                    backgroundSize: "200% auto",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 spinner" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      SIGN IN
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            {/* Register Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.44 }}
              className="mt-4 md:mt-5 text-center"
            >
              <p className="text-xs text-gray-500">
                New to SmugFlex?{" "}
                <button
                  onClick={() => navigate("/register")}
                  className="text-[#6366F1] font-semibold hover:text-[#4F46E5] hover:underline transition-colors"
                >
                  Register your school
                </button>
              </p>
            </motion.div>

            {/* Student Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5 }}
              className="mt-6"
            >
              <button
                type="button"
                onClick={() => setShowStudentModal(true)}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-[#09090B] hover:border-[#6366F1]/30 hover:bg-indigo-50/50 transition-all duration-200"
              >
                <GraduationCap className="w-4 h-4 text-[#6366F1]" />
                Student Login
              </button>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.56 }}
              className="mt-5 md:mt-8 pt-4 text-center border-t border-gray-100"
            >
              <p className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">
                &copy; 2026 SmugFlex &middot; Lagos, Nigeria
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-[10px] text-gray-500 hover:text-[#6366F1] transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => navigate("/terms")}
                  className="text-[10px] text-gray-500 hover:text-[#6366F1] transition-colors"
                >
                  Terms of Service
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ───────── RIGHT HERO PANEL ───────── */}
        <div className="hidden md:flex flex-1 relative overflow-hidden items-center justify-center">
          {/* Dark gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #09090B 0%, #0F0A2A 30%, #1E1145 60%, #09090B 100%)",
            }}
          />

          {/* Animated mesh gradient blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="mesh-blob-1 absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
              style={{
                background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
                top: "10%",
                left: "15%",
              }}
            />
            <div
              className="mesh-blob-2 absolute w-[400px] h-[400px] rounded-full opacity-25 blur-[100px]"
              style={{
                background: "radial-gradient(circle, #EC4899 0%, transparent 70%)",
                bottom: "15%",
                right: "10%",
              }}
            />
            <div
              className="mesh-blob-3 absolute w-[350px] h-[350px] rounded-full opacity-20 blur-[100px]"
              style={{
                background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Content */}
          <div className="relative z-10 w-full max-w-lg px-10 lg:px-14">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mb-6"
            >
              <h2
                className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-heading leading-[1.1]"
              >
                SMUGFLEX
                <br />
                <span className="bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                  VENTURE
                </span>
              </h2>
            </motion.div>

            {/* Motto */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mb-12"
            >
              <p className="text-lg lg:text-xl text-gray-300 font-heading font-medium tracking-wide">
                DRIVEN TO KEEP YOU AHEAD
              </p>
              <div className="mt-4 h-px w-24 bg-gradient-to-r from-[#6366F1] to-[#EC4899]" />
            </motion.div>

            {/* Floating abstract shapes */}
            <div className="relative h-64 lg:h-72">
              {/* Large circle */}
              <motion.div
                className="absolute top-0 right-8 w-32 h-32 rounded-full border border-white/10"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(236,72,153,0.05) 100%)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, -12, 0], rotate: [0, 5, 0] }}
                transition={{ opacity: { duration: 0.8, delay: 0.6 }, scale: { duration: 0.8, delay: 0.6 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }, rotate: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 } }}
              />
              {/* Small circle */}
              <motion.div
                className="absolute top-16 left-4 w-16 h-16 rounded-full border border-[#6366F1]/20 bg-[#6366F1]/5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, 10, 0], x: [0, -5, 0] }}
                transition={{ opacity: { duration: 0.8, delay: 0.8 }, scale: { duration: 0.8, delay: 0.8 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }, x: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
              />
              {/* Accent dot */}
              <motion.div
                className="absolute top-8 left-1/2 w-3 h-3 rounded-full bg-[#EC4899]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, y: [-8, 8, -8] }}
                transition={{ opacity: { duration: 0.6, delay: 1.0 }, scale: { duration: 0.6, delay: 1.0 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 } }}
              />
              {/* Horizontal line */}
              <motion.div
                className="absolute top-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              {/* Diamond shape */}
              <motion.div
                className="absolute bottom-16 right-12 w-20 h-20 border border-white/10 rotate-45"
                style={{
                  background: "linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(99,102,241,0.04) 100%)",
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0], rotate: [45, 50, 45] }}
                transition={{ opacity: { duration: 0.8, delay: 1.2 }, scale: { duration: 0.8, delay: 1.2 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.4 }, rotate: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.4 } }}
              />
              {/* Tiny accent dots */}
              <motion.div
                className="absolute bottom-24 left-8 w-2 h-2 rounded-full bg-[#6366F1]/60"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                transition={{ opacity: { duration: 0.5, delay: 1.4 }, scale: { duration: 0.5, delay: 1.4 }, y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 } }}
              />
              <motion.div
                className="absolute bottom-8 left-1/3 w-1.5 h-1.5 rounded-full bg-[#EC4899]/50"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, y: [5, -5, 5] }}
                transition={{ opacity: { duration: 0.5, delay: 1.5 }, scale: { duration: 0.5, delay: 1.5 }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.6 } }}
              />
              {/* Gradient glow blob */}
              <motion.div
                className="absolute -bottom-8 -right-12 w-40 h-40 rounded-full blur-[60px]"
                style={{
                  background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.2, scale: [1, 1.15, 1] }}
                transition={{ opacity: { duration: 1, delay: 0.8 }, scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ───────── STUDENT ACCESS MODAL ───────── */}
      <AnimatePresence>
        {showStudentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090B]/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowStudentModal(false);
                setError("");
                setInfoMessage("");
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Student Access Portal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-3xl p-8 bg-white shadow-[0_32px_100px_rgba(99,102,241,0.15)] border border-gray-100"
            >
              {/* Close */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#09090B]">
                      Student Portal
                    </h3>
                    <p className="text-[10px] text-gray-400">Access your results</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStudentModal(false);
                    setError("");
                    setInfoMessage("");
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs mb-6 text-gray-500">
                Access your academic results and profile using your class and
                registration number.
              </p>

              <form onSubmit={handleStudentSubmit(onStudentSubmit)} noValidate>
                {/* Class Selection */}
                <div className="mb-4">
                  <label
                    htmlFor="student-class"
                    className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-2 text-gray-500"
                  >
                    Class
                  </label>
                  <input
                    type="text"
                    id="student-class"
                    placeholder="e.g. JSS1A, SS2B"
                    {...registerStudent("studentClass", {
                      required: "Please enter your class name",
                    })}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleStudentSubmit(onStudentSubmit)()
                    }
                    className={`w-full h-11 px-4 border rounded-xl text-sm transition-all duration-200 outline-none bg-white ${
                      studentErrors.studentClass
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-200 hover:border-gray-300 focus:border-[#6366F1] focus:ring-[#6366F1]/10"
                    }`}
                    aria-invalid={!!studentErrors.studentClass}
                    aria-describedby={studentErrors.studentClass ? 'student-class-error' : undefined}
                  />
                  {studentErrors.studentClass && (
                    <p id="student-class-error" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {studentErrors.studentClass.message}
                    </p>
                  )}
                </div>

                {/* Registration Number */}
                <div className="mb-6">
                  <label
                    htmlFor="student-reg"
                    className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-2 text-gray-500"
                  >
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="student-reg"
                    placeholder="SMF/000/000"
                    {...registerStudent("studentReg", {
                      required: "Registration number is required",
                    })}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleStudentSubmit(onStudentSubmit)()
                    }
                    className={`w-full h-11 px-4 border rounded-xl text-sm bg-white text-[#09090B] outline-none transition-all duration-200 focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-gray-400 ${
                      studentErrors.studentReg
                        ? "border-red-300"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-invalid={!!studentErrors.studentReg}
                    aria-describedby={studentErrors.studentReg ? 'student-reg-error' : undefined}
                  />
                  {studentErrors.studentReg && (
                    <p id="student-reg-error" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {studentErrors.studentReg.message}
                    </p>
                  )}
                </div>

                {/* Student error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 flex items-start gap-2.5 text-red-600"
                      role="alert"
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-xs leading-relaxed">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full h-11 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                  }}
                >
                  {studentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      VIEW RESULTS
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-[10px] mt-4 text-gray-400">
                Secure access &middot; Results are read-only
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
