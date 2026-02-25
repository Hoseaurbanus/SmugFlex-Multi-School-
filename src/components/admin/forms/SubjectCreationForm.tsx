import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";
import { useSchool } from "../../../contexts/SchoolContext";

interface SubjectCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SubjectCreationForm({ onClose, onSuccess }: SubjectCreationFormProps) {
  const { addSubject, subjects, classes, currentAcademicYear, currentTerm, registerSubjectForClass } = useSchool();
  
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  // Available categories
  const categories = ["Creche", "Nursery", "Primary", "JSS", "SSS"];

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Subject name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Subject name must be at least 2 characters";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Subject code is required";
    } else if (formData.code.length < 2) {
      newErrors.code = "Subject code must be at least 2 characters";
    } else if (!/^[A-Z0-9]+$/i.test(formData.code)) {
      newErrors.code = "Subject code can only contain letters and numbers";
    }

    if (!formData.category) {
      newErrors.category = "Subject category is required";
    }

    // Check for duplicate code (case-insensitive)
    const duplicateCode = subjects.find(s => 
      s.code.toLowerCase() === formData.code.toLowerCase().trim()
    );
    if (duplicateCode) {
      newErrors.code = `Subject code "${formData.code}" already exists`;
    }

    // Check for duplicate name (case-insensitive)
    const duplicateName = subjects.find(s => 
      s.name.toLowerCase() === formData.name.toLowerCase().trim()
    );
    if (duplicateName) {
      newErrors.name = `Subject name "${formData.name}" already exists`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const subjectData = {
        name: formData.name.trim(),
        subject_name: formData.name.trim(), // Required field for compatibility
        code: formData.code.toUpperCase().trim(),
        category: formData.category as 'Creche' | 'Nursery' | 'Primary' | 'JSS' | 'SS' | 'General',
        department: formData.department.trim() || formData.category,
        description: formData.description.trim(),
        status: formData.status,
        is_core: formData.is_core,
      };

      console.log('=== SUBJECT CREATION ===');
      console.log('Submitting subject data:', subjectData);

      const newSubjectId = await addSubject(subjectData);
      
      if (newSubjectId > 0) {
        if (selectedClassIds.length > 0 && currentAcademicYear && currentTerm) {
          for (const classId of selectedClassIds) {
            try {
              await registerSubjectForClass(classId, newSubjectId, currentAcademicYear, currentTerm, true);
            } catch (e) {
              console.error('Error registering subject for class during creation:', e);
            }
          }
        }

        toast.success(`Subject "${formData.name}" created successfully!`);
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to create subject - please try again');
      }
    } catch (error) {
      console.error('Subject creation error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          toast.error(`Subject with code "${formData.code}" already exists. Please use a different code.`);
        } else if (error.message.includes('Invalid subject data')) {
          toast.error('Please check all required fields and try again.');
        } else if (error.message.includes('not authorized') || error.message.includes('permission')) {
          toast.error('You do not have permission to create subjects.');
        } else {
          toast.error(`Failed to create subject: ${error.message}`);
        }
      } else {
        toast.error('Failed to create subject - please check your connection and try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <CardTitle className="text-xl font-bold">Create New Subject</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Subject Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Mathematics, English"
                className={`border-gray-300 ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                Subject Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="e.g., MATH, ENG"
                maxLength={10}
                className={`border-gray-300 ${errors.code ? 'border-red-500' : ''}`}
              />
              {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger className={`border-gray-300 ${errors.category ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                Department
              </Label>
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="e.g., Sciences, Arts"
                className="border-gray-300"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the subject..."
              rows={3}
              className="border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Classes for this subject (optional)
            </Label>
            <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
              {classes?.map((cls: any) => {
                const checked = selectedClassIds.includes(cls.id);
                return (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={checked}
                      onCheckedChange={(value) => {
                        const isChecked = Boolean(value);
                        setSelectedClassIds((prev) =>
                          isChecked ? [...prev, cls.id] : prev.filter((id) => id !== cls.id)
                        );
                      }}
                    />
                    <Label htmlFor={`class-${cls.id}`} className="text-sm text-gray-700">
                      {cls.name} ({cls.level})
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Subject Type
              </Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_core"
                  checked={formData.is_core}
                  onCheckedChange={(checked) => handleInputChange('is_core', checked)}
                />
                <Label htmlFor="is_core" className="text-sm text-gray-600">
                  Core Subject
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6 py-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Subject'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
