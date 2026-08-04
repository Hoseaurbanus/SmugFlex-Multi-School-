import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/sheet';

interface CreateFormData {
  username: string;
  password: string;
  role: string;
  linkedId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  occupation: string;
  status: string;
  gender: string;
  qualification: string;
  specialization: string[];
  isClassTeacher: boolean;
  assignedClassId: number | null;
  departmentId: string;
  alternatePhone: string;
  department: string;
}

interface UsernameValidation {
  isChecking: boolean;
  isValid: boolean;
  message: string;
}

interface CreateUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateFormData;
  onFormDataChange: (data: CreateFormData) => void;
  usernameValidation: UsernameValidation;
  isLoading: boolean;
  classes: Array<{ id: number; name: string; status: string; class_teacher_id?: number }>;
  onCreate: () => void;
  onCheckUsername: (username: string) => void;
}

export function CreateUserSheet({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  usernameValidation,
  isLoading,
  classes,
  onCreate,
  onCheckUsername,
}: CreateUserSheetProps) {
  const update = (patch: Partial<CreateFormData>) => onFormDataChange({ ...formData, ...patch });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl p-0 sm:rounded-t-none sm:h-full sm:max-w-lg sm:mx-auto">
        <div className="flex flex-col h-full">
          {/* Sticky Header */}
          <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-[#1F2937] text-lg">Create New User</SheetTitle>
                  <SheetDescription className="text-[#6B7280] text-sm">
                    Add a new user with role-based access
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 py-5 space-y-6">

              {/* Section 1: Role Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#0A2540] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Select Role</h4>
                </div>
                <Select value={formData.role} onValueChange={(value) => update({ role: value })}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-[#F9FAFB] text-[#1F2937] hover:bg-white transition-all shadow-sm">
                    <SelectValue placeholder="Choose user role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-100 rounded-xl shadow-lg">
                    <SelectItem value="admin" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EF4444]" />Admin</div>
                    </SelectItem>
                    <SelectItem value="teacher" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10B981]" />Teacher</div>
                    </SelectItem>
                    <SelectItem value="accountant" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#F59E0B]" />Accountant</div>
                    </SelectItem>
                    <SelectItem value="parent" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0A2540]" />Parent/Guardian</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Section 2: Personal Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#0A2540]/10 flex items-center justify-center">
                    <span className="text-[#0A2540] text-xs font-bold">2</span>
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Personal Details</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">First Name <span className="text-[#EF4444]">*</span></Label>
                    <Input value={formData.firstName} onChange={(e) => update({ firstName: e.target.value })} placeholder="Enter first name" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Last Name <span className="text-[#EF4444]">*</span></Label>
                    <Input value={formData.lastName} onChange={(e) => update({ lastName: e.target.value })} placeholder="Enter last name" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1F2937] text-sm">Email Address</Label>
                  <Input type="email" value={formData.email} onChange={(e) => update({ email: e.target.value })} placeholder="email@example.com" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1F2937] text-sm">Phone Number</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="080XXXXXXXX" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] focus:ring-[#0A2540]/20 bg-white text-[#1F2937] transition-all" />
                </div>
              </div>

              {/* Section 3: Role-specific fields */}
              {formData.role === 'teacher' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                      <span className="text-[#10B981] text-xs font-bold">3</span>
                    </div>
                    <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Teacher Details</h4>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => update({ gender: value })}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100 rounded-xl">
                        <SelectItem value="Male" className="text-[#1F2937] rounded-lg">Male</SelectItem>
                        <SelectItem value="Female" className="text-[#1F2937] rounded-lg">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Qualification</Label>
                    <Select value={formData.qualification} onValueChange={(value) => update({ qualification: value })}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100 rounded-xl">
                        {['NCE', 'B.Ed', 'B.Sc', 'B.A', 'M.Ed', 'M.Sc', 'PhD'].map(q => (
                          <SelectItem key={q} value={q} className="text-[#1F2937] rounded-lg">{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Specialization</Label>
                    <Input value={formData.specialization.join(', ')} onChange={(e) => update({ specialization: e.target.value.split(',').map(s => s.trim()).filter(s => s) })} placeholder="e.g., Mathematics, Physics" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Department</Label>
                    <Select value={formData.departmentId} onValueChange={(value) => update({ departmentId: value })}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100 rounded-xl">
                        <SelectItem value="" className="text-[#1F2937] rounded-lg">Select department</SelectItem>
                        {[['1','Sciences'],['2','Mathematics'],['3','Languages'],['4','Social Sciences'],['5','Technical']].map(([v,l]) => (
                          <SelectItem key={v} value={v} className="text-[#1F2937] rounded-lg">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-[#F0F4F8] to-[#F8FAFC] rounded-xl border-2 border-[#0A2540]/20 space-y-3 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="isClassTeacher" checked={formData.isClassTeacher} onCheckedChange={(checked: boolean) => update({ isClassTeacher: checked, assignedClassId: checked ? formData.assignedClassId : null })} className="border-2 border-[#0A2540] data-[state=checked]:bg-[#0A2540]" />
                      <Label htmlFor="isClassTeacher" className="text-[#1F2937] text-sm cursor-pointer">Assign as Class Teacher</Label>
                    </div>
                    {formData.isClassTeacher && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                        <Label className="text-[#1F2937] text-sm">Assigned Class <span className="text-[#EF4444]">*</span></Label>
                        <Select value={formData.assignedClassId?.toString() || ""} onValueChange={(value: string) => update({ assignedClassId: parseInt(value) })}>
                          <SelectTrigger className="h-12 rounded-xl border-2 border-[#0A2540]/20 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-100 rounded-xl">
                            {classes.filter((c) => c.status === 'Active' && !c.class_teacher_id).map((cls) => (
                              <SelectItem key={cls.id} value={cls.id.toString()} className="text-[#1F2937] rounded-lg">{cls.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.role === 'parent' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#0A2540]/10 flex items-center justify-center">
                      <span className="text-[#0A2540] text-xs font-bold">3</span>
                    </div>
                    <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Parent Details</h4>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Address <span className="text-[#EF4444]">*</span></Label>
                    <Input value={formData.address} onChange={(e) => update({ address: e.target.value })} placeholder="Enter home address" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Alternate Phone</Label>
                    <Input type="tel" value={formData.alternatePhone} onChange={(e) => update({ alternatePhone: e.target.value })} placeholder="Alternate contact number" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Occupation <span className="text-[#EF4444]">*</span></Label>
                    <Input value={formData.occupation} onChange={(e) => update({ occupation: e.target.value })} placeholder="Enter occupation" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  </div>
                </div>
              )}

              {formData.role === 'accountant' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                      <span className="text-[#F59E0B] text-xs font-bold">3</span>
                    </div>
                    <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Accountant Details</h4>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm">Department <span className="text-[#EF4444]">*</span></Label>
                    <Input value={formData.department} onChange={(e) => update({ department: e.target.value })} placeholder="e.g., Finance, Accounts, Bursary" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  </div>
                </div>
              )}

              {/* Section: Login Credentials */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#FB923C]/10 flex items-center justify-center">
                    <span className="text-[#FB923C] text-xs font-bold">
                      {formData.role === 'teacher' ? '4' : formData.role === 'parent' || formData.role === 'accountant' ? '4' : '3'}
                    </span>
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-[#1F2937]">Login Credentials</h4>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1F2937] text-sm">Username <span className="text-[#EF4444]">*</span></Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => {
                      const newUsername = e.target.value;
                      update({ username: newUsername });
                      const timeoutId = setTimeout(() => onCheckUsername(newUsername), 500);
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
                  <div className="flex items-center justify-between min-h-[20px]">
                    <p className="text-xs text-[#6B7280]">This will be used for system login</p>
                    {usernameValidation.message && (
                      <p className={`text-xs ${usernameValidation.isValid ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {usernameValidation.isChecking && '⏳ '}{usernameValidation.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1F2937] text-sm">Password (Optional)</Label>
                  <Input type="password" value={formData.password} onChange={(e) => update({ password: e.target.value })} placeholder="Leave blank for default password" className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all" />
                  <p className="text-xs text-[#6B7280]">Default password: {formData.role}123</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1F2937] text-sm">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => update({ status: value })}>
                    <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 focus:border-[#0A2540] bg-white text-[#1F2937] transition-all">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-100 rounded-xl">
                      <SelectItem value="Active" className="text-[#1F2937] rounded-lg">Active</SelectItem>
                      <SelectItem value="Inactive" className="text-[#1F2937] rounded-lg">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-4 sm:h-0" />
            </div>
          </div>

          {/* Sticky Footer Buttons */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-[#F9FAFB]">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl border-2 border-gray-100 text-[#1F2937] hover:bg-white hover:border-[#CBD5E1] transition-all">
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={isLoading || (formData.username.trim() !== '' && !usernameValidation.isValid)} className="flex-1 h-12 bg-gradient-to-r from-[#0A2540] to-[#0A2540]/90 hover:from-[#0A2540]/90 hover:to-[#0A2540] text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                {isLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
