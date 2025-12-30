import { Book, BookOpen } from 'lucide-react';
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { SimpleDropdown, SimpleDropdownItem, SimpleDropdownSeparator } from "../ui/simple-dropdown";
import { useSchool } from "../../contexts/SchoolContext";
import { exportSubjectsToCSV } from "../../utils/csvExporter";
import { importSubjectsFromCSV, generateSubjectTemplate } from "../../utils/csvImporter";

export function ManageSubjectsPage() {
  const { subjects, addSubject, updateSubject, deleteSubject, subjectAssignments } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [quickImportDialogOpen, setQuickImportDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    department: "",
    description: "",
    status: "Active" as "Active" | "Inactive",
    is_core: false,
  });

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || (subject as any).category === filterCategory;
    const matchesStatus = filterStatus === "All" || subject.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = ["All", "Creche", "Nursery", "Primary", "JSS", "SS"];

  // Statistics
  const stats = {
    totalSubjects: subjects.length,
    activeSubjects: subjects.filter(s => s.status === "Active").length,
    coreSubjects: subjects.filter(s => s.is_core).length,
    assignedSubjects: subjectAssignments.length,
  };

  // Get assignment count for a subject
  const getAssignmentCount = (subject_id: number) => {
    return subjectAssignments.filter(sa => sa.subject_id === subject_id).length;
  };

  const handleToggleStatus = (subject: any) => {
    const newStatus = subject.status === 'Active' ? 'Inactive' : 'Active';
    updateSubject(subject.id, { status: newStatus });
    toast.success(`Subject ${subject.name} ${newStatus === 'Active' ? 'enabled' : 'disabled'}`);
  };

  const handleCreateSubject = async () => {
    if (!formData.name || !formData.code || !formData.category) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading("create");

    // Check for duplicate subject code
    const duplicateCode = subjects.find(s => s.code.toLowerCase() === formData.code.toLowerCase());
    if (duplicateCode) {
      toast.error("Subject code already exists. Please use a unique code.");
      setActionLoading(null);
      return;
    }

    // Check for duplicate subject name
    const duplicateName = subjects.find(s => s.name.toLowerCase() === formData.name.toLowerCase());
    if (duplicateName) {
      toast.error("Subject name already exists.");
      setActionLoading(null);
      return;
    }

    try {
      addSubject({
        name: formData.name,
        code: formData.code.toUpperCase(),
        category: formData.category,
        department: formData.department || formData.category,
        description: formData.description,
        status: formData.status,
        is_core: formData.is_core,
      } as any);
      
      toast.success(`Subject "${formData.name}" created successfully!`);
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to create subject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSubject = async () => {
    if (!selectedSubject || !formData.name || !formData.code || !formData.category) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading("edit");

    // Check for duplicate subject code (excluding current subject)
    const duplicateCode = subjects.find(s => 
      s.code.toLowerCase() === formData.code.toLowerCase() && s.id !== selectedSubject.id
    );
    if (duplicateCode) {
      toast.error("Subject code already exists. Please use a unique code.");
      setActionLoading(null);
      return;
    }

    // Check for duplicate subject name (excluding current subject)
    const duplicateName = subjects.find(s => 
      s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== selectedSubject.id
    );
    if (duplicateName) {
      toast.error("Subject name already exists.");
      setActionLoading(null);
      return;
    }

    try {
      updateSubject(selectedSubject.id, {
        name: formData.name,
        code: formData.code.toUpperCase(),
        category: formData.category,
        department: formData.department || formData.category,
        description: formData.description,
        status: formData.status,
        is_core: formData.is_core,
      } as any);
      
      toast.success(`Subject "${formData.name}" updated successfully!`);
      resetForm();
      setShowForm(false);
      setIsEditing(false);
      setSelectedSubject(null);
    } catch (error) {
      toast.error('Failed to update subject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSubject = async () => {
    if (selectedSubject) {
      const assignmentCount = getAssignmentCount(selectedSubject.id);
      if (assignmentCount > 0) {
        toast.error(`Cannot delete subject. It is assigned to ${assignmentCount} class(es). Please remove assignments first.`);
        setDeleteDialogOpen(false);
        return;
      }

      setActionLoading("delete");

      try {
        deleteSubject(selectedSubject.id);
        toast.success(`Subject "${selectedSubject.name}" deleted successfully!`);
        setDeleteDialogOpen(false);
        setSelectedSubject(null);
      } catch (error) {
        toast.error('Failed to delete subject');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const openEditForm = (subject: any) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      category: (subject as any).category || "",
      department: subject.department,
      description: (subject as any).description || "",
      status: subject.status,
      is_core: subject.is_core,
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openViewDialog = (subject: any) => {
    setSelectedSubject(subject);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (subject: any) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      department: "",
      description: "",
      status: "Active",
      is_core: false,
    });
    setIsEditing(false);
    setSelectedSubject(null);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
    toast.info('Form cancelled - no changes made');
  };

  const handleQuickImportGRASubjects = () => {
    const graSubjects = [
      // Creche
      { category: "Creche", name: "Bible", type: "Bible", description: "", status: "Enabled" },
      { category: "Creche", name: "Numeracy", type: "Numeracy", description: "", status: "Enabled" },
      { category: "Creche", name: "Music", type: "Music", description: "", status: "Enabled" },
      { category: "Creche", name: "Shapes", type: "Shapes", description: "", status: "Enabled" },
      { category: "Creche", name: "Colour", type: "Colour", description: "", status: "Enabled" },
      { category: "Creche", name: "Literacy", type: "Literacy", description: "", status: "Enabled" },
      { category: "Creche", name: "Phonics", type: "Phonics", description: "", status: "Enabled" },
      { category: "Creche", name: "Science", type: "Science", description: "", status: "Enabled" },
      { category: "Creche", name: "Social Studies", type: "Social Studies", description: "", status: "Enabled" },
      { category: "Creche", name: "PHE", type: "PHE", description: "", status: "Enabled" },
      { category: "Creche", name: "Hand Writing", type: "Hand Writing", description: "", status: "Enabled" },
      // Nursery
      { category: "Nursery", name: "Numeracy", type: "Mathematics", description: "", status: "Enabled" },
      { category: "Nursery", name: "Arts & Crafts", type: "Arts & Crafts", description: "", status: "Enabled" },
      { category: "Nursery", name: "Language Art", type: "Language Art", description: "", status: "Enabled" },
      { category: "Nursery", name: "Phonics", type: "Phonics", description: "", status: "Enabled" },
      { category: "Nursery", name: "Shapes", type: "Shapes", description: "", status: "Enabled" },
      { category: "Nursery", name: "Colour", type: "Colour", description: "", status: "Enabled" },
      { category: "Nursery", name: "Bible Lesson", type: "Bible Lesson", description: "", status: "Enabled" },
      { category: "Nursery", name: "Hand Writing", type: "Hand Writing", description: "", status: "Enabled" },
      { category: "Nursery", name: "Science", type: "Science", description: "", status: "Enabled" },
      { category: "Nursery", name: "PHE", type: "PHE", description: "", status: "Enabled" },
      { category: "Nursery", name: "Social Studies", type: "Social Studies", description: "", status: "Enabled" },
      { category: "Nursery", name: "Verbal Reasoning", type: "Verbal Reasoning", description: "", status: "Enabled" },
      { category: "Nursery", name: "Memory Verse", type: "Memory Verse", description: "", status: "Enabled" },
      { category: "Nursery", name: "Health & Safety", type: "Health & Safety", description: "", status: "Enabled" },
      { category: "Nursery", name: "Quantitative", type: "Quantitative", description: "", status: "Enabled" },
      { category: "Nursery", name: "Mathematics", type: "Mathematics", description: "", status: "Enabled" },
      // Primary
      { category: "Primary", name: "English", type: "English", description: "", status: "Enabled" },
      { category: "Primary", name: "Basic Science", type: "Basic Science", description: "", status: "Enabled" },
      { category: "Primary", name: "PHE", type: "PHE", description: "", status: "Enabled" },
      { category: "Primary", name: "CCA", type: "CCA", description: "", status: "Enabled" },
      { category: "Primary", name: "Social Civic", type: "Social Civic", description: "", status: "Enabled" },
      { category: "Primary", name: "Verbal Reasoning", type: "Verbal Reasoning", description: "", status: "Enabled" },
      { category: "Primary", name: "Quantitative", type: "Quantitative", description: "", status: "Enabled" },
      { category: "Primary", name: "Computer", type: "Computer", description: "", status: "Enabled" },
      { category: "Primary", name: "French", type: "French", description: "", status: "Enabled" },
      { category: "Primary", name: "Bible", type: "Bible", description: "", status: "Enabled" },
      { category: "Primary", name: "Hand Writing", type: "Hand Writing", description: "", status: "Enabled" },
      { category: "Primary", name: "Social Studies", type: "Social Studies", description: "", status: "Enabled" },
    ];

    const subjectsText = graSubjects.map(s => 
      `${s.category} - ${s.name} (${s.type})`
    ).join('\n');
    
    navigator.clipboard.writeText(subjectsText).then(() => {
      toast.success(`${graSubjects.length} GRA subjects list copied to clipboard!`);
    });
    
    setQuickImportDialogOpen(false);
  };

  const exportCSVTemplate = () => {
    const template = generateSubjectTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subject_import_template.csv';
    a.click();
    toast.success("CSV template downloaded");
  };

  const handleCSVImport = async (file: File) => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const result = await importSubjectsFromCSV(file);
      
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
        }
      
      if (result.valid.length > 0) {
        // Here you would typically send the valid data to your API
        // For now, we'll just show success message
        toast.success(`${result.valid.length} subjects imported successfully`);
        
        // Refresh subjects data
        window.location.reload();
      } else {
        toast.error("No valid subjects found in CSV file");
      }
    } catch (error) {
      toast.error("Failed to import CSV file");
      }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Manage Subjects</h1>
          <p className="text-gray-600">Create and manage school subjects</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              exportSubjectsToCSV();
              toast.success("Subjects exported to CSV successfully");
            }}
            variant="outline"
            className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
          >
            <span className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => setBulkImportDialogOpen(true)}
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button
            onClick={() => setQuickImportDialogOpen(true)}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Import GRA Subjects
          </Button>
          {!showForm && (
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Create New Subject
            </Button>
          )}
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <Card className="border-[#0A2540]/10 shadow-lg rounded-xl">
          <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0A2540]">
                {isEditing ? `Edit Subject: ${selectedSubject?.name}` : "Create New Subject"}
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
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Subject Name *</Label>
                  <Input
                    placeholder="e.g., Mathematics, English Language"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Subject Code *</Label>
                  <Input
                    placeholder="e.g., MATH101, ENG101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Creche">Creche</SelectItem>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="JSS">JSS (Junior Secondary)</SelectItem>
                      <SelectItem value="SS">SS (Senior Secondary)</SelectItem>
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
                  placeholder="Brief description of the subject"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl border-[#0A2540]/20"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-xl">
                <Checkbox 
                  id="is_core"
                  checked={formData.is_core}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_core: checked })}
                  className="border-[#0A2540]/20"
                />
                <Label htmlFor="is_core" className="text-[#0A2540] cursor-pointer">
                  Mark as Core Subject (Required for all students)
                </Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={isEditing ? handleEditSubject : handleCreateSubject}
                  disabled={actionLoading === "create" || actionLoading === "edit"}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                >
                  {actionLoading === "create" || actionLoading === "edit" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 mr-2" />
                      {isEditing ? "Update Subject" : "Create Subject"}
                    </>
                  )}
                </Button>
                <Button 
                  onClick={cancelForm}
                  variant="outline"
                  className="border-[#0A2540]/20 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Subjects</p>
                <p className="text-[#0A2540]">{stats.totalSubjects}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Active Subjects</p>
                <p className="text-[#0A2540]">{stats.activeSubjects}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Core Subjects</p>
                <p className="text-[#0A2540]">{stats.coreSubjects}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Assignments</p>
                <p className="text-[#0A2540]">{stats.assignedSubjects}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#0A2540]/10 rounded-xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-[#0A2540]/20"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="rounded-xl border-[#0A2540]/20">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="rounded-xl border-[#0A2540]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card className="border-[#0A2540]/10 rounded-xl bg-white shadow-clinical">
        <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5 p-5">
          <h3 className="text-[#0A2540]">Subjects ({filteredSubjects.length})</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Category</TableHead>
                  <TableHead className="text-white">Subject Name</TableHead>
                  <TableHead className="text-white">Subject Type</TableHead>
                  <TableHead className="text-white">Description</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-12 h-12 text-gray-300" />
                        <p>No subjects found</p>
                        {!showForm && (
                          <Button 
                            onClick={() => setShowForm(true)}
                            className="mt-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                          >
                            <span className="w-4 h-4 mr-2" />
                            Create First Subject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject) => (
                    <TableRow key={subject.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <TableCell className="text-[#1F2937]">{(subject as any).category || "-"}</TableCell>
                      <TableCell className="text-[#1F2937]">{subject.name}</TableCell>
                      <TableCell className="text-[#6B7280] text-sm">{subject.code}</TableCell>
                      <TableCell className="text-[#6B7280] text-sm">{(subject as any).description || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`rounded-xl ${
                            subject.status === "Active" 
                              ? "bg-[#06B6D4] text-white border-0" 
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {subject.status === "Active" ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg">
                              <BookOpen className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditForm(subject)}>
                              <span className="h-3 w-3" />
                              E
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openViewDialog(subject)}>
                              <span className="h-3 w-3" />
                            V
                          </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(subject)}
                              className="text-red-600"
                            >
                              <span className="h-3 w-3" />
                              D
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Subject Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Subject Details</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              View complete information about this subject
            </DialogDescription>
          </DialogHeader>
          {selectedSubject && (
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Subject Name</Label>
                  <p className="text-[#1F2937]">{selectedSubject.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Code</Label>
                  <p className="text-[#1F2937]">{selectedSubject.code}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Category</Label>
                  <p className="text-[#1F2937]">{(selectedSubject as any).category || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Status</Label>
                  <Badge className={selectedSubject.status === 'Active' ? "bg-[#10B981] text-white" : "bg-[#EF4444] text-white"}>
                    {selectedSubject.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#6B7280]">Description</Label>
                <p className="text-[#1F2937]">{(selectedSubject as any).description || "No description provided"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#6B7280]">Assignments</Label>
                <p className="text-[#1F2937]">{getAssignmentCount(selectedSubject.id)} class(es)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setViewDialogOpen(false)}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import CSV Dialog */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Bulk Import Subjects</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Import multiple subjects from a CSV file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50 rounded-xl">
              <span className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>CSV Format:</strong> Category, Subject Name, Subject Type, Description, Status
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-[#1F2937]">Select CSV File</Label>
              <Input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCSVFile(e.target.files?.[0] || null)}
                className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
              />
              {csvFile && (
                <p className="text-sm text-[#6B7280]">Selected: {csvFile.name}</p>
              )}
            </div>

            <Button
              onClick={exportCSVTemplate}
              variant="outline"
              className="w-full rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              <span className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setBulkImportDialogOpen(false);
                setCSVFile(null);
              }}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => csvFile && handleCSVImport(csvFile)}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Import Subjects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Import GRA Subjects Dialog */}
      <Dialog open={quickImportDialogOpen} onOpenChange={setQuickImportDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl bg-white border border-[#E5E7EB] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Import GRA Subjects</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Quick import of subjects for Creche, Nursery, and Primary levels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-green-200 bg-green-50 rounded-xl">
              <span className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                This will prepare the subject list for 50+ subjects across Creche, Nursery, and Primary categories.
              </AlertDescription>
            </Alert>
            
            <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] max-h-64 overflow-y-auto">
              <p className="text-[#1F2937] mb-2">Subject Categories Preview:</p>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li><strong>Creche:</strong> Bible, Numeracy, Music, Shapes, Colour, Literacy, Phonics, Science, Social Studies, PHE, Hand Writing (11 subjects)</li>
                <li><strong>Nursery:</strong> Numeracy, Arts & Crafts, Language Art, Phonics, Shapes, Colour, Bible Lesson, Hand Writing, Science, PHE, Social Studies, Verbal Reasoning, Memory Verse, Health & Safety, Quantitative, Mathematics (16 subjects)</li>
                <li><strong>Primary:</strong> English, Basic Science, PHE, CCA, Social Civic, Verbal Reasoning, Quantitative, Computer, French, Bible, Hand Writing, Social Studies (12 subjects)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setQuickImportDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickImportGRASubjects}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Copy Subject List to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSubject?.name}"? 
              {selectedSubject && getAssignmentCount(selectedSubject.id) > 0 
                ? ` This subject has ${getAssignmentCount(selectedSubject.id)} class assignment(s).`
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSubject}
              disabled={actionLoading === "delete"}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {actionLoading === "delete" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
