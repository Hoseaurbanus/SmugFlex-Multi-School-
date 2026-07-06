import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, ArrowLeft } from 'lucide-react';
import { superAdminAuth } from '../../services/superAdminAuthService';

export function SuperAdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
        setError('Invalid credentials');
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
    <div className="min-h-screen bg-[#0A2540] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Shield className="w-8 h-8 text-[#0A2540]" />
          </div>
          <h1 className="text-2xl text-white font-bold">SmugFlex Admin</h1>
          <p className="text-white/50 text-sm mt-1">Platform Administration Portal</p>
        </div>

        <Card className="rounded-2xl shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-white pb-4 pt-6">
            <h2 className="text-center text-[#0A2540] font-bold">Super Admin Login</h2>
          </CardHeader>
          <CardContent className="bg-white p-6 space-y-5" onKeyPress={handleKeyPress}>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sa-username" className="text-sm text-gray-600">Username</Label>
              <Input
                id="sa-username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-xl border-gray-200 focus:border-[#0A2540] focus:ring-[#0A2540]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-password" className="text-sm text-gray-600">Password</Label>
              <Input
                id="sa-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-gray-200 focus:border-[#0A2540] focus:ring-[#0A2540]"
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={!username || !password || isLoading}
              className="w-full h-11 bg-[#0A2540] hover:bg-[#0d3558] text-white rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center pt-1">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-500 hover:text-[#0A2540] transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to School Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
