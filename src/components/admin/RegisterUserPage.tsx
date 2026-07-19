import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import sqlDatabase from '../../services/sqlDatabase';
import { API_CONFIG } from '../../config/api';

export function RegisterUserPage() {
  const { addTeacher, addParent, addAccountant, createUserAPI, classes, users } = useSchool();

  const [selectedRole, setSelectedRole] = useState<'teacher' | 'parent' | 'accountant' | ''>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean;
    message: string;
    isChecking: boolean;
  }>({ isValid: true, message: '', isChecking: false });

  // Real-time username validation
  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameValidation({ isValid: true, message: '', isChecking: false });
      return;
    }

    setUsernameValidation({ isValid: false, message: 'Checking...', isChecking: true });

    try {
      const normalized = username.trim().toLowerCase();
      const exists = (users || []).some((u: any) => String(u?.username || '').toLowerCase() === normalized);

      if (exists) {
        setUsernameValidation({
          isValid: false,
          message: 'Username already taken',
          isChecking: false,
        });
        return;
      }

      setUsernameValidation({
        isValid: true,
        message: 'Username available',
        isChecking: false,
      });
    } catch (error) {
      // Handle network error
      setUsernameValidation({ 
        isValid: true, 
        message: '', 
        isChecking: false 
      });
    }
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    // Teacher specific
    qualification: '',
    isClassTeacher: false,
    classTeacherId: null as number | null,
    // Accountant specific
    department: '',
    photoUrl: '',
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData({ ...formData, photoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    setFormData({ ...formData, photoUrl: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please enter first name and last name');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Please enter username');
      return;
    }

    if (!usernameValidation.isValid) {
      toast.error(usernameValidation.message || 'Username is not available');
      return;
    }

    // Use a secure default password or the one provided.
    // The new backend requires a password, it no longer creates a default one.
    const userPassword = formData.password.trim() || 'password123';

    try {
      // Consolidate all data into a single payload for the unified API
      const payload = {
        // User details
        username: formData.username.trim(),
        password: userPassword,
        role: selectedRole,
        email: formData.email?.trim() || `${formData.username.trim()}@school.local`,
        
        // Linked record details
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        
        // Role-specific details
        qualification: formData.qualification,
        isClassTeacher: formData.isClassTeacher,
        departmentId: formData.classTeacherId,
        department: formData.department,
        
        // Default status
        status: 'Active',
      };

      // A single API call now handles everything
      const createdUser = await createUserAPI(payload);

      if (!createdUser) {
        // createUserAPI already shows specific error toasts
        return;
      }

      // Show a simplified success message
      const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
      toast.success(
        `${roleLabel} registered successfully!\n\nLogin Credentials:\nUsername: ${formData.username}`,
        {
          duration: 8000,
          style: {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-line'
          }
        }
      );

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        qualification: '',
        isClassTeacher: false,
        classTeacherId: null,
        department: '',
        photoUrl: '',
      });
      setPhotoPreview('');
      setSelectedRole('');

    } catch (error) {
      toast.error('An unexpected error occurred during registration.');
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      qualification: '',
      isClassTeacher: false,
      classTeacherId: null,
      department: '',
      photoUrl: '',
    });
    setPhotoPreview('');
    setSelectedRole('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#0A2540] flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-white" weight="bold" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-[#1F2937] mb-1">Register User</h1>
            <p className="text-[#6B7280]">Register teachers, parents, or accountants with login credentials</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="section-band">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0A2540] flex items-center justify-center shadow-sm">
                <Plus className="w-5 h-5 text-white" weight="bold" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-800">User Information</h3>
            </div>
          </div>
          <div className="p-8 space-y-8">
            {/* Role Selection - Prominent */}
            <div className="space-y-3">
              <Label className="text-[#1F2937]">
                Select Role <span className="text-[#EF4444]">*</span>
              </Label>
              <Select value={selectedRole} onValueChange={(value: string) => setSelectedRole(value as 'teacher' | 'parent' | 'accountant' | '')}>
                <SelectTrigger className="h-14 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-[#F9FAFB] text-[#1F2937] hover:bg-white transition-all shadow-sm">
                  <SelectValue placeholder="Choose user role to continue" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-100 rounded-xl shadow-lg">
                  <SelectItem value="teacher" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      Teacher
                    </div>
                  </SelectItem>
                  <SelectItem value="parent" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#0A2540]" />
                      Parent/Guardian
                    </div>
                  </SelectItem>
                  <SelectItem value="accountant" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      Accountant
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B7280]">Select the role for the user you want to register</p>
            </div>

            {selectedRole && (
              <>
                {/* Photo Upload - Enhanced */}
                <div className="space-y-3 p-6 bg-[#F9FAFB] rounded-xl border-2 border-dashed border-gray-100">
                  <Label className="text-[#1F2937]">Profile Photo (Optional)</Label>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {photoPreview ? (
                        <div className="relative group">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-32 h-32 rounded-xl object-cover border-4 border-white shadow-lg ring-2 ring-[#0A2540]/20"
                          />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute -top-2 -right-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                          >
                            <span className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center bg-white hover:border-[#0A2540] transition-all group cursor-pointer">
                          <span className="w-8 h-8 text-[#94A3B8] group-hover:text-[#0A2540] mb-2 transition-colors" />
                          <span className="text-xs text-[#6B7280]">Click to upload</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="rounded-xl border-2 border-gray-100 text-[#1F2937] hover:bg-white hover:border-[#0A2540] transition-all shadow-sm"
                      >
                        <span className="w-4 h-4 mr-2" />
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      <div className="space-y-1">
                        <p className="text-xs text-[#6B7280]">• Accepted formats: JPG, PNG, GIF</p>
                        <p className="text-xs text-[#6B7280]">• Maximum file size: 5MB</p>
                        <p className="text-xs text-[#6B7280]">• Recommended: Square image 500x500px</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4 pt-6 border-t-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#0A2540]/10 flex items-center justify-center">
                      <span className="text-[#0A2540]">1</span>
                    </div>
                    <h4 className="font-heading font-semibold text-[#1F2937]">Personal Details</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        First Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Enter first name"
                        className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Last Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Enter last name"
                        className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">Email Address (Optional)</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Phone Number <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="080XXXXXXXX"
                        className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Role-specific fields */}
                {selectedRole === 'teacher' && (
                  <div className="space-y-4 pt-6 border-t-2 border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <span className="text-[#10B981]">2</span>
                      </div>
                      <h4 className="font-heading font-semibold text-[#1F2937]">Teacher Details</h4>
                    </div>
                    <div className="grid md:grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Qualification <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Select
                          value={formData.qualification}
                          onValueChange={(value: string) => setFormData({ ...formData, qualification: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all">
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-100 rounded-xl">
                            <SelectItem value="NCE" className="text-[#1F2937] rounded-lg">NCE</SelectItem>
                            <SelectItem value="B.Ed" className="text-[#1F2937] rounded-lg">B.Ed</SelectItem>
                            <SelectItem value="B.Sc" className="text-[#1F2937] rounded-lg">B.Sc</SelectItem>
                            <SelectItem value="B.A" className="text-[#1F2937] rounded-lg">B.A</SelectItem>
                            <SelectItem value="M.Ed" className="text-[#1F2937] rounded-lg">M.Ed</SelectItem>
                            <SelectItem value="M.Sc" className="text-[#1F2937] rounded-lg">M.Sc</SelectItem>
                            <SelectItem value="PhD" className="text-[#1F2937] rounded-lg">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Class Teacher Assignment */}
                    <div className="p-6 bg-gradient-to-br from-[#F0F4F8] to-[#F8FAFC] rounded-xl border-2 border-[#0A2540]/20 space-y-4 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="classTeacher"
                          checked={formData.isClassTeacher}
                          onCheckedChange={(checked: boolean) =>
                            setFormData({
                              ...formData,
                              isClassTeacher: checked,
                              classTeacherId: checked ? formData.classTeacherId : null,
                            })
                          }
                          className="border-2 border-[#0A2540] data-[state=checked]:bg-[#0A2540]"
                        />
                        <Label htmlFor="classTeacher" className="text-[#1F2937] cursor-pointer">
                          Assign as Class Teacher
                        </Label>
                      </div>
                      {formData.isClassTeacher && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <Label className="text-[#1F2937]">
                            Assigned Class <span className="text-[#EF4444]">*</span>
                          </Label>
                          <Select
                            value={formData.classTeacherId?.toString() || ''}
                            onValueChange={(value: string) =>
                              setFormData({ ...formData, classTeacherId: parseInt(value) })
                            }
                          >
                            <SelectTrigger className="h-12 rounded-xl border-2 border-[#0A2540]/20 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                              <SelectValue placeholder="Select class for this teacher" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-100 rounded-xl">
                              {classes
                                .filter((c) => c.status === 'Active')
                                .map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id.toString()} className="text-[#1F2937] rounded-lg">
                                    {cls.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedRole === 'accountant' && (
                  <div className="space-y-4 pt-6 border-t-2 border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                        <span className="text-[#F59E0B]">2</span>
                      </div>
                      <h4 className="font-heading font-semibold text-[#1F2937]">Accountant Details</h4>
                    </div>
                    <div className="grid md:grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Department <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="e.g., Finance"
className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Credentials */}
                <div className="space-y-4 pt-6 border-t-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FB923C]/10 flex items-center justify-center">
                      <span className="text-[#FB923C]">{selectedRole === 'parent' ? '2' : '3'}</span>
                    </div>
                    <h4 className="font-heading font-semibold text-[#1F2937]">Login Credentials</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Username <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.username}
                        onChange={(e) => {
                          const newUsername = e.target.value;
                          setFormData({ ...formData, username: newUsername });
                          // Check username availability with debounce
                          const timeoutId = setTimeout(() => {
                            checkUsernameAvailability(newUsername);
                          }, 500);
                          return () => clearTimeout(timeoutId);
                        }}
                        placeholder="Username for login"
                        className={`h-12 rounded-xl border-2 ${
                          usernameValidation.isChecking 
                            ? 'border-[#F59E0B] focus:border-[#F59E0B]' 
                            : usernameValidation.isValid 
                              ? 'border-gray-100 focus:border-[#0A2540]' 
                              : 'border-[#EF4444] focus:border-[#EF4444]'
                        } bg-white text-[#1F2937] transition-all`}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#6B7280]">This will be used for system login</p>
                        {usernameValidation.message && (
                          <p className={`text-xs ${
                            usernameValidation.isValid 
                              ? 'text-[#10B981]' 
                              : 'text-[#EF4444]'
                          }`}>
                            {usernameValidation.isChecking && '⏳ '}
                            {usernameValidation.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Password (Optional)
                      </Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave blank for default password (1234567)"
                        className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all"
                      />
                      <p className="text-xs text-[#6B7280]">Default password: 1234567 (user can change after first login)</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons - Enhanced */}
        {selectedRole && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-[#F9FAFB] rounded-xl border border-gray-100">
            <p className="text-sm text-[#6B7280]">
              Please review all information before submitting
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="rounded-xl border-2 border-gray-100 text-[#1F2937] hover:bg-white hover:border-[#CBD5E1] transition-all h-12 px-6"
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#0A2540] to-[#0A2540]/90 hover:from-[#0A2540]/90 hover:to-[#0A2540] text-white rounded-xl shadow-lg hover:shadow-xl transition-all h-12 px-8 hover-lift"
              >
                <span className="w-5 h-5 mr-2" />
                Register {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
