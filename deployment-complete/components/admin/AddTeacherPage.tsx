import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function AddTeacherPage() {
  const { addTeacher, classes } = useSchool();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: [] as string[],
    qualification: "",
    employeeId: "",
    isClassTeacher: false,
    classTeacherId: null as number | null,
    username: "",
    password: "",
  });

  const [selectedSpecialization, setSelectedSpecialization] = useState("");

  const addSpecialization = () => {
    if (selectedSpecialization && !formData.specialization.includes(selectedSpecialization)) {
      setFormData({
        ...formData,
        specialization: [...formData.specialization, selectedSpecialization]
      });
      setSelectedSpecialization("");
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData({
      ...formData,
      specialization: formData.specialization.filter(s => s !== spec)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate specialization
    if (formData.specialization.length === 0) {
      toast.error("Please add at least one subject specialization");
      return;
    }

    // Validate class teacher assignment
    if (formData.isClassTeacher && !formData.classTeacherId) {
      toast.error("Please select a class for the class teacher assignment");
      return;
    }

    try {
      // Add teacher
      const teacherId = addTeacher({
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeId: formData.employeeId,
        email: formData.email,
        phone: formData.phone,
        department: formData.specialization.join(', ') || 'General',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success(`Teacher ${formData.firstName} ${formData.lastName} added successfully!`);
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialization: [],
        qualification: "",
        employeeId: "",
        isClassTeacher: false,
        classTeacherId: null,
        username: "",
        password: "",
      });
    } catch (error) {
      toast.error("Failed to add teacher. Please try again.");
      }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Add New Teacher</h1>
        <p className="text-gray-600">Register a new teaching staff member with login credentials</p>
      </div>

      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm max-w-4xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center border-4 border-gray-200">
                  <span className="w-16 h-16 text-white" />
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <span className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">First Name *</Label>
                <Input
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Last Name *</Label>
                <Input
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Email Address *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@gra.edu.ng"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="080XXXXXXXX"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Qualification *</Label>
                <Select value={formData.qualification} onValueChange={(value) => setFormData({ ...formData, qualification: value })}>
                  <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="NCE" className="text-gray-900">NCE</SelectItem>
                    <SelectItem value="B.Ed" className="text-gray-900">B.Ed</SelectItem>
                    <SelectItem value="B.Sc" className="text-gray-900">B.Sc</SelectItem>
                    <SelectItem value="B.A" className="text-gray-900">B.A</SelectItem>
                    <SelectItem value="M.Ed" className="text-gray-900">M.Ed</SelectItem>
                    <SelectItem value="M.Sc" className="text-gray-900">M.Sc</SelectItem>
                    <SelectItem value="PhD" className="text-gray-900">PhD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Employee ID *</Label>
                <Input
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g., GRA/T/001"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Subject Specialization */}
            <div className="space-y-2">
              <Label className="text-gray-700">Subject Specialization *</Label>
              <div className="flex gap-2">
                <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                  <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900 flex-1">
                    <SelectValue placeholder="Select subject to add" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="Mathematics" className="text-gray-900">Mathematics</SelectItem>
                    <SelectItem value="English Language" className="text-gray-900">English Language</SelectItem>
                    <SelectItem value="Physics" className="text-gray-900">Physics</SelectItem>
                    <SelectItem value="Chemistry" className="text-gray-900">Chemistry</SelectItem>
                    <SelectItem value="Biology" className="text-gray-900">Biology</SelectItem>
                    <SelectItem value="Economics" className="text-gray-900">Economics</SelectItem>
                    <SelectItem value="Government" className="text-gray-900">Government</SelectItem>
                    <SelectItem value="Literature" className="text-gray-900">Literature</SelectItem>
                    <SelectItem value="Further Mathematics" className="text-gray-900">Further Mathematics</SelectItem>
                    <SelectItem value="Geography" className="text-gray-900">Geography</SelectItem>
                    <SelectItem value="CRS" className="text-gray-900">CRS</SelectItem>
                    <SelectItem value="IRS" className="text-gray-900">IRS</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addSpecialization}
                  className="h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-6"
                >
                  Add
                </Button>
              </div>
              {formData.specialization.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialization.map((spec) => (
                    <div
                      key={spec}
                      className="bg-blue-50 text-gray-900 px-3 py-1 rounded-lg flex items-center gap-2 border border-blue-200"
                    >
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => removeSpecialization(spec)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Last Name *</Label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
              {formData.isClassTeacher && (
                <div className="space-y-2">
                  <Label className="text-gray-700">Assigned Class *</Label>
                  <Select value={formData.classTeacherId?.toString() || ""} onValueChange={(value) => setFormData({ ...formData, classTeacherId: parseInt(value) })}>
                    <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {classes.filter(c => c.status === 'Active' && !c.classTeacherId).map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                          {cls.name}
                        </SelectItem>
                      ))}
                      {classes.filter(c => c.status === 'Active' && c.classTeacherId).length > 0 && (
                        <div className="px-2 py-1 text-xs text-gray-500 border-t">
                          Classes with teachers are hidden
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* User Account Information */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-gray-900">Login Credentials</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Username *</Label>
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Username for login"
                    className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Password *</Label>
                  <Input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Initial password"
                    className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
              >
                <span className="w-5 h-5 mr-2" />
                Add Teacher
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
