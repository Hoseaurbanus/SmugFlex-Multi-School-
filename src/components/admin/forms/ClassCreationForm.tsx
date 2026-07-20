import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { toast } from "sonner";
import { useSchool } from "../../../contexts/SchoolContext";

const CLASS_LEVELS = ["Creche", "Nursery", "KG 1", "KG 2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];

interface ClassCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ClassCreationForm({ onClose, onSuccess }: ClassCreationFormProps) {
  const { addClass, teachers, currentAcademicYear } = useSchool();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    level: "",
    capacity: "50",
    classTeacherId: "",
    section: "",
    status: "Active" as "Active" | "Inactive"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get active teachers
  const availableTeachers = teachers.filter(t => t.status === 'Active');

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Class name must be at least 3 characters";
    }

    if (!formData.category) {
      newErrors.category = "School category is required";
    }

    if (!formData.level.trim()) {
      newErrors.level = "Class level is required";
    }

    if (!formData.capacity) {
      newErrors.capacity = "Class capacity is required";
    } else if (parseInt(formData.capacity) < 1) {
      newErrors.capacity = "Capacity must be at least 1 student";
    } else if (parseInt(formData.capacity) > 100) {
      newErrors.capacity = "Capacity cannot exceed 100 students";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAcademicYear) {
      toast.error('Please set the current academic year in Settings before creating a class');
      return;
    }
    
    if (!validateForm()) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get teacher details
      const teacher = availableTeachers.find(t => t.id === parseInt(formData.classTeacherId));
      
      // Prepare class data
      const classData = {
        name: formData.name.trim(),
        level: formData.level.trim(),
        category: formData.category as "Primary" | "Secondary",
        capacity: parseInt(formData.capacity),
        currentStudents: 0,
        classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
        classTeacherId: parseInt(formData.classTeacherId),
        section: formData.section.trim(),
        status: formData.status,
        academicYear: currentAcademicYear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newClassId = await addClass(classData);
      
      if (newClassId > 0) {
        toast.success(`Class "${formData.name}" created successfully!`);
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to create class - please try again');
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create class - please check your connection and try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="text-xl font-bold">Create New Class</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                School Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger className={`border-gray-300 ${errors.category ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary">Primary</SelectItem>
                  <SelectItem value="Secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="level" className="text-sm font-medium text-gray-700">
                Class Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.level}
                onValueChange={(value) => handleInputChange('level', value)}
              >
                <SelectTrigger className={`border-gray-300 ${errors.level ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.level && <p className="text-sm text-red-500">{errors.level}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Class Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Grade 1 (Diamond)"
                className={`border-gray-300 ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-sm font-medium text-gray-700">
                Class Capacity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                placeholder="Maximum students (1-100)"
                min="1"
                max="100"
                className={`border-gray-300 ${errors.capacity ? 'border-red-500' : ''}`}
              />
              {errors.capacity && <p className="text-sm text-red-500">{errors.capacity}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classTeacherId" className="text-sm font-medium text-gray-700">
                Class Teacher
              </Label>
              <Select
                value={formData.classTeacherId}
                onValueChange={(value) => handleInputChange('classTeacherId', value)}
              >
                <SelectTrigger className={`border-gray-300 ${errors.classTeacherId ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select class teacher" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classTeacherId && <p className="text-sm text-red-500">{errors.classTeacherId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="section" className="text-sm font-medium text-gray-700">
                Section
              </Label>
              <Input
                id="section"
                type="text"
                value={formData.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                placeholder="e.g., A, B, Morning"
                className="border-gray-300"
              />
            </div>
          </div>

          {/* Status */}
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
