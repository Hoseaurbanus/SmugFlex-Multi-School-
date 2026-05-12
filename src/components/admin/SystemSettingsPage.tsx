import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { API_CONFIG } from '../../config/api';
import { tokenManager } from '../../utils/tokenManager';

export function SystemSettingsPage() {
  const isInitialMount = useRef(true);
  const hasEditedAttendance = useRef(false);
  
  const {
    students,
    classes,
    teachers,
    currentUser,
    currentAcademicYear,
    currentTerm,
    updateCurrentTerm,
    updateCurrentTermAndYear,
    updateCurrentAcademicYear,
    getAttendanceRequirements,
    updateAttendanceRequirements,
    loadAttendanceRequirements,
    attendanceRequirements,
    schoolSettings,
    updateSchoolSettings,
    loadSchoolSettings,
    createUserAPI,
    resetUserPasswordAPI,
    users,
    loadUsersFromAPI,
    addNotification
  } = useSchool();
  
  // Simplified permission check - allow admin users
  const hasAccess = currentUser && currentUser.role === 'admin';

  // Show access denied if no permission
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <span className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to access System Settings.
              This page requires administrator-level privileges.
              Please contact your system administrator if you believe this is an error.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Log initial mount only once
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [currentUser, currentAcademicYear, currentTerm, schoolSettings, users.length, hasAccess]);

  // Initialize state with empty objects to avoid dependency issues
  const [sessionData, setSessionData] = useState({
    currentSession: '',
    currentTerm: '',
  });

  const [attendanceData, setAttendanceData] = useState<Record<string, number>>({
  'First Term': 0,
  'Second Term': 0,
  'Third Term': 0
});

  const [signatureData, setSignatureData] = useState({
    principal_name: '',
    principal_comment: '',
    head_teacher_name: '',
    head_teacher_comment: '',
    resumption_date: ''
  });

  const [principalSignatureFile, setPrincipalSignatureFile] = useState<File | null>(null);
  const [headTeacherSignatureFile, setHeadTeacherSignatureFile] = useState<File | null>(null);
  const [principalSignaturePreview, setPrincipalSignaturePreview] = useState<string>('');
  const [headTeacherSignaturePreview, setHeadTeacherSignaturePreview] = useState<string>('');

  const principalSignatureRef = useRef<HTMLInputElement>(null);
  const headTeacherSignatureRef = useRef<HTMLInputElement>(null);
  const schoolLogoRef = useRef<HTMLInputElement>(null);

  // School logo state
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState<string>('');

  const [brandingData, setBrandingData] = useState({
    schoolName: '',
    schoolMotto: '',
    principalName: '',
  });

  const normalizeDateForInput = useCallback((value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '0000-00-00' || raw === '0000-00-00 00:00:00') return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw;
  }, []);

  const normalizeDateForSave = useCallback((value: unknown): string => {
    const normalized = normalizeDateForInput(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
  }, [normalizeDateForInput]);

  const [nextTermResumptionDate, setNextTermResumptionDate] = useState<string>('');
  const [loadedSignatureSettings, setLoadedSignatureSettings] = useState<any>(null);
  const [isNextTermLoading, setIsNextTermLoading] = useState(false);
  const [isNextTermSaving, setIsNextTermSaving] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Update local state when context changes - use useCallback to prevent unnecessary re-renders
  const updateSessionData = useCallback(() => {
    setSessionData({
      currentSession: currentAcademicYear || '',
      currentTerm: currentTerm || '',
    });
  }, [currentAcademicYear, currentTerm]);

  useEffect(() => {
    updateSessionData();
  }, [updateSessionData]);

  // Memoized attendance requirements loading to prevent repeated calls
  const loadAttendanceRequirementsOnce = useCallback(async () => {
    if (currentUser) {
      try {
        const requirements = await loadAttendanceRequirements();

        if (!hasEditedAttendance.current && requirements && Object.keys(requirements).length > 0) {
          setAttendanceData(requirements);
        }
      } catch (error) {
        // Silent fail for security
      }
    }
  }, [currentUser, loadAttendanceRequirements]);

  // Load attendance requirements only when currentUser changes
  useEffect(() => {
    loadAttendanceRequirementsOnce();
  }, [loadAttendanceRequirementsOnce]);

  // Memoized branding data update
  const updateBrandingData = useCallback(() => {
    if (schoolSettings && Object.keys(schoolSettings).length > 0) {
      setBrandingData({
        schoolName: schoolSettings.school_name || '',
        schoolMotto: schoolSettings.school_motto || '',
        principalName: schoolSettings.principal_name || '',
      });
    }
  }, [schoolSettings]);

  useEffect(() => {
    updateBrandingData();
  }, [updateBrandingData]);

  // Memoized signature data update
  const updateSignatureData = useCallback(() => {
    if (schoolSettings && Object.keys(schoolSettings).length > 0) {
      setSignatureData((prev) => ({
        ...prev,
        principal_name: schoolSettings.principal_name || '',
        principal_comment: schoolSettings.principal_comment || '',
        head_teacher_name: schoolSettings.head_teacher_name || '',
        head_teacher_comment: schoolSettings.head_teacher_comment || ''
      }));
      
      // Set signature previews from school settings
      if (schoolSettings.principal_signature) {
        setPrincipalSignaturePreview(schoolSettings.principal_signature);
      }
      if (schoolSettings.head_teacher_signature) {
        setHeadTeacherSignaturePreview(schoolSettings.head_teacher_signature);
      }
      
      // Set school logo preview from school settings
      if (schoolSettings.school_logo_url) {
        setSchoolLogoPreview(schoolSettings.school_logo_url);
      }
    }
  }, [schoolSettings]);

  useEffect(() => {
    updateSignatureData();
  }, [updateSignatureData]);

  // Refresh school settings when component mounts - only once with proper cleanup
  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      if (currentUser && isMounted) {
        // Add longer delay to ensure token is available after login
        setTimeout(() => {
          if (isMounted) {
            loadSchoolSettings();
          }
        }, 500);
      }
    };
    
    loadSettings();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, loadSchoolSettings]);

  // Load per-term "Next Term Begins" value used on student result sheets
  useEffect(() => {
    let isMounted = true;
    const loadNextTermResumptionDate = async () => {
      try {
        if (!currentAcademicYear || !currentTerm) return;

        setIsNextTermLoading(true);
        await tokenManager.ensureToken(currentUser);
        const token = tokenManager.getToken();
        if (!token) return;

        const query = new URLSearchParams({
          academic_year: String(currentAcademicYear),
          term: String(currentTerm)
        });

        const resp = await fetch(`${API_CONFIG.BASE_URL}/signature_settings.php?${query.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const json = await resp.json();
        const data = (json && json.success === true) ? (json.data ?? null) : null;
        const loaded = normalizeDateForInput((data as any)?.resumption_date);

        if (!isMounted) return;
        setLoadedSignatureSettings(data);
        setNextTermResumptionDate(loaded);
      } catch (error) {
        if (!isMounted) return;
        setLoadedSignatureSettings(null);
        setNextTermResumptionDate('');
      } finally {
        if (isMounted) setIsNextTermLoading(false);
      }
    };

    loadNextTermResumptionDate();
    return () => {
      isMounted = false;
    };
  }, [currentAcademicYear, currentTerm, normalizeDateForInput]);

  const handleSaveNextTermBegins = async () => {
    setIsNextTermSaving(true);
    try {
      await tokenManager.ensureToken(currentUser);
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      if (!currentAcademicYear || !currentTerm) {
        toast.error('Academic year and term must be set');
        return;
      }

      const payload = {
        academic_year: String(currentAcademicYear),
        term: String(currentTerm),
        principal_name: String((loadedSignatureSettings as any)?.principal_name ?? ''),
        principal_signature: (loadedSignatureSettings as any)?.principal_signature ?? null,
        principal_comment: String((loadedSignatureSettings as any)?.principal_comment ?? ''),
        head_teacher_name: String((loadedSignatureSettings as any)?.head_teacher_name ?? ''),
        head_teacher_signature: (loadedSignatureSettings as any)?.head_teacher_signature ?? null,
        head_teacher_comment: String((loadedSignatureSettings as any)?.head_teacher_comment ?? ''),
        resumption_date: normalizeDateForSave(nextTermResumptionDate),
      };

      const resp = await fetch(`${API_CONFIG.BASE_URL}/signature_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await resp.json();
      if (!json || json.success !== true) {
        throw new Error((json as any)?.message || 'Failed to save next term begins date');
      }

      const saved = (json as any)?.data ?? null;
      setLoadedSignatureSettings(saved);
      setNextTermResumptionDate(normalizeDateForInput((saved as any)?.resumption_date));
      toast.success('Next term begins date saved');
    } catch (error) {
      toast.error('Failed to save next term begins date');
    } finally {
      setIsNextTermSaving(false);
    }
  };

  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [passwordResetData, setPasswordResetData] = useState({
    username: "",
    newPassword: "",
  });

  const handleUpdateSession = async () => {
    setIsLoading(true);
    try {
      await updateCurrentTermAndYear(sessionData.currentSession, sessionData.currentTerm);
      toast.success(`Academic session and term updated to ${sessionData.currentSession} - ${sessionData.currentTerm}`);
    } catch (error) {
      toast.error("Failed to update academic session and term");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsLoading(true);
    try {
      await updateSchoolSettings({
        school_name: brandingData.schoolName,
        school_motto: brandingData.schoolMotto,
        principal_name: brandingData.principalName,
        school_logo_url: schoolLogoPreview,
      });
      toast.success("School branding updated successfully!");
      
      // Force reload settings to ensure persistence
      setTimeout(() => {
        loadSchoolSettings();
      }, 500);
    } catch (error) {
      toast.error("Failed to save school branding");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    setIsLoading(true);
    
    try {
      await updateAttendanceRequirements(attendanceData);
      
      // Create a detailed success message showing the saved values
      const savedTerms = Object.entries(attendanceData)
        .filter(([_, days]) => days > 0)
        .map(([term, days]) => `${term}: ${days} days`)
        .join(', ');
      
      if (savedTerms) {
        toast.success(`Attendance requirements saved successfully! ${savedTerms}`);
      } else {
        toast.success('Attendance requirements saved successfully!');
      }
    } catch (error) {
      toast.error('Failed to save attendance requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSignature = async () => {
    setIsLoading(true);
    try {
      await updateSchoolSettings({
        principal_name: signatureData.principal_name,
        head_teacher_name: signatureData.head_teacher_name,
        principal_comment: signatureData.principal_comment,
        head_teacher_comment: signatureData.head_teacher_comment,
        principal_signature: principalSignaturePreview,
        head_teacher_signature: headTeacherSignaturePreview
      });
      toast.success("Signature settings updated successfully!");
      
      // Force reload settings to ensure persistence
      setTimeout(() => {
        loadSchoolSettings();
      }, 500);
    } catch (error) {
      toast.error("Failed to save signature settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrincipalSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPrincipalSignatureFile(file);
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          setPrincipalSignaturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        // Upload file to server
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const token = localStorage.getItem('jwt_token');
          if (!token) {
            toast.error('Authentication required');
            return;
          }
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.url) {
              // Store the server URL instead of base64
              setPrincipalSignaturePreview(result.data.url);
              toast.success('Principal signature uploaded successfully!');
            } else {
              toast.error('Upload failed: ' + (result.message || 'Invalid response'));
            }
          } else {
            toast.error('Upload failed: Server error');
          }
        } catch (error) {
          toast.error('Upload failed: Network error');
        }
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleHeadTeacherSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setHeadTeacherSignatureFile(file);
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          setHeadTeacherSignaturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        // Upload file to server
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const token = localStorage.getItem('jwt_token');
          if (!token) {
            toast.error('Authentication required');
            return;
          }
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.url) {
              // Store the server URL instead of base64
              setHeadTeacherSignaturePreview(result.data.url);
              toast.success('Head teacher signature uploaded successfully!');
            } else {
              toast.error('Upload failed: ' + (result.message || 'Invalid response'));
            }
          } else {
            toast.error('Upload failed: Server error');
          }
        } catch (error) {
          toast.error('Upload failed: Network error');
        }
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleSchoolLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSchoolLogoFile(file);
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          setSchoolLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        // Upload file to server
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const token = localStorage.getItem('jwt_token');
          if (!token) {
            toast.error('Authentication required');
            return;
          }
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.url) {
              // Store the server URL instead of base64
              setSchoolLogoPreview(result.data.url);
              toast.success('Logo uploaded successfully!');
            } else {
              toast.error('Upload failed: ' + (result.message || 'Invalid response'));
            }
          } else {
            toast.error('Upload failed: Server error');
          }
        } catch (error) {
          toast.error('Upload failed: Network error');
        }
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if username already exists
      const existingUser = users.find((u: any) => u.username === adminData.username);
      if (existingUser) {
        toast.error("Username already exists. Please choose a different username.");
        return;
      }

      // Create new admin user
      await createUserAPI({
        username: adminData.username,
        password: adminData.password,
        role: 'admin',
        linkedId: 0, // Admin has no linked profile
        email: adminData.email,
        status: 'Active',
      });

      toast.success("New admin account created successfully!");
      setAdminData({ username: "", email: "", password: "" });
    } catch (error) {
      toast.error("Failed to create admin account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetData.username || !passwordResetData.newPassword) {
      toast.error("Please enter both username and new password");
      return;
    }

    setIsLoading(true);
    try {
      const user = users.find((u: any) => u.username === passwordResetData.username);
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Use resetUserPasswordAPI for admin password reset
      const success = await resetUserPasswordAPI(user.id, passwordResetData.newPassword);
      
      if (success) {
        toast.success(`Password reset successful for ${passwordResetData.username}!`);
        setPasswordResetData({ username: "", newPassword: "" });
      } else {
        toast.error("Password reset failed");
      }
    } catch (error) {
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure school system settings and administration</p>
      </div>

      {/* School Logo & Branding */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900">School Branding</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-gray-200">
                {schoolLogoPreview ? (
                  <img 
                    src={schoolLogoPreview} 
                    alt="School Logo" 
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-white text-center px-4">School Logo</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-gray-900 mb-3">Upload School Logo</p>
                <input
                  ref={schoolLogoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSchoolLogoUpload}
                  className="hidden"
                />
                <Button 
                  type="button"
                  onClick={() => schoolLogoRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:scale-105 transition-all"
                >
                  <span className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-gray-500 mt-2">Recommended: 512x512px, PNG or JPG</p>
                {schoolLogoFile && (
                  <p className="text-xs text-gray-500 mt-1">Selected: {schoolLogoFile.name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">School Name</Label>
              <Input
                value={brandingData.schoolName}
                onChange={(e) => setBrandingData({ ...brandingData, schoolName: e.target.value })}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">School Motto</Label>
              <Input
                value={brandingData.schoolMotto}
                onChange={(e) => setBrandingData({ ...brandingData, schoolMotto: e.target.value })}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Principal Name</Label>
              <Input
                value={brandingData.principalName}
                onChange={(e) => setBrandingData({ ...brandingData, principalName: e.target.value })}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
            </div>

            <Button onClick={handleSaveBranding} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <span className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Academic Session & Term */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900">Academic Session & Term</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Current Academic Session</Label>
                <Select value={sessionData.currentSession} onValueChange={(value: string) => setSessionData({ ...sessionData, currentSession: value })}>
                  <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="2023/2024" className="text-gray-900">2023/2024</SelectItem>
                    <SelectItem value="2024/2025" className="text-gray-900">2024/2025</SelectItem>
                    <SelectItem value="2025/2026" className="text-gray-900">2025/2026</SelectItem>
                    <SelectItem value="2026/2027" className="text-gray-900">2026/2027</SelectItem>
                    <SelectItem value="2027/2028" className="text-gray-900">2027/2028</SelectItem>
                    <SelectItem value="2028/2029" className="text-gray-900">2028/2029</SelectItem>
                    <SelectItem value="2029/2030" className="text-gray-900">2029/2030</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Current Term</Label>
                <Select value={sessionData.currentTerm} onValueChange={(value: string) => setSessionData({ ...sessionData, currentTerm: value })}>
                  <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="First Term" className="text-gray-900">First Term</SelectItem>
                    <SelectItem value="Second Term" className="text-gray-900">Second Term</SelectItem>
                    <SelectItem value="Third Term" className="text-gray-900">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-gray-700">
                <strong className="text-gray-900">Note:</strong> Changing the session or term will affect all result entries and fee structures. Please ensure all current term results are finalized before updating.
              </p>
            </div>

            <Button onClick={handleUpdateSession} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <span className="w-4 h-4 mr-2" />
              {isLoading ? "Updating..." : "Update Session & Term"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Requirements */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900 flex items-center">
            <span className="w-5 h-5 mr-2" />
            Attendance Requirements
          </h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">First Term Required Days</Label>
                <Input
                  type="number"
                  value={attendanceData['First Term'] === 0 ? '' : attendanceData['First Term'] || ''}
                  onChange={(e) => {
                    hasEditedAttendance.current = true;
                    const newValue = e.target.value;
                    setAttendanceData(prev => ({ 
                      ...prev, 
                      'First Term': newValue === '' ? 0 : parseInt(newValue) || 0 
                    }));
                  }}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                  placeholder="Enter required days"
                />
                <p className="text-xs text-gray-500">Current value: {attendanceData['First Term']} | Display value: {attendanceData['First Term'] === 0 ? '' : attendanceData['First Term'] || ''}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Second Term Required Days</Label>
                <Input
                  type="number"
                  value={attendanceData['Second Term'] === 0 ? '' : attendanceData['Second Term'] || ''}
                  onChange={(e) => {
                    hasEditedAttendance.current = true;
                    const newValue = e.target.value;
                    setAttendanceData(prev => ({ 
                      ...prev, 
                      'Second Term': newValue === '' ? 0 : parseInt(newValue) || 0 
                    }));
                  }}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                  placeholder="Enter required days"
                />
                <p className="text-xs text-gray-500">Total days student must be present</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Third Term Required Days</Label>
                <Input
                  type="number"
                  value={attendanceData['Third Term'] === 0 ? '' : attendanceData['Third Term'] || ''}
                  onChange={(e) => {
                    hasEditedAttendance.current = true;
                    const newValue = e.target.value;
                    setAttendanceData(prev => ({ 
                      ...prev, 
                      'Third Term': newValue === '' ? 0 : parseInt(newValue) || 0 
                    }));
                  }}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                  placeholder="Enter required days"
                />
                <p className="text-xs text-gray-500">Total days student must be present</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-gray-700">
                <strong className="text-gray-900">Note:</strong> These requirements are used to calculate attendance ratios in student reports. The system calculates attendance percentage as (days present / required days) × 100.
              </p>
            </div>

            <Button onClick={handleSaveAttendance} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <span className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Attendance Requirements"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signature Settings */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900 flex items-center">
            <span className="w-5 h-5 mr-2" />
            Signature Settings
          </h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Principal Name</Label>
                <Input
                  value={signatureData.principal_name}
                  onChange={(e) => setSignatureData({ ...signatureData, principal_name: e.target.value })}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Head Teacher Name</Label>
                <Input
                  value={signatureData.head_teacher_name}
                  onChange={(e) => setSignatureData({ ...signatureData, head_teacher_name: e.target.value })}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-gray-700">Principal Signature</Label>
                <div className="space-y-3">
                  <input
                    ref={principalSignatureRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePrincipalSignatureUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => principalSignatureRef.current?.click()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <span className="w-4 h-4 mr-2" />
                    Upload Principal Signature
                  </Button>
                  {principalSignaturePreview && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <img 
                        src={principalSignaturePreview} 
                        alt="Principal Signature" 
                        className="max-h-20 mx-auto"
                      />
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        {principalSignatureFile?.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-gray-700">Head Teacher Signature</Label>
                <div className="space-y-3">
                  <input
                    ref={headTeacherSignatureRef}
                    type="file"
                    accept="image/*"
                    onChange={handleHeadTeacherSignatureUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => headTeacherSignatureRef.current?.click()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <span className="w-4 h-4 mr-2" />
                    Upload Head Teacher Signature
                  </Button>
                  {headTeacherSignaturePreview && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <img 
                        src={headTeacherSignaturePreview} 
                        alt="Head Teacher Signature" 
                        className="max-h-20 mx-auto"
                      />
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        {headTeacherSignatureFile?.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Principal Default Comment</Label>
                <textarea
                  value={signatureData.principal_comment}
                  onChange={(e) => setSignatureData({ ...signatureData, principal_comment: e.target.value })}
                  className="w-full h-20 rounded-xl border border-gray-300 bg-white text-gray-900 p-3 resize-none"
                  placeholder="Default comment for principal approval"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Head Teacher Default Comment</Label>
                <textarea
                  value={signatureData.head_teacher_comment}
                  onChange={(e) => setSignatureData({ ...signatureData, head_teacher_comment: e.target.value })}
                  className="w-full h-20 rounded-xl border border-gray-300 bg-white text-gray-900 p-3 resize-none"
                  placeholder="Default comment for head teacher approval"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-gray-700">
                <strong className="text-gray-900">Note:</strong> Upload signature images for report cards. Supported formats: PNG, JPG, JPEG. Signatures will appear on student result cards when printed or exported.
              </p>
            </div>

            <Button onClick={handleSaveSignature} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <span className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Signature Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Admin Account */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900">Administrator Management</h3>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700">New Admin Username</Label>
                <Input
                  required
                  value={adminData.username}
                  onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                  placeholder="Enter username"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Admin Email</Label>
                <Input
                  required
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@gracelandgombe.edu"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Initial Password</Label>
                <Input
                  required
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Enter secure password"
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? "Creating..." : "Create Admin Account"}
            </Button>
          </form>

          <Separator className="my-6 bg-gray-200" />

          <div className="space-y-4">
            <h4 className="text-gray-900">Password Management</h4>
            <p className="text-gray-600">Reset password for existing users (Admin, Teacher, Accountant, Parent)</p>
            
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                placeholder="Enter username"
                value={passwordResetData.username}
                onChange={(e) => setPasswordResetData({ ...passwordResetData, username: e.target.value })}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
              <Input
                type="password"
                placeholder="Enter new password"
                value={passwordResetData.newPassword}
                onChange={(e) => setPasswordResetData({ ...passwordResetData, newPassword: e.target.value })}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
            </div>
            <Button onClick={handleResetPassword} disabled={isLoading} className="bg-[#FFC107] hover:bg-[#FFC107]/90 text-[#0A2540] rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap px-6">
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Term Begins (Result Sheet) */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-gray-900">Next Term Begins (Result Sheet)</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-gray-600">
              This date is shown on student result sheets as <strong>Next Term Begins</strong>. It is saved per academic year and term.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Academic Year</Label>
                <Input
                  value={currentAcademicYear || ''}
                  disabled
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Term</Label>
                <Input
                  value={currentTerm || ''}
                  disabled
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Next Term Resumption Date</Label>
                <Input
                  type="date"
                  value={nextTermResumptionDate}
                  onChange={(e) => setNextTermResumptionDate(e.target.value)}
                  disabled={isNextTermLoading}
                  className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveNextTermBegins}
                disabled={isNextTermSaving || isNextTermLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:scale-105 transition-all"
              >
                <span className="w-4 h-4 mr-2" />
                {isNextTermSaving ? 'Saving...' : 'Save Next Term Begins'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
