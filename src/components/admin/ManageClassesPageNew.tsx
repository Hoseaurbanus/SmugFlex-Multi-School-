import { Book, BookOpen } from 'lucide-react';
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSchool, Class } from "../../contexts/SchoolContext";

export function ManageClassesPage() {
  const { teachers, students, classes, addClass, updateClass, deleteClass } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get active teachers from context
  const availableTeachers = teachers.filter(t => t.status === 'Active');

  // Get unique levels and classes for filters
  const levels = ["All", ...(Array.isArray(classes) ? Array.from(new Set(classes.map(c => c.level))) : [])];
  const statuses = ["All", "Active", "Inactive"];

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    capacity: "",
    classTeacherId: "",
    status: "Active" as "Active" | "Inactive",
    schoolLevel: "" as typeof levels[number],
  });

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cls.classTeacher && cls.classTeacher.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLevel = filterLevel === "All" || cls.level === filterLevel;
    const matchesStatus = filterStatus === "All" || cls.status === filterStatus;
    
    return matchesSearch && matchesLevel && matchesStatus;
  });

  // Statistics
  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter(c => c.status === "Active").length,
    totalStudents: classes.reduce((sum, c) => sum + c.currentStudents, 0),
    averageCapacity: classes.length > 0 ? Math.round(classes.reduce((sum, c) => sum + (c.currentStudents / c.capacity * 100), 0) / classes.length) : 0,
  };

  const handleCreateClass = () => {
    if (!formData.name || !formData.capacity || !formData.classTeacherId || !formData.schoolLevel) {
      toast.error("Please fill all required fields");
      return;
    }

    const teacher = availableTeachers.find(t => t.id === parseInt(formData.classTeacherId));
    
    const newClass: Omit<Class, 'id'> = {
      name: formData.name,
      level: formData.schoolLevel,
      capacity: parseInt(formData.capacity),
      currentStudents: 0,
      classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
      classTeacherId: parseInt(formData.classTeacherId),
      section: formData.section,
      status: formData.status,
      academicYear: '2024/2025',
      category: formData.schoolLevel.includes('JSS') || formData.schoolLevel.includes('SSS') ? 'Secondary' : 'Primary',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addClass(newClass);
    toast.success(`Class "${newClass.name}" created successfully!`);
    setShowCreateForm(false);
    resetForm();
  };

  const handleEditClass = () => {
    if (!editingClass || !formData.name || !formData.capacity || !formData.classTeacherId || !formData.schoolLevel) {
      toast.error("Please fill all required fields");
      return;
    }

    const teacher = availableTeachers.find(t => t.id === parseInt(formData.classTeacherId));

    const updatedClass: Partial<Class> = {
      name: formData.name,
      level: formData.schoolLevel,
      capacity: parseInt(formData.capacity),
      classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
      classTeacherId: parseInt(formData.classTeacherId),
      section: formData.section,
      status: formData.status,
    };

    updateClass(editingClass.id, updatedClass);
    toast.success(`Class "${formData.name}" updated successfully!`);
    setEditingClass(null);
    resetForm();
  };

  const handleDeleteClass = () => {
    if (selectedClass) {
      if (selectedClass.currentStudents > 0) {
        toast.error("Cannot delete class with enrolled students. Please move students first.");
        setDeleteDialogOpen(false);
        return;
      }

      deleteClass(selectedClass.id);
      toast.success(`Class "${selectedClass.name}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedClass(null);
    }
  };

  const startEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      section: cls.section || "",
      capacity: cls.capacity.toString(),
      classTeacherId: cls.classTeacherId?.toString() || "",
      status: cls.status,
      schoolLevel: (cls.level as "Primary" | "Secondary") || "",
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingClass(null);
    resetForm();
  };

  const openDeleteDialog = (cls: Class) => {
    setSelectedClass(cls);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      section: "",
      capacity: "",
      classTeacherId: "",
      status: "Active",
      schoolLevel: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Manage Classes</h1>
        <p className="text-[#6B7280]">Create and manage school classes</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Classes</p>
              <BookOpen className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{stats.totalClasses}</p>
            <p className="text-xs text-[#6B7280]">Across all levels</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Active Classes</p>
              <span className="w-5 h-5 text-[#10B981] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{stats.activeClasses}</p>
            <p className="text-xs text-[#10B981]">Currently in session</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Students</p>
              <span className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{stats.totalStudents}</p>
            <p className="text-xs text-[#6B7280]">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Avg. Capacity</p>
              <BookOpen className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{stats.averageCapacity}%</p>
            <p className="text-xs text-[#F59E0B]">Utilization rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form - Inline */}
      {(showCreateForm || editingClass) && (
        <Card className="rounded-xl bg-white border-2 border-[#3B82F6] shadow-clinical-lg">
          <CardHeader className="border-b border-[#E5E7EB] bg-gradient-to-r from-[#3B82F6] to-[#2563EB] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">
                {editingClass ? `Edit Class: ${editingClass.name}` : 'Create New Class'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  cancelEdit();
                }}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <span className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">School Level *</Label>
                <Select 
                  value={formData.schoolLevel} 
                  onValueChange={(value: string) => {
                    setFormData({ ...formData, schoolLevel: value as "Primary" | "Secondary" });
                  }}
                >
                  <SelectTrigger className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]">
                    <SelectValue placeholder="Select school level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="Primary" className="text-[#1F2937]">Primary</SelectItem>
                    <SelectItem value="Secondary" className="text-[#1F2937]">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Class Name *</Label>
                <Input
                  placeholder="e.g., JSS 1A, SS 2B, Primary 3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Section (Optional)</Label>
                <Input
                  placeholder="e.g., A, B, C"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Class Capacity *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 35"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Assign Class Teacher *</Label>
                <Select value={formData.classTeacherId} onValueChange={(value: string) => setFormData({ ...formData, classTeacherId: value })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]">
                    <SelectValue placeholder="Select class teacher" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    {availableTeachers.length === 0 ? (
                      <div className="p-3 text-center text-[#6B7280] text-sm">
                        No teachers available. Please add teachers first.
                      </div>
                    ) : (
                      availableTeachers.map(teacher => (
                        <SelectItem 
                          key={teacher.id} 
                          value={teacher.id.toString()} 
                          className="text-[#1F2937]"
                        >
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Status</Label>
                <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="Active" className="text-[#1F2937]">Active</SelectItem>
                    <SelectItem value="Inactive" className="text-[#1F2937]">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB]">
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  cancelEdit();
                }}
                variant="outline"
                className="rounded-lg border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
              >
                <span className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={editingClass ? handleEditClass : handleCreateClass}
                className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical"
              >
                <span className="w-4 h-4 mr-2" />
                {editingClass ? 'Save Changes' : 'Create Class'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-5">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[#1F2937]">Search Classes</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                <Input
                  placeholder="Search by class name or teacher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1F2937]">Filter by Level</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E5E7EB]">
                  <SelectItem value="All" className="text-[#1F2937]">All Levels</SelectItem>
                  <SelectItem value="Primary" className="text-[#1F2937]">Primary</SelectItem>
                  <SelectItem value="Secondary" className="text-[#1F2937]">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1F2937]">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E5E7EB]">
                  <SelectItem value="All" className="text-[#1F2937]">All Status</SelectItem>
                  <SelectItem value="Active" className="text-[#1F2937]">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-[#1F2937]">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!showCreateForm && !editingClass && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
                className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
              >
                <span className="w-4 h-4 mr-2" />
                Create New Class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1F2937]">All Classes ({filteredClasses.length})</h3>
            <Badge className="bg-[#3B82F6] text-white border-0">
              {filterLevel !== "All" ? filterLevel : "All Levels"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Class Name</TableHead>
                  <TableHead className="text-white">Level</TableHead>
                  <TableHead className="text-white">Class Teacher</TableHead>
                  <TableHead className="text-white text-center">Students</TableHead>
                  <TableHead className="text-white text-center">Capacity</TableHead>
                  <TableHead className="text-white text-center">Utilization</TableHead>
                  <TableHead className="text-white text-center">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow className="bg-white border-b border-[#E5E7EB]">
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="w-12 h-12 text-[#9CA3AF]" />
                        <p className="text-[#1F2937]">No classes found</p>
                        <p className="text-[#6B7280] text-sm">
                          {classes.length === 0 
                            ? "Click 'Create New Class' to add your first class" 
                            : "Try adjusting your search or filters"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls) => {
                    const utilization = Math.round((cls.currentStudents / cls.capacity) * 100);
                    return (
                      <TableRow key={cls.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <TableCell className="text-[#1F2937]">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-lg ${
                              cls.level === "Primary" 
                                ? "bg-gradient-to-br from-[#10B981] to-[#059669]"
                                : "bg-gradient-to-br from-[#3B82F6] to-[#2563EB]"
                            } flex items-center justify-center`}>
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[#1F2937] font-medium">{cls.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{cls.level}</TableCell>
                        <TableCell className="text-[#1F2937]">{cls.classTeacher}</TableCell>
                        <TableCell className="text-center text-[#1F2937]">{cls.currentStudents}</TableCell>
                        <TableCell className="text-center text-[#1F2937]">{cls.capacity}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-[#E5E7EB] rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  utilization >= 90 ? 'bg-[#EF4444]' :
                                  utilization >= 75 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                            <span className="text-[#1F2937] text-sm">{utilization}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${
                            cls.status === "Active" 
                              ? "bg-[#10B981] text-white" 
                              : "bg-[#6B7280] text-white"
                          } border-0`}>
                            {cls.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(cls)}
                              className="text-[#3B82F6] hover:bg-[#EFF6FF] rounded-lg"
                            >
                              <span className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(cls)}
                              className="text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg"
                            >
                              <span className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border border-[#E5E7EB]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1F2937]">Delete Class</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B7280]">
              Are you sure you want to delete "{selectedClass?.name}"? This action cannot be undone.
              {selectedClass && selectedClass.currentStudents > 0 && (
                <span className="block mt-2 text-[#EF4444] font-medium">
                  This class has {selectedClass.currentStudents} enrolled students and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-[#E5E7EB] text-[#6B7280]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClass}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
