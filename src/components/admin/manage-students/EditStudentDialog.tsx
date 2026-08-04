import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Camera } from "lucide-react";
import { Student } from "../../../types/school";
import { RefObject } from "react";

interface EditFormData {
  first_name: string;
  last_name: string;
  other_name: string;
  gender: "Male" | "Female";
  date_of_birth: string;
  admission_number: string;
  class_id: string;
  level: string;
}

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent: Student | null;
  editFormData: EditFormData;
  onFormDataChange: (data: EditFormData) => void;
  editPassportFile: File | null;
  onPassportFileChange: (file: File | null) => void;
  editPassportInputRef: RefObject<HTMLInputElement | null>;
  classes: any[];
  onSave: () => void;
  actionLoading: string | null;
  getStudentPhotoCandidates: (s: Student) => string[];
  handleStudentPhotoError: (e: React.SyntheticEvent<HTMLImageElement>, s: Student) => void;
}

export function EditStudentDialog({
  open,
  onOpenChange,
  selectedStudent,
  editFormData,
  onFormDataChange,
  editPassportFile,
  onPassportFileChange,
  editPassportInputRef,
  classes,
  onSave,
  actionLoading,
  getStudentPhotoCandidates,
  handleStudentPhotoError,
}: EditStudentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Update student information and photo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>First Name</Label>
            <Input
              value={editFormData.first_name}
              onChange={(e) => onFormDataChange({...editFormData, first_name: e.target.value})}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input
              value={editFormData.last_name}
              onChange={(e) => onFormDataChange({...editFormData, last_name: e.target.value})}
              placeholder="Enter last name"
            />
          </div>
          <div>
            <Label>Other Name</Label>
            <Input
              value={editFormData.other_name}
              onChange={(e) => onFormDataChange({...editFormData, other_name: e.target.value})}
              placeholder="Enter other name (optional)"
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={editFormData.gender} onValueChange={(value: string) => onFormDataChange({...editFormData, gender: value as "Male" | "Female"})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={editFormData.date_of_birth}
              onChange={(e) => onFormDataChange({...editFormData, date_of_birth: e.target.value})}
            />
          </div>
          <div>
            <Label>Admission Number</Label>
            <Input value={editFormData.admission_number} disabled className="bg-gray-50" />
          </div>
          <div>
            <Label>Class</Label>
            <Select
              value={editFormData.class_id}
              onValueChange={(value) => {
                const selectedClass = Array.isArray(classes) ? classes.find(c => String(c.id) === value) : null;
                onFormDataChange({
                  ...editFormData,
                  class_id: value,
                  level: selectedClass?.level || '',
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(classes) && classes.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.name} ({cls.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Student Photo</Label>
            <div className="flex items-center gap-4">
              {selectedStudent?.photo_url && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    src={getStudentPhotoCandidates(selectedStudent)[0] || ''}
                    alt={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                    className="w-full h-full object-cover"
                    data-candidate-idx={0}
                    onError={(e) => handleStudentPhotoError(e, selectedStudent)}
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  ref={editPassportInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPassportFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    editPassportInputRef.current?.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Choose New Photo
                </Button>
                {editPassportFile && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Selected: {editPassportFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={actionLoading === 'edit'}>
            {actionLoading === 'edit' && (
              <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
