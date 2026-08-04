import React from 'react';
import { User } from 'lucide-react';
import type { User as UserType } from '../../../types/school';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

interface EditFormData {
  username: string;
  email: string;
  role: string;
  status: string;
  first_name: string;
  other_name: string;
  last_name: string;
  phone: string;
  alternatePhone: string;
  address: string;
  employee_id: string;
  gender: string;
  qualification: string;
  department: string;
  occupation: string;
  isClassTeacher?: boolean;
  assignedClassId?: number | string | null;
  departmentId?: number | string | null;
  specialization?: string | string[];
  [key: string]: unknown;
}

interface SelectedUser {
  id: number | string;
  username: string;
  email: string;
  role: string;
  status: string;
  linked_id?: number | string | null;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: SelectedUser | null;
  formData: EditFormData;
  onFormDataChange: (data: EditFormData) => void;
  isLoading: boolean;
  getUserFullName: (user: UserType | SelectedUser) => string;
  getRoleBadgeColor: (role: string) => string;
  onUpdate: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  selectedUser,
  formData,
  onFormDataChange,
  isLoading,
  getUserFullName,
  getRoleBadgeColor,
  onUpdate,
}: EditUserDialogProps) {
  const update = (patch: Partial<EditFormData>) => onFormDataChange({ ...formData, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information and settings.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {selectedUser && (
            <div className="flex items-center gap-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#0A2540]/10 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-[#0A2540]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-base sm:text-lg truncate">{getUserFullName(selectedUser)}</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">@{selectedUser.username}</p>
                <Badge className={`${getRoleBadgeColor(selectedUser.role)} text-xs`}>{selectedUser.role}</Badge>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-username">Username *</Label>
              <Input id="edit-username" value={formData.username} onChange={(e) => update({ username: e.target.value })} placeholder="Enter username" />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={(e) => update({ email: e.target.value })} placeholder="Enter email address" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-gray-900">Complete Name</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input id="edit-firstName" value={formData.first_name || ''} onChange={(e) => update({ first_name: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <Label htmlFor="edit-otherName">Other Name</Label>
                <Input id="edit-otherName" value={formData.other_name || ''} onChange={(e) => update({ other_name: e.target.value })} placeholder="Middle/other name" />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input id="edit-lastName" value={formData.last_name || ''} onChange={(e) => update({ last_name: e.target.value })} placeholder="Last name" />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-gray-900">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Primary Phone</Label>
                <Input id="edit-phone" value={formData.phone || ''} onChange={(e) => update({ phone: e.target.value })} placeholder="Primary phone number" />
              </div>
              <div>
                <Label htmlFor="edit-alternatePhone">Alternate Phone</Label>
                <Input id="edit-alternatePhone" value={formData.alternatePhone || ''} onChange={(e) => update({ alternatePhone: e.target.value })} placeholder="Alternate phone number" />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={formData.address || ''} onChange={(e) => update({ address: e.target.value })} placeholder="Residential address" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => update({ role: value })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => update({ status: value })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {formData.role === 'teacher' && (
            <div className="space-y-3">
              <h4 className="font-heading font-semibold text-gray-900">Teacher Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-employeeId">Employee ID</Label>
                  <Input id="edit-employeeId" value={formData.employee_id || ''} onChange={(e) => update({ employee_id: e.target.value })} placeholder="Employee ID" />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select value={formData.gender || ''} onValueChange={(value) => update({ gender: value })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-qualification">Qualification</Label>
                  <Input id="edit-qualification" value={formData.qualification || ''} onChange={(e) => update({ qualification: e.target.value })} placeholder="e.g., B.Ed, M.Sc, Ph.D" />
                </div>
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Input id="edit-department" value={formData.department || ''} onChange={(e) => update({ department: e.target.value })} placeholder="e.g., Mathematics, Science, Arts" />
                </div>
              </div>
            </div>
          )}
          
          {formData.role === 'accountant' && (
            <div className="space-y-3">
              <h4 className="font-heading font-semibold text-gray-900">Accountant Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-employeeId">Employee ID</Label>
                  <Input id="edit-employeeId" value={formData.employee_id || ''} onChange={(e) => update({ employee_id: e.target.value })} placeholder="Employee ID" />
                </div>
                <div>
                  <Label htmlFor="edit-department">Department</Label>
                  <Input id="edit-department" value={formData.department || ''} onChange={(e) => update({ department: e.target.value })} placeholder="e.g., Finance, Accounts, Bursary" />
                </div>
              </div>
            </div>
          )}
          
          {formData.role === 'parent' && (
            <div className="space-y-3">
              <h4 className="font-heading font-semibold text-gray-900">Parent Information</h4>
              <div>
                <Label htmlFor="edit-occupation">Occupation</Label>
                <Input id="edit-occupation" value={formData.occupation || ''} onChange={(e) => update({ occupation: e.target.value })} placeholder="Parent's occupation" />
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onUpdate} disabled={isLoading}>{isLoading ? 'Updating...' : 'Update User'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
