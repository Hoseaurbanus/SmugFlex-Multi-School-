import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';

export function AddParentPage() {
  const { students, parents, addParent, createUser, linkParentToStudent } = useSchool();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    selectedStudentIds: [] as number[],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[0-9]{11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 11 digits';
    }
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    // Check if email already exists
    if (parents.some((p) => p.email === formData.email.trim())) {
      toast.error('A parent with this email already exists');
      return;
    }

    try {
      // Add parent
      const newParentId = await addParent({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        student_ids: [],
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (newParentId === -1) {
        toast.error('Failed to create parent. Please try again.');
        return;
      }

      // Verify parent was created successfully
      const createdParent = parents.find(p => p.id === newParentId);
      if (!createdParent) {
        toast.error('Parent creation verification failed. Please try again.');
        return;
      }

      // Create user account
      const newUser = await createUser({
        username: formData.username.trim(),
        password: formData.password,
        role: 'parent',
        linkedId: newParentId,
        email: formData.email.trim(),
        status: 'Active',
      });

      // Verify user was created and linked correctly
      if (!newUser || newUser.linked_id !== newParentId) {
        toast.error('User creation or linking failed. Please try again.');
        return;
      }

      // Link selected students to this parent
      if (formData.selectedStudentIds.length > 0) {
        for (const studentId of formData.selectedStudentIds) {
          await linkParentToStudent(newParentId, studentId);
        }
        toast.success(
          `Parent registered successfully with ${formData.selectedStudentIds.length} student(s) linked!`
        );
      } else {
        toast.success('Parent registered successfully! You can link students later.');
      }
    } catch (error) {
      toast.error('Failed to register parent. Please try again.');
      return;
    }

    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      selectedStudentIds: [],
    });
    setErrors({});
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      selectedStudentIds: [],
    });
    setErrors({});
  };

  const handleStudentToggle = (studentId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedStudentIds: prev.selectedStudentIds.includes(studentId)
        ? prev.selectedStudentIds.filter((id) => id !== studentId)
        : [...prev.selectedStudentIds, studentId],
    }));
  };

  // Filter students without parents for easier selection
  const studentsWithoutParents = students.filter((s) => !s.parent_id);
  const studentsWithParents = students.filter((s) => s.parent_id);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Register New Parent/Guardian</h1>
        <p className="text-gray-600">Add a new parent and link to their children</p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          <strong>Parent Registration Process:</strong>
          <br />
          1. Enter parent/guardian contact information
          <br />
          2. Create login credentials for portal access
          <br />
          3. Optionally link to existing students (their children)
          <br />
          4. Parent will be able to view results and pay fees through the portal
          <br />• You can link students now or later from "Link Student-Parent" page
        </AlertDescription>
      </Alert>

      {/* Registration Form */}
      <form onSubmit={handleSubmit}>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-lg text-gray-900">Parent/Guardian Information</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-md text-gray-900 font-medium">Personal Details</h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-md text-gray-900 font-medium">Contact Information</h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="parent@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`h-12 pl-11 rounded-xl border ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } bg-white text-gray-900`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  <p className="text-xs text-gray-500">
                    This email will be used for portal login
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="08012345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`h-12 pl-11 rounded-xl border ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      } bg-white text-gray-900`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Login Credentials */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-md text-gray-900 font-medium">Portal Login Credentials</h4>
              <p className="text-sm text-gray-600">
                Create login credentials for parent to access the portal
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                  <p className="text-xs text-gray-500">
                    Parent will use this to login to the portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter initial password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  <p className="text-xs text-gray-500">
                    Minimum 6 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Link to Students */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-md text-gray-900 font-medium">Link to Children (Optional)</h4>
              <p className="text-sm text-gray-600">
                Select students who are children of this parent/guardian
              </p>

              {studentsWithoutParents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-700">Students Without Parents</Label>
                  <div className="border border-gray-300 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="space-y-3">
                      {studentsWithoutParents.map((student) => (
                        <div key={student.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                          <Checkbox
                            id={`student-${student.id}`}
                            checked={formData.selectedStudentIds.includes(student.id)}
                            onCheckedChange={() => handleStudentToggle(student.id)}
                            className="border-gray-400"
                          />
                          <Label
                            htmlFor={`student-${student.id}`}
                            className="flex-1 cursor-pointer text-gray-900"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.admissionNumber} - {student.className}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {studentsWithParents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-700">Students Already Linked to Other Parents</Label>
                  <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto bg-gray-50">
                    <div className="space-y-2">
                      {studentsWithParents.map((student) => {
                        const parent = parents.find((p) => p.id === student.parent_id);
                        return (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                            <div>
                              <p className="text-sm text-gray-700">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Linked to: {parent?.firstName} {parent?.lastName}
                              </p>
                            </div>
                            <Checkbox
                              id={`student-linked-${student.id}`}
                              checked={formData.selectedStudentIds.includes(student.id)}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                              className="border-gray-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    You can still link these students (will update their parent link)
                  </p>
                </div>
              )}

              {students.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <span className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No students registered yet</p>
                  <p className="text-xs text-gray-500">Register students first to link them to parents</p>
                </div>
              )}

              {formData.selectedStudentIds.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-900">
                    <strong>{formData.selectedStudentIds.length}</strong> student(s) will be linked to this parent
                  </p>
                </div>
              )}
            </div>

            {/* Preview */}
            {formData.firstName && formData.lastName && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Preview:</strong>
                </p>
                <p className="text-gray-900">
                  Parent: {formData.firstName} {formData.lastName}
                </p>
                <p className="text-gray-600 text-sm">Email: {formData.email || 'Not provided'}</p>
                <p className="text-gray-600 text-sm">Phone: {formData.phone || 'Not provided'}</p>
                {formData.selectedStudentIds.length > 0 && (
                  <p className="text-gray-600 text-sm">
                    Children: {formData.selectedStudentIds.length} student(s)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
          >
            <span className="w-4 h-4 mr-2" />
            Register Parent
          </Button>
        </div>
      </form>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Parents</p>
              <span className="w-5 h-5 text-[#2563EB]" />
            </div>
            <p className="text-2xl text-gray-900">{parents.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Students Without Parents</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-2xl text-gray-900">{studentsWithoutParents.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Students</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-2xl text-gray-900">{students.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
