import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { useSchool, Scholarship } from "../../contexts/SchoolContext";
import { Percent } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

export function DiscountScholarshipPage() {
  const { students, scholarships, addScholarship, updateScholarship, deleteScholarship, currentAcademicYear } = useSchool();
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Percentage" as 'Percentage' | 'Fixed Amount',
    value: "",
    description: "",
    eligibility_criteria: "",
    total_budget: "",
    status: "Active" as "Active" | "Inactive"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value) {
      toast.error("Please fill all required fields");
      return;
    }

    if (isEditing && selectedScholarship) {
      updateScholarship(selectedScholarship.id, {
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        description: formData.description,
        eligibility_criteria: formData.eligibility_criteria,
        total_budget: Number(formData.total_budget) || 0,
        status: formData.status,
      });
      toast.success("Scholarship updated successfully!");
    } else {
      addScholarship({
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        description: formData.description,
        eligibility_criteria: formData.eligibility_criteria,
        total_budget: Number(formData.total_budget) || 0,
        beneficiaries: 0,
        status: formData.status,
        academic_year: currentAcademicYear || '',
      });
      toast.success("Scholarship created successfully!");
    }
    
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (scholarship: Scholarship) => {
    setSelectedScholarship(scholarship);
    setFormData({
      name: scholarship.name,
      type: scholarship.type,
      value: scholarship.value.toString(),
      description: scholarship.description,
      eligibility_criteria: scholarship.eligibility_criteria,
      total_budget: scholarship.total_budget.toString(),
      status: scholarship.status
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
    if (selectedScholarship) {
      if (selectedScholarship.beneficiaries > 0) {
        toast.error(`Cannot delete scholarship with ${selectedScholarship.beneficiaries} beneficiaries. Please remove beneficiaries first.`);
        setDeleteDialogOpen(false);
        return;
      }
      
      deleteScholarship(selectedScholarship.id);
      toast.success("Scholarship deleted successfully!");
      setDeleteDialogOpen(false);
      setSelectedScholarship(null);
    }
  };

  const openDeleteDialog = (scholarship: Scholarship) => {
    setSelectedScholarship(scholarship);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Percentage",
      value: "",
      description: "",
      eligibility_criteria: "",
      total_budget: "",
      status: "Active"
    });
    setIsEditing(false);
    setSelectedScholarship(null);
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
    toast.info('Form cancelled - no changes made');
  };

  // Statistics
  const totalBeneficiaries = scholarships.reduce((sum, s) => sum + s.beneficiaries, 0);
  const totalBudget = scholarships.reduce((sum, s) => sum + s.total_budget, 0);
  const activeScholarships = scholarships.filter(s => s.status === 'Active').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Discount & Scholarship Management</h1>
          <p className="text-gray-600">Create and manage fee discounts and scholarships</p>
        </div>
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)} 
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Add Scholarship
          </Button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <Card className="border-[#0A2540]/10 shadow-lg">
          <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0A2540]">
                {isEditing ? `Edit Scholarship: ${selectedScholarship?.name}` : "Create New Scholarship"}
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
                  <Label className="text-[#0A2540]">Scholarship Name *</Label>
                  <Input
                    placeholder="e.g., Academic Excellence, Staff Child Discount"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({ ...formData, type: value as 'Percentage' | 'Fixed Amount' })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage">Percentage Discount</SelectItem>
                      <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">
                    Value * {formData.type === 'Percentage' ? '(%)' : '(₦)'}
                  </Label>
                  <Input
                    type="number"
                    placeholder={formData.type === 'Percentage' ? "e.g., 50" : "e.g., 50000"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Total Budget (₦)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500000"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                    className="h-12 rounded-xl border-[#0A2540]/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A2540]">Eligibility Criteria</Label>
                <Textarea
                  placeholder="e.g., Students with 90% and above, Children of staff members"
                  value={formData.eligibility_criteria}
                  onChange={(e) => setFormData({ ...formData, eligibility_criteria: e.target.value })}
                  className="rounded-xl border-[#0A2540]/20 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A2540]">Description</Label>
                <Textarea
                  placeholder="Brief description of the scholarship..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl border-[#0A2540]/20 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#0A2540]">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
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

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                >
                  <span className="w-4 h-4 mr-2" />
                  {isEditing ? "Update Scholarship" : "Create Scholarship"}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Scholarships</p>
                <p className="text-[#0A2540]">{scholarships.length}</p>
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
                <p className="text-[#0A2540]">{activeScholarships}</p>
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
                <p className="text-gray-600 text-sm mb-1">Beneficiaries</p>
                <p className="text-[#0A2540]">{totalBeneficiaries}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Budget</p>
                <p className="text-[#0A2540]">₦{totalBudget.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scholarships.length === 0 ? (
          <Card className="col-span-full border-[#0A2540]/10">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="w-16 h-16 text-gray-300" />
                <h3 className="text-[#0A2540]">No Scholarships Yet</h3>
                <p className="text-gray-600">Get started by creating your first scholarship</p>
                {!showForm && (
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="mt-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
                  >
                    <span className="w-4 h-4 mr-2" />
                    Create First Scholarship
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          scholarships.map((scholarship) => (
            <Card key={scholarship.id} className="border-[#0A2540]/10 hover:shadow-lg transition-shadow">
              <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        scholarship.type === 'Percentage' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                        {scholarship.type === 'Percentage' ? (
                          <Percent className="w-5 h-5 text-purple-600" />
                        ) : (
                          <span className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-[#0A2540]">{scholarship.name}</h3>
                        <Badge 
                          className={`rounded-xl text-xs mt-1 ${
                            scholarship.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {scholarship.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(scholarship)}
                      className="rounded-xl h-8 w-8 p-0"
                    >
                      <span className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(scholarship)}
                      className="rounded-xl h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <span className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-gray-600">Value</span>
                  <span className="text-[#0A2540]">
                    {scholarship.type === 'Percentage' 
                      ? `${scholarship.value}% Off` 
                      : `₦${scholarship.value.toLocaleString()}`}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Eligibility Criteria</p>
                  <p className="text-[#0A2540] text-sm">{scholarship.eligibility_criteria || 'Not specified'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-[#0A2540] text-sm">{scholarship.description || 'No description'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#0A2540]/10">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Beneficiaries</p>
                    <p className="text-[#0A2540]">{scholarship.beneficiaries}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Budget</p>
                    <p className="text-[#0A2540]">₦{scholarship.total_budget.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scholarship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedScholarship?.name}"? 
              {selectedScholarship && selectedScholarship.beneficiaries > 0 
                ? ` This scholarship has ${selectedScholarship.beneficiaries} beneficiaries.`
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
