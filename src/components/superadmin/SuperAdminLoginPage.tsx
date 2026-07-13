import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, ArrowLeft, Eye, EyeOff, Loader2, Lock, User, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { superAdminAuth } from '../../services/superAdminAuthService';

export function SuperAdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const user = await superAdminAuth.login(username, password);
      if (user) {
        navigate('/super-admin/dashboard');
      } else {
        setError('Invalid credentials. Please check your username and password.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#0A2540] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -top-20 -right-20 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 15, 0], x: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute w-48 h-48 bg-amber-500/10 rounded-full blur-3xl bottom-10 -left-10 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute w-32 h-32 bg-cyan-500/8 rounded-full blur-2xl top-1/3 left-1/4 pointer-events-none"
      />

      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={mounted ? { scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30"
          >
            <Shield className="w-8 h-8 text-[#0A2540]" weight="fill" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl text-white font-heading font-bold tracking-tight">
            SmugFlex Admin
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Platform Administration Portal
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
            {/* Card header accent */}
            <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

            <div className="p-6 sm:p-8 space-y-6" onKeyPress={handleKeyPress}>
              {/* Card title */}
              <div className="text-center">
                <h2 className="text-lg font-heading font-bold text-[#0A2540]">
                  Sign In
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your credentials to continue
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="border-red-200 bg-red-50 rounded-xl">
                    <AlertDescription className="text-red-700 text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="sa-username" className="text-sm font-semibold text-gray-700">
                  Username
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <Input
                    id="sa-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-100 pl-10 pr-4 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-gray-50 focus:bg-white text-[#1F2937] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="sa-password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <Input
                    id="sa-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-100 pl-10 pr-12 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-gray-50 focus:bg-white text-[#1F2937] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleLogin}
                disabled={!username || !password || isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#0A2540] to-[#0d3558] hover:from-[#0d3558] hover:to-[#0A2540] text-white rounded-xl font-heading font-semibold text-sm transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#0A2540]/20 hover:shadow-xl hover:shadow-[#0A2540]/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-400">or</span>
                </div>
              </div>

              {/* Back link */}
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#0A2540] transition-colors py-2 rounded-xl hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to School Login
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center text-white/20 text-xs mt-6"
        >
          SmugFlex v2.0 &middot; Secure Access Only
        </motion.p>
      </div>
    </div>
  );
}
