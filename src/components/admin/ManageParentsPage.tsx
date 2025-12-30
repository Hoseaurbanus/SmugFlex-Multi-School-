import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { SimpleDropdown, SimpleDropdownTrigger, SimpleDropdownContent, SimpleDropdownItem, SimpleDropdownSeparator } from "../ui/simple-dropdown";
import { exportParentsToCSV } from "../../utils/csvExporter";
import { importParentsFromCSV, generateParentTemplate } from "../../utils/csvImporter";
import { toast } from "sonner";
import { useSchool, Parent } from "../../contexts/SchoolContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Plus, Link, Download, Eye, Edit, Trash2 } from "lucide-react";

interface ManageParentsPageProps {
  onNavigateToLink?: () => void;
}

export function ManageParentsPage({ onNavigateToLink }: ManageParentsPageProps) {
  const { parents, students, deleteParent } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);

  // Filter parents
  const filteredParents = parents.filter(parent =>
    (parent.firstName && parent.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (parent.lastName && parent.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (parent.email && parent.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (parent.phone && parent.phone.includes(searchTerm))
  );

  // Statistics
  const stats = {
    total: parents.length,
    active: parents.filter(p => p.status === "Active").length,
    withChildren: parents.filter(p => p.student_ids && p.student_ids.length > 0).length,
    withoutChildren: parents.filter(p => !p.student_ids || p.student_ids.length === 0).length,
  };

  const handleView = (parent: Parent) => {
    setSelectedParent(parent);
    setViewDialogOpen(true);
  };

  const handleEdit = (parentId: number) => {
    toast.info(`Edit functionality for parent ID: ${parentId} - Navigate to Edit page`);
  };

  const handleDelete = async () => {
    if (selectedParent) {
      if (selectedParent && selectedParent.student_ids && selectedParent.student_ids.length > 0) {
        toast.error("Cannot delete parent with linked students. Please unlink students first.");
        setDeleteDialogOpen(false);
        return;
      }
      await deleteParent(selectedParent.id);
      toast.success(`Parent "${selectedParent.firstName} ${selectedParent.lastName}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedParent(null);
    }
  };

  const openDeleteDialog = (parent: Parent) => {
    setSelectedParent(parent);
    setDeleteDialogOpen(true);
  };

  const getLinkedStudentNames = (parentId: number) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent || !parent.student_ids || parent.student_ids.length === 0) return [];
    return students
      .filter(s => parent.student_ids!.includes(s.id) && s.status === 'Active')
      .map(s => `${s.firstName} ${s.lastName}`);
  };

  const exportCSVTemplate = () => {
    const template = generateParentTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parent_import_template.csv';
    a.click();
    toast.success("CSV template downloaded");
  };

  const handleCSVImport = async (file: File) => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const result = await importParentsFromCSV(file);
      
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
        }
      
      if (result.valid.length > 0) {
        // Here you would typically send the valid data to your API
        // For now, we'll just show success message
        toast.success(`${result.valid.length} parents imported successfully`);
        
        // Refresh parents data
        window.location.reload();
      } else {
        toast.error("No valid parents found in CSV file");
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
          <h1 className="text-[#0A2540] mb-2">Manage Parents</h1>
          <p className="text-gray-600">View, edit, and manage all registered parents/guardians</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={async () => {
              await exportParentsToCSV();
              toast.success("Parents exported to CSV successfully");
            }}
            variant="outline"
            className="rounded-xl border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
          >
            <span className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={exportCSVTemplate}
            variant="outline"
            className="rounded-xl border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
          >
            <span className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button
            onClick={() => toast.info("Navigate to Register User page to add parent")}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Parent
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Parents</p>
                <p className="text-[#0A2540]">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Active</p>
                <p className="text-[#0A2540]">{stats.active}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">With Children</p>
                <p className="text-[#0A2540]">{stats.withChildren}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Link className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Without Children</p>
                <p className="text-[#0A2540]">{stats.withoutChildren}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {/* Filters */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          {/* Primary Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#0A2540] mb-3 flex items-center">
              <span className="w-4 h-4 mr-2" />
              Primary Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="pl-10 rounded-xl border-[#0A2540]/20"
                />
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <span className="bg-gray-100 px-3 py-2 rounded-lg">
                  {filteredParents.length} of {parents.length} parents
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Filters */}
          <div>
            <h3 className="text-sm font-semibold text-[#0A2540] mb-3 flex items-center">
              <span className="w-4 h-4 mr-2" />
              Secondary Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-[#0A2540]">{stats.active}</div>
                <div className="text-xs text-gray-600">Active Parents</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-green-600">{stats.withChildren}</div>
                <div className="text-xs text-gray-600">With Children</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold text-orange-600">{stats.withoutChildren}</div>
                <div className="text-xs text-gray-600">Without Children</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parents Table */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5 flex flex-row items-center justify-between">
          <h3 className="text-[#0A2540]">Parents ({filteredParents.length})</h3>
          {onNavigateToLink && (
            <Button
              onClick={onNavigateToLink}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
              size="sm"
            >
              <Link className="w-4 h-4 mr-2" />
              Link to Student
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-[#0A2540]/5">
                  <TableHead className="text-[#0A2540]">Name</TableHead>
                  <TableHead className="text-[#0A2540]">Email</TableHead>
                  <TableHead className="text-[#0A2540]">Phone</TableHead>
                  <TableHead className="text-[#0A2540]">Linked Children</TableHead>
                  <TableHead className="text-[#0A2540]">Status</TableHead>
                  <TableHead className="text-[#0A2540]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-12 h-12 text-gray-300" />
                        <p>No parents found</p>
                        <Button
                          onClick={() => toast.info("Navigate to Register User page")}
                          className="mt-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Register First Parent
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => (
                    <TableRow key={parent.id} className="hover:bg-[#0A2540]/5">
                      <TableCell className="text-[#0A2540]">
                        {parent.firstName} {parent.lastName}
                      </TableCell>
                      <TableCell className="text-gray-600">{parent.email}</TableCell>
                      <TableCell className="text-gray-600">{parent.phone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-xl">
                            {parent.student_ids?.length || 0}
                          </Badge>
                          {parent.student_ids && parent.student_ids.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(parent)}
                              className="text-blue-600 hover:text-blue-700 rounded-xl"
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-xl ${
                            parent.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {parent.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SimpleDropdown>
                          <SimpleDropdownTrigger>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg">
                              <span className="h-3 w-3" />
                            </Button>
                          </SimpleDropdownTrigger>
                          <SimpleDropdownContent>
                            <SimpleDropdownItem onClick={() => handleView(parent)}>
                              <span className="h-3 w-3" />
                              V
                            </SimpleDropdownItem>
                            <SimpleDropdownItem onClick={() => handleEdit(parent.id)}>
                              <span className="h-3 w-3" />
                              E
                            </SimpleDropdownItem>
                            <SimpleDropdownSeparator />
                            <SimpleDropdownItem 
                              onClick={() => openDeleteDialog(parent)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <span className="h-3 w-3" />
                              D
                            </SimpleDropdownItem>
                          </SimpleDropdownContent>
                        </SimpleDropdown>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Parent Dialog */}
      {selectedParent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-[#0A2540]">Parent Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">First Name</p>
                  <p className="text-[#0A2540]">{selectedParent.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Name</p>
                  <p className="text-[#0A2540]">{selectedParent.lastName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-[#0A2540]">{selectedParent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-[#0A2540]">{selectedParent.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Linked Children ({selectedParent?.student_ids?.length || 0})</p>
                {selectedParent?.student_ids && selectedParent.student_ids.length > 0 ? (
                  <div className="space-y-2">
                    {getLinkedStudentNames(selectedParent.id).map((name, index) => (
                      <Badge key={index} variant="outline" className="rounded-xl mr-2">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No children linked yet</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge
                  className={`rounded-xl ${
                    selectedParent.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedParent.status}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedParent?.firstName} {selectedParent?.lastName}"?
              {selectedParent && selectedParent.student_ids && selectedParent.student_ids.length > 0
                ? ` This parent has ${selectedParent.student_ids.length} linked student(s). Please unlink them first.`
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              disabled={selectedParent ? (selectedParent.student_ids?.length || 0) > 0 : false}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
