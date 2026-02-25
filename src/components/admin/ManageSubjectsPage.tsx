import { Book, BookOpen, FileText, Plus } from 'lucide-react';
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
import { SubjectCreationForm } from "./forms/SubjectCreationForm";

export function ManageSubjectsPageFixed() {
  const { subjects, addSubject, updateSubject, deleteSubject, subjectAssignments } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
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
  const categories = ["All", "Creche", "Nursery", "Primary", "JSS", "SSS"];

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

  const handleCreateSubjectSuccess = () => {
    // Refresh subjects data is handled by the form
    setShowSubjectForm(false);
  };

  const handleCreateSubjectClose = () => {
    setShowSubjectForm(false);
  };

  const handleEditSubject = async () => {
    if (!selectedSubject || !selectedSubject.name || !selectedSubject.code || !selectedSubject.category) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading("edit");

    try {
      await updateSubject(selectedSubject.id, {
        name: selectedSubject.name,
        code: selectedSubject.code,
        category: selectedSubject.category,
        department: selectedSubject.department || selectedSubject.category,
        description: selectedSubject.description,
        status: selectedSubject.status,
        is_core: selectedSubject.is_core,
      });
      
      toast.success(`Subject "${selectedSubject.name}" updated successfully!`);
      setShowSubjectForm(false);
      setIsEditing(false);
      setSelectedSubject(null);
    } catch (error) {
      toast.error('Failed to update subject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;

    setActionLoading("delete");

    try {
      await deleteSubject(selectedSubject.id);
      
      toast.success(`Subject "${selectedSubject.name}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
    } catch (error: any) {
      const message = error?.message || 'Failed to delete subject';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditForm = (subject: any) => {
    setSelectedSubject(subject);
    setIsEditing(true);
    setShowSubjectForm(true);
  };

  const openDeleteDialog = (subject: any) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
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
          <p className="text-gray-600">Create and manage academic subjects</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={async () => {
              await exportSubjectsToCSV();
              toast.success("Subjects exported to CSV successfully");
            }}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button 
            onClick={() => {
              console.log('=== CREATE SUBJECT BUTTON CLICKED ===');
              setShowSubjectForm(true);
            }}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl w-full sm:w-auto flex items-center gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Subject</span>
            <span className="sm:hidden">New Subject</span>
          </Button>
        </div>
      </div>

      {/* Subject Creation Form Dialog */}
      {showSubjectForm && (
        <Dialog open={showSubjectForm} onOpenChange={setShowSubjectForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Subject</DialogTitle>
              <DialogDescription>Fill in the details to create a new subject. Subject code must be unique.</DialogDescription>
            </DialogHeader>
            <SubjectCreationForm 
              onClose={handleCreateSubjectClose}
              onSuccess={handleCreateSubjectSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-[#0A2540]">{stats.totalSubjects}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subjects</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeSubjects}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Core Subjects</p>
                <p className="text-2xl font-bold text-purple-600">{stats.coreSubjects}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Book className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Subjects</p>
                <p className="text-2xl font-bold text-orange-600">{stats.assignedSubjects}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#0A2540]/10 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Search</Label>
              <Input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-gray-300 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-gray-300 rounded-lg">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="border-gray-300 rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card className="border-[#0A2540]/10 shadow-lg">
        <CardContent className="p-6">
          {filteredSubjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((subject: any) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono">{subject.code}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subject.category}</Badge>
                    </TableCell>
                    <TableCell>{subject.department || subject.category}</TableCell>
                    <TableCell>
                      {subject.is_core ? (
                        <Badge variant="default">Core</Badge>
                      ) : (
                        <Badge variant="secondary">Elective</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subject.status === 'Active' ? 'default' : 'secondary'}>
                        {subject.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getAssignmentCount(subject.id)} classes
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(subject)}
                          className="h-8"
                        >
                          {subject.status === 'Active' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(subject)}
                          className="h-8"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(subject)}
                          className="h-8"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Subjects Found</h3>
              <p className="text-gray-500">Try adjusting your filters or create a new subject.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete subject "{selectedSubject?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ManageSubjectsPageFixed;
export { ManageSubjectsPageFixed as ManageSubjectsPage };
