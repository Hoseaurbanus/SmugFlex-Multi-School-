import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import {
  Save,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  School,
  Calendar,
  ClipboardCheck,
  PenTool,
  Shield,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { API_CONFIG } from '../../config/api';
import { tokenManager } from '../../utils/tokenManager';

export function SystemSettingsPage() {
  const hasEditedAttendance = useRef(false);
  
  const {
    currentUser,
    currentAcademicYear,
    currentTerm,
    updateCurrentTermAndYear,
    updateAttendanceRequirements,
    loadAttendanceRequirements,
    schoolSettings,
    updateSchoolSettings,
    loadSchoolSettings,
    createUserAPI,
    resetUserPasswordAPI,
    users,
  } = useSchool();
  
  const hasAccess = currentUser && currentUser.role === 'admin';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const updateSessionData = useCallback(() => {
    setSessionData({
      currentSession: currentAcademicYear || '',
      currentTerm: currentTerm || '',
    });
  }, [currentAcademicYear, currentTerm]);

  useEffect(() => {
    updateSessionData();
  }, [updateSessionData]);

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

  useEffect(() => {
    loadAttendanceRequirementsOnce();
  }, [loadAttendanceRequirementsOnce]);

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

  const updateSignatureData = useCallback(() => {
    if (schoolSettings && Object.keys(schoolSettings).length > 0) {
      setSignatureData((prev) => ({
        ...prev,
        principal_name: schoolSettings.principal_name || '',
        principal_comment: schoolSettings.principal_comment || '',
        head_teacher_name: schoolSettings.head_teacher_name || '',
        head_teacher_comment: schoolSettings.head_teacher_comment || ''
      }));
      
      if (schoolSettings.principal_signature) {
        setPrincipalSignaturePreview(schoolSettings.principal_signature);
      }
      if (schoolSettings.head_teacher_signature) {
        setHeadTeacherSignaturePreview(schoolSettings.head_teacher_signature);
      }
      
      if (schoolSettings.school_logo_url) {
        setSchoolLogoPreview(schoolSettings.school_logo_url);
      }
    }
  }, [schoolSettings]);

  useEffect(() => {
    updateSignatureData();
  }, [updateSignatureData]);

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        loadSchoolSettings().catch(() => null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, loadSchoolSettings]);

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
    return () => { isMounted = false; };
  }, [currentAcademicYear, currentTerm, normalizeDateForInput]);

  const handleSaveNextTermBegins = async () => {
    setIsNextTermSaving(true);
    try {
      await tokenManager.ensureToken(currentUser);
      const token = tokenManager.getToken();
      if (!token) { toast.error('Authentication required'); return; }
      if (!currentAcademicYear || !currentTerm) { toast.error('Academic year and term must be set'); return; }

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const json = await resp.json();
      if (!json || json.success !== true) throw new Error((json as any)?.message || 'Failed to save');

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

  const [adminData, setAdminData] = useState({ username: "", email: "", password: "" });
  const [passwordResetData, setPasswordResetData] = useState({ username: "", newPassword: "" });

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
      loadSchoolSettings().catch(() => null);
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
      const savedTerms = Object.entries(attendanceData)
        .filter(([_, days]) => days > 0)
        .map(([term, days]) => `${term}: ${days} days`)
        .join(', ');
      toast.success(savedTerms ? `Attendance requirements saved! ${savedTerms}` : 'Attendance requirements saved!');
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
      loadSchoolSettings().catch(() => null);
    } catch (error) {
      toast.error("Failed to save signature settings");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = tokenManager.getToken();
      if (!token) { toast.error('Authentication required'); return null; }

      const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.url) return result.data.url;
        toast.error('Upload failed: ' + (result.message || 'Invalid response'));
      } else {
        toast.error('Upload failed: Server error');
      }
    } catch (error) {
      toast.error('Upload failed: Network error');
    }
    return null;
  };

  const handlePrincipalSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { if (file) toast.error('Please select an image file'); return; }
    setPrincipalSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPrincipalSignaturePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    const url = await uploadFile(file);
    if (url) { setPrincipalSignaturePreview(url); toast.success('Principal signature uploaded!'); }
  };

  const handleHeadTeacherSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { if (file) toast.error('Please select an image file'); return; }
    setHeadTeacherSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setHeadTeacherSignaturePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    const url = await uploadFile(file);
    if (url) { setHeadTeacherSignaturePreview(url); toast.success('Head teacher signature uploaded!'); }
  };

  const handleSchoolLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { if (file) toast.error('Please select an image file'); return; }
    setSchoolLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSchoolLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    const url = await uploadFile(file);
    if (url) { setSchoolLogoPreview(url); toast.success('Logo uploaded successfully!'); }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const existingUser = users.find((u: any) => u.username === adminData.username);
      if (existingUser) { toast.error("Username already exists."); return; }

      await createUserAPI({
        username: adminData.username,
        password: adminData.password,
        role: 'admin',
        linked_id: 0,
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
      if (!user) { toast.error("User not found"); return; }

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

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center py-12 px-8 bg-card border border-border rounded-2xl shadow-lg">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You do not have permission to access System Settings.
            This page requires administrator-level privileges.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">System Settings</h1>
        <div className="w-10 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-2 mb-1" />
        <p className="text-sm text-muted-foreground">Configure school system settings and administration</p>
      </div>

      {/* School Branding */}
      <SettingsCard icon={<School className="w-5 h-5" />} title="School Branding" color="indigo">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
            {schoolLogoPreview ? (
              <img src={schoolLogoPreview} alt="School Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 w-full text-center sm:text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload School Logo</p>
            <input ref={schoolLogoRef} type="file" accept="image/*" onChange={handleSchoolLogoUpload} className="hidden" />
            <Button type="button" onClick={() => schoolLogoRef.current?.click()} variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" /> Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Recommended: 512x512px, PNG or JPG</p>
            {schoolLogoFile && <p className="text-xs text-muted-foreground mt-1">Selected: {schoolLogoFile.name}</p>}
          </div>
        </div>

        <div className="grid gap-4 mt-4">
          <FormField label="School Name">
            <Input value={brandingData.schoolName} onChange={(e) => setBrandingData({ ...brandingData, schoolName: e.target.value })} className="admin-input" />
          </FormField>
          <FormField label="School Motto">
            <Input value={brandingData.schoolMotto} onChange={(e) => setBrandingData({ ...brandingData, schoolMotto: e.target.value })} className="admin-input" />
          </FormField>
          <FormField label="Principal Name">
            <Input value={brandingData.principalName} onChange={(e) => setBrandingData({ ...brandingData, principalName: e.target.value })} className="admin-input" />
          </FormField>
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton onClick={handleSaveBranding} loading={isLoading} label="Save Branding" />
        </div>
      </SettingsCard>

      {/* Academic Session & Term */}
      <SettingsCard icon={<Calendar className="w-5 h-5" />} title="Academic Session & Term" color="violet">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Current Academic Session">
            <Select value={sessionData.currentSession} onValueChange={(value: string) => setSessionData({ ...sessionData, currentSession: value })}>
              <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['2023/2024','2024/2025','2025/2026','2026/2027','2027/2028','2028/2029','2029/2030'].map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Current Term">
            <Select value={sessionData.currentTerm} onValueChange={(value: string) => setSessionData({ ...sessionData, currentTerm: value })}>
              <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="First Term">First Term</SelectItem>
                <SelectItem value="Second Term">Second Term</SelectItem>
                <SelectItem value="Third Term">Third Term</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Changing the session or term will affect all result entries and fee structures.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton onClick={handleUpdateSession} loading={isLoading} label="Update Session & Term" />
        </div>
      </SettingsCard>

      {/* Attendance Requirements */}
      <SettingsCard icon={<ClipboardCheck className="w-5 h-5" />} title="Attendance Requirements" color="amber">
        <div className="grid sm:grid-cols-3 gap-4">
          {(['First Term', 'Second Term', 'Third Term'] as const).map((term) => (
            <FormField key={term} label={`${term} Required Days`}>
              <Input
                type="number"
                value={attendanceData[term] === 0 ? '' : attendanceData[term] || ''}
                onChange={(e) => {
                  hasEditedAttendance.current = true;
                  const val = e.target.value;
                  setAttendanceData(prev => ({ ...prev, [term]: val === '' ? 0 : parseInt(val) || 0 }));
                }}
                className="admin-input"
                placeholder="Enter required days"
              />
            </FormField>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Used to calculate attendance ratios in student reports.
            Formula: (days present / required days) × 100.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton onClick={handleSaveAttendance} loading={isLoading} label="Save Attendance" />
        </div>
      </SettingsCard>

      {/* Signature Settings */}
      <SettingsCard icon={<PenTool className="w-5 h-5" />} title="Signature Settings" color="pink">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Principal Name">
            <Input value={signatureData.principal_name} onChange={(e) => setSignatureData({ ...signatureData, principal_name: e.target.value })} className="admin-input" />
          </FormField>
          <FormField label="Head Teacher Name">
            <Input value={signatureData.head_teacher_name} onChange={(e) => setSignatureData({ ...signatureData, head_teacher_name: e.target.value })} className="admin-input" />
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <SignatureUpload label="Principal Signature" inputRef={principalSignatureRef} preview={principalSignaturePreview} file={principalSignatureFile} onChange={handlePrincipalSignatureUpload} />
          <SignatureUpload label="Head Teacher Signature" inputRef={headTeacherSignatureRef} preview={headTeacherSignaturePreview} file={headTeacherSignatureFile} onChange={handleHeadTeacherSignatureUpload} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <FormField label="Principal Default Comment">
            <textarea value={signatureData.principal_comment} onChange={(e) => setSignatureData({ ...signatureData, principal_comment: e.target.value })} className="admin-input min-h-[72px] resize-none" placeholder="Default comment for principal approval" />
          </FormField>
          <FormField label="Head Teacher Default Comment">
            <textarea value={signatureData.head_teacher_comment} onChange={(e) => setSignatureData({ ...signatureData, head_teacher_comment: e.target.value })} className="admin-input min-h-[72px] resize-none" placeholder="Default comment for head teacher approval" />
          </FormField>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Upload signature images for report cards. Supported formats: PNG, JPG, JPEG.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton onClick={handleSaveSignature} loading={isLoading} label="Save Signatures" />
        </div>
      </SettingsCard>

      {/* Administrator Management */}
      <SettingsCard icon={<Shield className="w-5 h-5" />} title="Administrator Management" color="emerald">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="New Admin Username">
              <Input required value={adminData.username} onChange={(e) => setAdminData({ ...adminData, username: e.target.value })} placeholder="Enter username" className="admin-input" />
            </FormField>
            <FormField label="Admin Email">
              <Input required type="email" value={adminData.email} onChange={(e) => setAdminData({ ...adminData, email: e.target.value })} placeholder="admin@school.edu" className="admin-input" />
            </FormField>
          </div>
          <FormField label="Initial Password">
            <div className="relative">
              <Input required type={showPassword ? "text" : "password"} value={adminData.password} onChange={(e) => setAdminData({ ...adminData, password: e.target.value })} placeholder="Enter secure password" className="admin-input pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>
          <div className="flex justify-end">
            <SaveButton onClick={() => {}} loading={isLoading} label="Create Admin Account" type="submit" />
          </div>
        </form>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-foreground text-sm">Password Management</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Reset password for existing users</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Enter username" value={passwordResetData.username} onChange={(e) => setPasswordResetData({ ...passwordResetData, username: e.target.value })} className="admin-input" />
            <div className="relative">
              <Input type={showResetPassword ? "text" : "password"} placeholder="Enter new password" value={passwordResetData.newPassword} onChange={(e) => setPasswordResetData({ ...passwordResetData, newPassword: e.target.value })} className="admin-input pr-10" />
              <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showResetPassword ? "Hide password" : "Show password"}>
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={handleResetPassword} loading={isLoading} label="Reset Password" variant="accent" />
          </div>
        </div>
      </SettingsCard>

      {/* Next Term Begins */}
      <SettingsCard icon={<Clock className="w-5 h-5" />} title="Next Term Begins (Result Sheet)" color="cyan">
        <p className="text-xs text-muted-foreground mb-4">
          This date is shown on student result sheets as <strong className="text-foreground">Next Term Begins</strong>. Saved per academic year and term.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <FormField label="Academic Year">
            <Input value={currentAcademicYear || ''} disabled className="admin-input opacity-60" />
          </FormField>
          <FormField label="Term">
            <Input value={currentTerm || ''} disabled className="admin-input opacity-60" />
          </FormField>
          <FormField label="Next Term Resumption Date">
            <Input type="date" value={nextTermResumptionDate} onChange={(e) => setNextTermResumptionDate(e.target.value)} disabled={isNextTermLoading} className="admin-input" />
          </FormField>
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton onClick={handleSaveNextTermBegins} loading={isNextTermSaving || isNextTermLoading} label="Save Next Term Begins" />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ── Helper Components ────────────────────────────────── */

function SettingsCard({ icon, title, color, children }: {
  icon: React.ReactNode;
  title: string;
  color: 'indigo' | 'violet' | 'amber' | 'pink' | 'emerald' | 'cyan';
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'from-primary/10 to-primary/5 border-primary/20',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    pink: 'from-pink-500/10 to-pink-500/5 border-pink-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
  };
  const iconColorMap: Record<string, string> = {
    indigo: 'text-primary',
    violet: 'text-violet-500',
    amber: 'text-amber-500',
    pink: 'text-pink-500',
    emerald: 'text-emerald-500',
    cyan: 'text-cyan-500',
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${colorMap[color]}`} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
            <span className={iconColorMap[color]}>{icon}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="admin-label">{label}</Label>
      {children}
    </div>
  );
}

function SignatureUpload({ label, inputRef, preview, file, onChange }: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  preview: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="admin-label">{label}</Label>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <Button type="button" onClick={() => inputRef.current?.click()} variant="outline" size="sm" className="w-full sm:w-auto">
        <Upload className="w-4 h-4 mr-1.5" /> Upload Signature
      </Button>
      {preview && (
        <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
          <img src={preview} alt={label} className="max-h-14 mx-auto object-contain" />
          {file && <p className="text-xs text-muted-foreground mt-1.5 text-center truncate">{file.name}</p>}
        </div>
      )}
    </div>
  );
}

function SaveButton({ onClick, loading, label, variant = 'default', type = 'button' }: {
  onClick: () => void;
  loading: boolean;
  label: string;
  variant?: 'default' | 'accent';
  type?: 'button' | 'submit';
}) {
  if (variant === 'accent') {
    return (
      <Button type={type} onClick={onClick} disabled={loading} className="bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-semibold">
        {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
        {loading ? 'Saving...' : label}
      </Button>
    );
  }
  return (
    <Button type={type} onClick={onClick} disabled={loading} className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold">
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
      {loading ? 'Saving...' : label}
    </Button>
  );
}
