import { Briefcase } from 'lucide-react'; // Import Briefcase icon
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"; // UI Select components
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool, Department } from "../../contexts/SchoolContext";
// @ts-ignore - TypeScript language service caching issue
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog"; // UI Alert Dialog components

export function DepartmentManagementPage() {
  const { departments, teachers, addDepartment, updateDepartment, deleteDepartment } = useSchool();
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    code: "", 
    head_of_department: "", 
    head_of_department_id: null as number | null,
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

  // Get active teachers
  const activeTeachers = teachers.filter(t => t.status === 'Active');

  // Calculate real teacher counts per department
  const getTeacherCount = (deptName: string) => {
    return teachers.filter(t => t.department?.includes(deptName) && t.status === 'Active').length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error("Please fill all required fields");
      return;
    }

    if (isEditing && selectedDept) {
      const teacher = activeTeachers.find(t => t.id === formData.head_of_department_id);
      updateDepartment(selectedDept.id, {
        name: formData.name,
        code: formData.code.toUpperCase(),
        head_of_department: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
        head_of_department_id: formData.head_of_department_id,
        description: formData.description,
        status: formData.status,
      });
      toast.success("Department updated successfully!");
    } else {
      const teacher = activeTeachers.find(t => t.id === formData.head_of_department_id);
      addDepartment({
        name: formData.name,
        code: formData.code.toUpperCase(),
        head_of_department: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned',
        head_of_department_id: formData.head_of_department_id,
        description: formData.description,
        teacher_count: 0,
        status: formData.status,
      });
      toast.success("Department created successfully!");
    }
    
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({ 
      name: dept.name, 
      code: dept.code, 
      head_of_department: dept.head_of_department,
      head_of_department_id: dept.head_of_department_id,
      description: dept.description,
      status: dept.status
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
    if (selectedDept) {
      const teacherCount = getTeacherCount(selectedDept.name);
      if (teacherCount > 0) {
        toast.error(`Cannot delete department with ${teacherCount} teacher(s). Please reassign teachers first.`);
        setDeleteDialogOpen(false);
        return;
      }
      
      deleteDepartment(selectedDept.id);
      toast.success("Department deleted successfully!");
      setDeleteDialogOpen(false);
      setSelectedDept(null);
    }
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDept(dept);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      code: "", 
      head_of_department: "", 
      head_of_department_id: null,
      description: "",
      status: "Active"
    });
    setIsEditing(false);
    setSelectedDept(null);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
    toast.info('Form cancelled - no changes made');
  };

  // Statistics
  const stats = {
    totalDepartments: departments.length,
    activeDepartments: departments.filter(d => d.status === 'Active').length,
    totalTeachers: teachers.filter(t => t.status === 'Active').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Department Management</h1>
          <p className="text-gray-600">Organize teachers and subjects by departments</p>
        </div>
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)} 
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0A2540]">
                {isEditing ? `Edit Department: ${selectedDept?.name}` : "Create New Department"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelForm}
                className="text-gray-500 hover:text-gray-700 rounded-xl"
              >
                <span className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Department Name *</Label>
                  <Input
                    placeholder="e.g., Sciences, Arts, Languages"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Department Code *</Label>
                  <Input
                    placeholder="e.g., SCI, ART, LANG"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Head of Department</Label>
                  <Select 
                    value={formData.head_of_department_id?.toString() || "0"} 
                    onValueChange={(value: string) => {
                      const teacherId = value === "0" ? null : parseInt(value);
                      const teacher = activeTeachers.find(t => t.id === teacherId);
                      setFormData({ 
                        ...formData, 
                        head_of_department_id: teacherId,
                        head_of_department: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned'
                      });
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue placeholder="Select HOD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Not Assigned</SelectItem>
                      {activeTeachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: string) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A2540]">Description</Label>
                <Textarea
                  placeholder="Brief description of the department..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl border-[#0A2540]/20 min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                >
                  <span className="w-4 h-4 mr-2" />
                  {isEditing ? "Update Department" : "Create Department"}
                </Button>
                <Button 
                  type="button"
                  onClick={cancelForm}
                  variant="outline"
                  className="border-[#0A2540]/20 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Departments</p>
                <p className="text-[#0A2540]">{stats.totalDepartments}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Active Departments</p>
                <p className="text-[#0A2540]">{stats.activeDepartments}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Teachers</p>
                <p className="text-[#0A2540]">{stats.totalTeachers}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.length === 0 ? (
          <Card className="col-span-full border-[#0A2540]/10">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="w-16 h-16 text-gray-300" />
                <h3 className="text-[#0A2540]">No Departments Yet</h3>
                <p className="text-gray-600">Get started by creating your first department</p>
                {!showForm && (
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="mt-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                  >
                    <span className="w-4 h-4 mr-2" />
                    Create First Department
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          departments.map((dept) => {
            const teacherCount = getTeacherCount(dept.name);
            return (
              <Card key={dept.id} className="border-[#0A2540]/10 hover:shadow-lg transition-shadow">
                <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[#0A2540]">{dept.name}</h3>
                        <Badge variant="outline" className="rounded-xl font-mono text-xs">
                          {dept.code}
                        </Badge>
                      </div>
                      <Badge 
                        className={`rounded-xl text-xs ${
                          dept.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {dept.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(dept)}
                        className="rounded-xl h-8 w-8 p-0"
                      >
                        <span className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(dept)}
                        className="rounded-xl h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <span className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Head of Department</p>
                    <p className="text-[#0A2540]">{dept.head_of_department}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-[#0A2540] text-sm">{dept.description || 'No description'}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-[#0A2540]/10">
                    <span className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{teacherCount} Teacher(s)</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDept?.name}"? 
              {selectedDept && getTeacherCount(selectedDept.name) > 0 
                ? ` This department has ${getTeacherCount(selectedDept.name)} teacher(s).`
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
