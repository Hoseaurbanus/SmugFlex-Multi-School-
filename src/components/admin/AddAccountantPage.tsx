import { Briefcase } from 'lucide-react';
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
export function AddAccountantPage() {
  const { addAccountant } = useSchool();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    employeeId: "",
    username: "",
    password: "",
    status: "Active" as "Active" | "Inactive",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.employeeId || !formData.username || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Add accountant
    const accountantId = addAccountant({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      employeeId: formData.employeeId,
      status: formData.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    toast.success(`Accountant ${formData.firstName} ${formData.lastName} added successfully!`);

    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      employeeId: "",
      username: "",
      password: "",
      status: "Active",
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Add New Accountant</h1>
        <p className="text-[#6B7280]">Register a new accountant and create their user account</p>
      </div>

      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="bg-[#3B82F6] rounded-t-lg p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-semibold">Accountant Information</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-[#1F2937] font-medium flex items-center gap-2">
                <span className="w-4 h-4 text-[#3B82F6]" />
                Personal Information
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1F2937]">First Name *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F2937]">Last Name *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1F2937] flex items-center gap-2">
                    <span className="w-4 h-4" />
                    Email Address *
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="accountant@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F2937] flex items-center gap-2">
                    <span className="w-4 h-4" />
                    Phone Number *
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="08012345678"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Employee ID *</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                  placeholder="SCH/ACC/001"
                  required
                />
              </div>
            </div>

            {/* User Account Information */}
            <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
              <h4 className="text-[#1F2937] font-medium flex items-center gap-2">
                <span className="w-4 h-4 text-[#3B82F6]" />
                User Account Credentials
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1F2937]">Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="accountant.username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1F2937]">Password *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                >
                  <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#E5E7EB]">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[#3B82F6] text-white hover:bg-[#2563EB] h-12 rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all hover-lift"
              >
                <span className="w-5 h-5 mr-2" />
                Add Accountant
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    employeeId: "",
                    username: "",
                    password: "",
                    status: "Active",
                  })
                }
                className="bg-[#6B7280] text-white hover:bg-[#4B5563] h-12 rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
              >
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] shadow-clinical">
        <CardContent className="p-4">
          <h4 className="text-[#1E40AF] mb-2 font-medium">Important Notes:</h4>
          <ul className="text-[#1E40AF] text-sm space-y-1 list-disc list-inside">
            <li>Accountant will have access to fee management and payment verification</li>
            <li>Username must be unique across the system</li>
            <li>Ensure email and phone number are valid for communication</li>
            <li>Employee ID should follow the format: SCH/ACC/XXX</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
