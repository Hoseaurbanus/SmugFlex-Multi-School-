import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { API_CONFIG } from '../../config/api';
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { tokenManager } from "../../utils/tokenManager";

interface AddStudentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddStudentFormComponent({ onClose: _onClose, onSuccess }: AddStudentFormProps) {
  const { classes, parents, currentAcademicYear, createStudentAPI, currentUser } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  // Monitor classes data when component loads
  useEffect(() => {
    // Silent for security
  }, [classes]);
  
  const [addFormData, setAddFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: undefined as 'Male' | 'Female' | undefined,
    class_id: '',
    parent_id: '',
    photo_url: '',
  });
  const [addFormErrors, setAddFormErrors] = useState<{ [key: string]: string }>({});

  const validateAddForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!addFormData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!addFormData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!addFormData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!addFormData.gender) newErrors.gender = 'Gender is required';
    if (!addFormData.class_id || addFormData.class_id === '') newErrors.class_id = 'Class is required';

    setAddFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = () => {
    if (!passportFile) {
      toast.error("Please select a photo");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const photoDataUrl = reader.result as string;
      setPhotoPreview(photoDataUrl);
      toast.success("Photo uploaded successfully");
    };
    reader.readAsDataURL(passportFile);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAddForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    // Check if classes are loaded
    if (!classes || classes.length === 0) {
      toast.error('No classes available. Please refresh the page and try again.');
      return;
    }

    // Better class validation with multiple approaches
    let selectedClass = null;
    
    // Try string comparison first
    selectedClass = classes.find((c) => String(c.id) === addFormData.class_id);
    
    // If not found, try number comparison
    if (!selectedClass) {
      const classIdNum = parseInt(addFormData.class_id);
      if (!isNaN(classIdNum)) {
        selectedClass = classes.find((c) => c.id === classIdNum);
      }
    }
    
    // If still not found, try loose comparison with type checking
    if (!selectedClass) {
      selectedClass = classes.find((c) => {
        const classIdStr = String(c.id);
        return classIdStr === addFormData.class_id || classIdStr === String(addFormData.class_id);
      });
    }
    
    if (!selectedClass) {
      const availableClassInfo = classes.map(c => `ID: ${c.id} (${typeof c.id}) - ${c.name}`).join('\n');
      toast.error(`Invalid class selected. Available classes:\n${availableClassInfo}\nPlease refresh the page and try again.`);
      return;
    }

    setIsLoading(true);

    // Create student data with API-compatible field names
    const studentData: Record<string, any> = {
      first_name: addFormData.first_name,
      last_name: addFormData.last_name,
      other_name: '',
      admission_number: '',
      class_id: addFormData.class_id ? parseInt(addFormData.class_id) : 0,
      level: selectedClass.level,
      parent_id: addFormData.parent_id && addFormData.parent_id !== 'none' ? parseInt(addFormData.parent_id) : null,
      date_of_birth: addFormData.date_of_birth,
      gender: addFormData.gender || 'Male',
      status: 'Active',
      academic_year: currentAcademicYear,
      admission_date: new Date().toISOString().split('T')[0],
    };

    const result = await createStudentAPI(studentData);

    if (result?.id && passportFile) {
      try {
        await tokenManager.ensureToken(currentUser);
        const token = tokenManager.getToken();

        const formData = new FormData();
        formData.append('passport', passportFile);
        formData.append('student_id', String(result.id));

        const uploadUrl = `${new URL(API_CONFIG.BASE_URL).origin}${new URL(API_CONFIG.BASE_URL).pathname.replace(/\/?api\/?$/, '')}/api/upload-student-photo.php`;
        const photoResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData
        });

        if (!photoResponse.ok) {
          throw new Error('Failed to upload student photo');
        }

        await photoResponse.json();
      } catch (e: any) {
        toast.error(e?.message || 'Student created but photo upload failed');
      }
    }
    
    if (result) {
      toast.success('Student registered successfully!');
      
      setAddFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: undefined as 'Male' | 'Female' | undefined,
        class_id: '',
        parent_id: '',
        photo_url: '',
      });
      setPassportFile(null);
      setPhotoPreview('');
      setAddFormErrors({});
      onSuccess();
    }
    setIsLoading(false);
  };

  const handleResetAddForm = () => {
    setAddFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: undefined as 'Male' | 'Female' | undefined,
      class_id: '',
      parent_id: '',
      photo_url: '',
    });
    setPassportFile(null);
    setAddFormErrors({});
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          <strong>Student Registration Process:</strong>
          <br />
          1. Enter student personal information
          <br />
          2. Assign to a class (determines fee structure)
          <br />
          3. Optionally link to existing parent
          <br />
          4. Optionally upload passport photo for result cards
          <br />
          5. Admission number will be auto-generated
        </AlertDescription>
      </Alert>

      <form onSubmit={handleAddStudent}>
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-md text-gray-900 font-medium">Personal Details</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter first name"
                  value={addFormData.first_name}
                  onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                  className={`h-12 rounded-xl border ${
                    addFormErrors.first_name ? 'border-red-500' : 'border-gray-300'
                  } bg-white text-gray-900`}
                />
                {addFormErrors.first_name && (
                  <p className="text-xs text-red-500">{addFormErrors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter last name"
                  value={addFormData.last_name}
                  onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                  className={`h-12 rounded-xl border ${
                    addFormErrors.last_name ? 'border-red-500' : 'border-gray-300'
                  } bg-white text-gray-900`}
                />
                {addFormErrors.last_name && <p className="text-xs text-red-500">{addFormErrors.last_name}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={addFormData.date_of_birth}
                  onChange={(e) => setAddFormData({ ...addFormData, date_of_birth: e.target.value })}
                  className={`h-12 rounded-xl border ${
                    addFormErrors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                  } bg-white text-gray-900`}
                />
                {addFormErrors.date_of_birth && (
                  <p className="text-xs text-red-500">{addFormErrors.date_of_birth}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={addFormData.gender}
                  onValueChange={(value: string) =>
                    setAddFormData({ ...addFormData, gender: value as 'Male' | 'Female' })
                  }
                >
                  <SelectTrigger
                    className={`h-12 rounded-xl border ${
                      addFormErrors.gender ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="Male" className="text-gray-900">
                      Male
                    </SelectItem>
                    <SelectItem value="Female" className="text-gray-900">
                      Female
                    </SelectItem>
                  </SelectContent>
                </Select>
                {addFormErrors.gender && <p className="text-xs text-red-500">{addFormErrors.gender}</p>}
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-md text-gray-900 font-medium">Academic Details</h4>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">
                  Assign to Class <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={addFormData.class_id}
                  onValueChange={(value: string) => {
                    setAddFormData({ ...addFormData, class_id: value });
                  }}
                >
                  <SelectTrigger
                    className={`h-12 rounded-xl border ${
                      addFormErrors.class_id ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  >
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {classes
                      .filter((c) => c.status === 'Active')
                      .map((cls) => (
                        <SelectItem 
                          key={cls.id} 
                          value={String(cls.id)} 
                          className="text-gray-900"
                        >
                          {cls.name} - {cls.level} ({cls.currentStudents}/{cls.capacity} students)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {addFormErrors.class_id && <p className="text-xs text-red-500">{addFormErrors.class_id}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Academic Year</Label>
                <Input
                  value={currentAcademicYear || ''}
                  disabled
                  className="h-12 rounded-xl border border-gray-300 bg-gray-100 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-md text-gray-900 font-medium">Parent/Guardian Information</h4>

            <div className="space-y-2">
              <Label className="text-gray-700">Link to Existing Parent (Optional)</Label>
              <Select
                value={addFormData.parent_id}
                onValueChange={(value: string) => setAddFormData({ ...addFormData, parent_id: value })}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="none" className="text-gray-900">
                    No parent linked
                  </SelectItem>
                  {parents
                    .filter((p) => p.status === 'Active')
                    .map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()} className="text-gray-900">
                        {parent.first_name} {parent.last_name} - {parent.phone}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                You can link parent now or later from "Link Student-Parent" page
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-md text-gray-900 font-medium">Student Photo (Optional)</h4>

            <div className="space-y-2">
              <Label className="text-gray-700">Upload Passport Photo</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={passportInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                  className="rounded-xl border-gray-300 bg-white text-gray-900"
                />
                <Button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={!passportFile}
                  className="bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded-xl"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
              {passportFile && (
                <p className="text-sm text-gray-600">Selected: {passportFile.name}</p>
              )}
              {photoPreview && (
                <div className="flex items-center gap-3">
                  <img 
                    src={photoPreview} 
                    alt="Student passport" 
                    className="w-16 h-16 rounded-lg object-cover border border-gray-300"
                  />
                  <p className="text-sm text-green-600">✓ Photo uploaded successfully</p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Upload student passport photo for result cards and identification
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            onClick={handleResetAddForm}
            variant="outline"
            className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
          >
            <span className="w-4 h-4 mr-2" />
            {isLoading ? 'Registering...' : 'Register Student'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Export with proper default export for lazy loading
export default AddStudentFormComponent;
