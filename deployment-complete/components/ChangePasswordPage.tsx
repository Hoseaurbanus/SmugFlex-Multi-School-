import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { useSchool } from '../contexts/SchoolContext';

export function ChangePasswordPage() {
  const { currentUser, changePassword } = useSchool();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }

    const success = await changePassword(
      formData.currentPassword,
      formData.newPassword
    );

    if (success) {
      toast.success('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    } else {
      toast.error('Current password is incorrect');
      setErrors({ currentPassword: 'Incorrect password' });
    }
  };

  const handleReset = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Change Password</h1>
        <p className="text-[#6B7280]">Update your account password for security</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          <strong>Password Security Tips:</strong>
          <br />
          • Use at least 6 characters
          <br />
          • Include a mix of uppercase, lowercase, numbers, and symbols
          <br />
          • Avoid using personal information
          <br />
          • Don't reuse passwords from other accounts
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="text-lg text-[#1F2937]">Update Password</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                Current Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, currentPassword: e.target.value })
                  }
                  className={`h-12 rounded-lg border ${
                    errors.currentPassword ? 'border-red-500' : 'border-[#E5E7EB]'
                  } bg-[#F9FAFB] text-[#1F2937] pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937]"
                >
                  {showCurrentPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  className={`h-12 rounded-lg border ${
                    errors.newPassword ? 'border-red-500' : 'border-[#E5E7EB]'
                  } bg-[#F9FAFB] text-[#1F2937] pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937]"
                >
                  {showNewPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword}</p>
              )}
              <p className="text-xs text-[#6B7280]">Minimum 6 characters</p>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className={`h-12 rounded-lg border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-[#E5E7EB]'
                  } bg-[#F9FAFB] text-[#1F2937] pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937]"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="flex-1 rounded-lg border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
              >
                <span className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
