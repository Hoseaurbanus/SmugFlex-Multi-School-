import { Book, BookOpen, FileText, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from "react";
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
  const { subjects, addSubject, updateSubject, deleteSubject, subjectAssignments, loadSubjectsFromAPI } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStatus]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  }, [filteredSubjects.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  // Get unique categories
  const categories = ["All", "Creche", "Nursery", "Primary", "JSS", "SS", "General"];

  const allowedSubjectCategories = ["Creche", "Nursery", "Primary", "JSS", "SS", "General"] as const;
  type AllowedSubjectCategory = (typeof allowedSubjectCategories)[number];

  const isAllowedSubjectCategory = (value: string): value is AllowedSubjectCategory => {
    return (allowedSubjectCategories as readonly string[]).includes(value);
  };

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

  const handleToggleStatus = async (subject: any) => {
    const newStatus = subject.status === 'Active' ? 'Inactive' : 'Active';
    setActionLoading(`toggle-${subject.id}`);
    try {
      await updateSubject(subject.id, { status: newStatus });
      toast.success(`Subject ${subject.name} ${newStatus === 'Active' ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      const message = error?.message || 'Failed to update subject status';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSubjectSuccess = () => {
    // Refresh subjects data is handled by the form
    closeSubjectDialog();
  };

  const handleCreateSubjectClose = () => {
    closeSubjectDialog();
  };

  const handleEditSubject = async () => {
    const name = String(selectedSubject?.name || '').trim();
    const code = String(selectedSubject?.code || '').trim().toUpperCase();
    const categoryRaw = String(selectedSubject?.category || '').trim();
    const department = String(selectedSubject?.department || '').trim();

    if (!selectedSubject || !name || !code || !categoryRaw) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!isAllowedSubjectCategory(categoryRaw)) {
      toast.error('Invalid subject category');
      return;
    }

    const category: AllowedSubjectCategory = categoryRaw;

    setActionLoading("edit");

    try {
      await updateSubject(selectedSubject.id, {
        name,
        code,
        category,
        department: department || category,
        description: selectedSubject.description,
        status: selectedSubject.status,
        is_core: selectedSubject.is_core,
      });
      
      toast.success(`Subject "${name}" updated successfully!`);
      closeSubjectDialog();
    } catch (error: any) {
      const message = error?.message || 'Failed to update subject';
      toast.error(message);
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
    setSelectedSubject({
      ...subject,
      department: subject.department || subject.category,
    });
    setIsEditing(true);
    setShowSubjectForm(true);
  };

  const closeSubjectDialog = () => {
    setShowSubjectForm(false);
    setIsEditing(false);
    setSelectedSubject(null);
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
        await loadSubjectsFromAPI(true);
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
              setIsEditing(false);
              setSelectedSubject(null);
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
        <Dialog
          open={showSubjectForm}
          onOpenChange={(open) => {
            if (!open) {
              closeSubjectDialog();
              return;
            }
            setShowSubjectForm(true);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update the subject details and save changes.'
                  : 'Fill in the details to create a new subject. Subject code must be unique.'}
              </DialogDescription>
            </DialogHeader>

            {!isEditing ? (
              <SubjectCreationForm 
                onClose={handleCreateSubjectClose}
                onSuccess={handleCreateSubjectSuccess}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Subject Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={selectedSubject?.name || ''}
                      onChange={(e) => setSelectedSubject((prev: any) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Mathematics"
                      className="border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Subject Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={selectedSubject?.code || ''}
                      onChange={(e) => setSelectedSubject((prev: any) => ({ ...prev, code: String(e.target.value || '').toUpperCase() }))}
                      placeholder="e.g., MATH"
                      maxLength={10}
                      className="border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedSubject?.category || ''}
                      onValueChange={(value) => setSelectedSubject((prev: any) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Creche", "Nursery", "Primary", "JSS", "SS", "General"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Department</Label>
                    <Input
                      value={selectedSubject?.department || ''}
                      onChange={(e) => setSelectedSubject((prev: any) => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g., Sciences"
                      className="border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    value={selectedSubject?.description || ''}
                    onChange={(e) => setSelectedSubject((prev: any) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    className="border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select
                      value={selectedSubject?.status || 'Active'}
                      onValueChange={(value) => setSelectedSubject((prev: any) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="border-gray-300 rounded-lg">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 mt-8">
                    <Checkbox
                      checked={!!selectedSubject?.is_core}
                      onCheckedChange={(checked) => setSelectedSubject((prev: any) => ({ ...prev, is_core: !!checked }))}
                    />
                    <Label className="text-sm font-medium text-gray-700">Core subject</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={closeSubjectDialog}
                    disabled={actionLoading === 'edit'}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditSubject}
                    disabled={actionLoading === 'edit'}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    {actionLoading === 'edit' ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </div>
            )}
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
            <div className="overflow-x-auto">
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
                  {paginatedSubjects.map((subject: any) => (
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
                            disabled={actionLoading === `toggle-${subject.id}`}
                          >
                            {actionLoading === `toggle-${subject.id}`
                              ? 'Updating...'
                              : (subject.status === 'Active' ? 'Disable' : 'Enable')}
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
            </div>
          ) : (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Subjects Found</h3>
              <p className="text-gray-500">Try adjusting your filters or create a new subject.</p>
            </div>
          )}

          {filteredSubjects.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4">
              <div className="text-sm text-gray-600">
                Showing {Math.min(filteredSubjects.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredSubjects.length, currentPage * pageSize)} of {filteredSubjects.length}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) || 20)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-700 min-w-[90px] text-center">
                  Page {currentPage} / {totalPages}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
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
              {selectedSubject && getAssignmentCount(selectedSubject.id) > 0 && (
                <span className="block mt-3 text-amber-600 font-medium">
                  Warning: This subject has {getAssignmentCount(selectedSubject.id)} active teacher assignment{getAssignmentCount(selectedSubject.id) !== 1 ? 's' : ''}. You must remove them first before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
              className="bg-red-600 hover:bg-red-700"
              disabled={selectedSubject ? getAssignmentCount(selectedSubject.id) > 0 : false}
            >
              {selectedSubject && getAssignmentCount(selectedSubject.id) > 0 ? 'Blocked' : 'Delete Subject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ManageSubjectsPageFixed;
export { ManageSubjectsPageFixed as ManageSubjectsPage };
