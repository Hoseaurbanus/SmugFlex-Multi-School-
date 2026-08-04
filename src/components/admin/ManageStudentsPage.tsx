import { Plus, Link, Eye, Pencil, Trash2, User, RefreshCw, Users, Filter, List, Power, BookOpen, Lock, Unlock } from 'lucide-react';
import React, { useState, useRef, useMemo, useEffect, lazy, Suspense } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Student } from "../../types/school";
import { useSchool } from "../../contexts/SchoolContext";
import { API_CONFIG } from '../../config/api';
import { tokenManager } from "../../utils/tokenManager";
import { StudentCard } from "./manage-students/StudentCard";
import { EditStudentDialog } from "./manage-students/EditStudentDialog";
import { StudentTable } from "./manage-students/StudentTable";
import { ConfirmationDialogs } from "./manage-students/ConfirmationDialogs";
import { LinkGuardianDialog } from "./manage-students/LinkGuardianDialog";
import { FiltersBar } from "./manage-students/FiltersBar";
import { Pagination, BulkActionsBar } from "./manage-students/Pagination";

const AddStudentForm = lazy(() => import('./AddStudentFormSimple'));

interface ManageStudentsPageProps {
  onNavigateToLink?: () => void;
}

export function ManageStudentsPageMobile({ onNavigateToLink: _onNavigateToLink }: ManageStudentsPageProps) {
  const {
    students,
    parents,
    classes,
    parentStudentLinks,
    scores,
    attendances,
    compiledResults,
    updateStudent,
    deleteStudent,
    deleteBulkStudents,
    refreshStudents,
    currentUser,
    linkStudentToParent,
    unlinkStudentFromParent
  } = useSchool();

  const getStudentPhotoCandidates = (s: any): string[] => {
    const raw = s?.photo_url || s?.photoUrl || s?.photoURL || s?.passport_photo || s?.passportPhoto;
    if (!raw || typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    let apiOrigin = '';
    try { apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : ''; } catch { apiOrigin = ''; }
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
    const candidates = [
      appOrigin ? `${appOrigin}${normalizedPath}` : '',
      apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
      trimmed,
    ].filter(Boolean);
    return Array.from(new Set(candidates));
  };

  const handleStudentPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, s: any) => {
    const img = e.currentTarget;
    const candidates = getStudentPhotoCandidates(s);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkGuardianDialogOpen, setLinkGuardianDialogOpen] = useState(false);
  const [_uploadPassportDialogOpen, setUploadPassportDialogOpen] = useState(false);
  const [_resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const editPassportInputRef = useRef<HTMLInputElement>(null);

  const [editFormData, setEditFormData] = useState({
    first_name: "", last_name: "", other_name: "",
    gender: "Male" as "Male" | "Female",
    date_of_birth: "", admission_number: "", class_id: "", level: "",
  });
  const [editPassportFile, setEditPassportFile] = useState<File | null>(null);

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students) || students.length === 0) return [];
    return students.filter((student: Student) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.admissionNumber.toLowerCase().includes(searchLower);
      const studentClass = Array.isArray(classes) ? classes.find(c => c.id === student.class_id) : null;
      const studentLevel = studentClass ? studentClass.level : student.level;
      const matchesClass = filterClass === "All" || studentClass?.name === filterClass;
      const matchesLevel = filterLevel === "All" || studentLevel === filterLevel;
      return matchesSearch && matchesClass && matchesLevel;
    });
  }, [students, searchTerm, filterClass, filterLevel, classes]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterClass, filterLevel]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredStudents.length / pageSize)), [filteredStudents.length, pageSize]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  useEffect(() => {
    const filteredIdSet = new Set(filteredStudents.map(s => s.id));
    setSelectedStudents(prev => {
      if (isSelectAll) return filteredStudents.map(s => s.id);
      return prev.filter(id => filteredIdSet.has(id));
    });
  }, [filteredStudents, isSelectAll]);

  const stats = useMemo(() => {
    if (!Array.isArray(students)) return { total: 0, active: 0, primary: 0, secondary: 0 };
    const classLevels = Array.isArray(classes) ? classes.map(c => c.level).filter(Boolean) : [];
    const primaryLevels = classLevels.length > 0
      ? classLevels.filter(l => /^(Grade|KG|Nursery|Primary)/i.test(l))
      : ['KG 1', 'KG 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    const secondaryLevels = classLevels.length > 0
      ? classLevels.filter(l => /^(JSS|SSS|JS|SS|J\.S\.S\.|S\.S\.S\.)/i.test(l))
      : ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    const getClassLevel = (s: Student) => {
      const studentClass = Array.isArray(classes) ? classes.find(c => c.id === s.class_id) : null;
      return studentClass ? studentClass.level : s.level;
    };
    return {
      total: students.length,
      active: students.filter(s => s.status === "Active").length,
      primary: students.filter(s => primaryLevels.includes(getClassLevel(s))).length,
      secondary: students.filter(s => secondaryLevels.includes(getClassLevel(s))).length,
    };
  }, [students, classes]);

  const levels = ["All", ...(Array.isArray(classes) ? Array.from(new Set(classes.map(c => c.level))) : [])];
  const classNames = ["All", ...(Array.isArray(classes) ? Array.from(new Set(classes.map(c => c.name))) : [])];

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('You do not have permission to access this page');
      return;
    }
    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshStudents();
      } catch (error) {
        toast.error('Failed to load students data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  const getParentInfo = (student: Student) => {
    if (student.parent_name) {
      const parent = Array.isArray(parents) ? parents.find(p => `${p.firstName} ${p.lastName}` === student.parent_name) : null;
      return { name: student.parent_name, username: parent?.email?.split('@')[0] || "", phone: parent?.phone || "", email: parent?.email || "" };
    }
    const parentLink = Array.isArray(parentStudentLinks) ? parentStudentLinks.find(link => link.student_id === student.id) : null;
    if (!parentLink) return { name: "", username: "", phone: "", email: "" };
    const parent = Array.isArray(parents) ? parents.find(p => p.id === parentLink.parent_id) : null;
    if (!parent || !parent.phone?.trim()) return { name: "", username: "", phone: "", email: "" };
    return { name: `${parent.firstName} ${parent.lastName}`, username: parent.email?.split('@')[0] || "", phone: parent.phone || "", email: parent.email || "" };
  };

  const createDataBackup = async () => {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        students: students.map(s => ({ id: s.id, admissionNumber: s.admissionNumber, firstName: s.firstName, lastName: s.lastName, status: s.status }))
      };
      localStorage.setItem('students_backup', JSON.stringify(backup));
      return true;
    } catch { return false; }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    const backupSuccess = await createDataBackup();
    if (!backupSuccess) { toast.error('Could not create backup. Deletion cancelled for safety.'); return; }
    setActionLoading("delete");
    try {
      await deleteStudent(selectedStudent.id);
      toast.success(`Student "${selectedStudent.firstName} ${selectedStudent.lastName}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      await refreshStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete student. Data backup was created for safety.');
    } finally { setActionLoading(null); }
  };

  const handleView = (student: Student) => { setSelectedStudent(student); setViewDialogOpen(true); };
  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    const studentClass = Array.isArray(classes) ? classes.find(c => c.id === student.class_id) : null;
    setEditFormData({
      first_name: student.firstName, last_name: student.lastName, other_name: student.otherName || "",
      date_of_birth: student.date_of_birth || "", admission_number: student.admissionNumber,
      gender: student.gender, class_id: String(student.class_id || ''), level: studentClass?.level || student.level || '',
    });
    setEditPassportFile(null);
    setEditDialogOpen(true);
  };
  const handleSelectStudent = (studentId: number) => {
    setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };
  const handleSelectAll = () => {
    if (isSelectAll) { setSelectedStudents([]); setIsSelectAll(false); }
    else { setSelectedStudents(filteredStudents.map(student => student.id)); setIsSelectAll(true); }
  };
  const openDeleteDialog = (student: Student) => { setSelectedStudent(student); setDeleteDialogOpen(true); };

  const handleToggleStatus = async (student: Student) => {
    const newStatus: 'Active' | 'Inactive' | 'Graduated' | 'Transferred' = student.status === 'Active' ? 'Inactive' : 'Active';
    if (newStatus === 'Inactive') {
      const hasScores = scores.some(s => s.student_id === student.id);
      const hasAttendance = attendances.some(a => a.student_id === student.id);
      const hasCompiledResults = compiledResults.some(cr => cr.student_id === student.id);
      if (hasScores || hasAttendance || hasCompiledResults) {
        toast.error(`Cannot deactivate ${student.firstName} ${student.lastName}: Student has existing records`);
        return;
      }
    }
    try {
      setActionLoading(`status-${student.id}`);
      await updateStudent(student.id, { status: newStatus });
      toast.success(`Student ${student.firstName} ${student.lastName} ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      await refreshStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update student status');
    } finally { setActionLoading(null); }
  };

  const unlinkStudent = async (student: Student) => { setSelectedStudent(student); setUnlinkDialogOpen(true); };
  const confirmUnlinkStudent = async () => {
    if (!selectedStudent) return;
    setUnlinkingStudentId(selectedStudent.id);
    try {
      const link = Array.isArray(parentStudentLinks) ? parentStudentLinks.find((l: any) => String(l.student_id) === String(selectedStudent.id)) : null;
      if (!link?.parent_id) { toast.error('This student is not linked to any parent'); return; }
      const ok = await unlinkStudentFromParent(Number(link.parent_id), Number(selectedStudent.id));
      if (!ok) { toast.error('Failed to unlink guardian'); return; }
      toast.success(`Successfully unlinked ${selectedStudent.firstName} ${selectedStudent.lastName} from parent`);
      await refreshStudents();
    } catch { toast.error('Failed to unlink student'); }
    finally { setUnlinkingStudentId(null); setUnlinkDialogOpen(false); }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshStudents(); toast.success("Student list refreshed successfully"); }
    catch { toast.error('Failed to refresh student list'); }
    finally { setIsRefreshing(false); }
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    try {
      setActionLoading('edit');
      if (editPassportFile) {
        await tokenManager.ensureToken(currentUser);
        const token = tokenManager.getToken();
        const formData = new FormData();
        formData.append('passport', editPassportFile);
        formData.append('student_id', selectedStudent.id.toString());
        const uploadUrl = `${new URL(API_CONFIG.BASE_URL).origin}${new URL(API_CONFIG.BASE_URL).pathname.replace(/\/?api\/?$/, '')}/api/upload-student-photo.php`;
        const photoResponse = await fetch(uploadUrl, {
          method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: formData
        });
        if (!photoResponse.ok) throw new Error('Failed to upload photo');
      }
      await updateStudent(selectedStudent.id, {
        firstName: editFormData.first_name, lastName: editFormData.last_name, otherName: editFormData.other_name,
        gender: editFormData.gender, date_of_birth: editFormData.date_of_birth,
        class_id: editFormData.class_id ? Number(editFormData.class_id) : selectedStudent.class_id,
        level: editFormData.level || selectedStudent.level,
      });
      toast.success('Student updated successfully');
      setEditDialogOpen(false);
      setEditPassportFile(null);
      await refreshStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update student');
    } finally { setActionLoading(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-heading font-bold text-gray-900">Manage Students</h1>
              <p className="text-sm text-gray-600">View and manage all students</p>
            </div>
            <Button onClick={() => setMobileActionsOpen(!mobileActionsOpen)} size="sm" variant="outline" className="lg:hidden">
              <List className="w-3 h-3" />
            </Button>
          </div>

          {mobileActionsOpen && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={() => setAddStudentDialogOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-2 h-8">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
              <Button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} size="sm" variant="outline" className="text-xs px-3 py-2 h-8">
                <Filter className="w-3 h-3 mr-1" />Filters
              </Button>
              <Button onClick={handleManualRefresh} disabled={isRefreshing} size="sm" variant="outline" aria-label="Refresh student list" className="text-xs px-3 py-2 h-8">
                {isRefreshing ? <div className="w-3 h-3 animate-spin rounded-full border border-gray-300 border-t-emerald-600" /> : <RefreshCw className="w-3 h-3" />}
              </Button>
            </div>
          )}

          <div className="hidden lg:flex items-center justify-between">
            <div className="flex gap-2">
              <Button onClick={() => setAddStudentDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-sm px-4 py-2 h-9">
                <Plus className="w-4 h-4 mr-2" />Add Student
              </Button>
              <Button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} variant="outline" className="text-sm px-4 py-2 h-9">
                <Filter className="w-4 h-4 mr-2" />Filters
              </Button>
              <Button onClick={handleManualRefresh} disabled={isRefreshing} variant="outline" className="text-sm px-4 py-2 h-9">
                {isRefreshing ? <div className="w-4 h-4 animate-spin rounded-full border border-gray-300 border-t-emerald-600 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'card' | 'table')}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card View</SelectItem>
                  <SelectItem value="table">Table View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <FiltersBar
          searchTerm={searchTerm} onSearchChange={setSearchTerm}
          filterLevel={filterLevel} onLevelChange={setFilterLevel}
          filterClass={filterClass} onClassChange={setFilterClass}
          levels={levels} classNames={classNames}
          filteredCount={filteredStudents.length} totalCount={students.length}
          onClear={() => { setSearchTerm(""); setFilterClass("All"); setFilterLevel("All"); }}
        />
      )}

      <div className="px-4 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-[#FFD700]/10', icon: Users, iconColor: 'text-[#0A2540]' },
            { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Power, iconColor: 'text-emerald-600' },
            { label: 'Primary', value: stats.primary, color: 'text-[#0A2540]', bg: 'bg-[#0A2540]/10', icon: BookOpen, iconColor: 'text-[#0A2540]' },
            { label: 'Secondary', value: stats.secondary, color: 'text-yellow-600', bg: 'bg-yellow-100', icon: BookOpen, iconColor: 'text-yellow-600' },
          ].map((stat) => (
            <div key={stat.label} className="section-band">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <BulkActionsBar
          selectedCount={selectedStudents.length}
          onClear={() => { setSelectedStudents([]); setIsSelectAll(false); }}
          onDelete={() => { if (selectedStudents.length > 0) setBulkDeleteDialogOpen(true); }}
          actionLoading={actionLoading}
        />

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-6 h-6 animate-spin rounded-full border border-gray-300 border-t-[#0A2540] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {viewMode === 'card' ? (
              <div>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Students Found</h3>
                    <p className="text-gray-600 mb-4">{students.length === 0 ? 'No students in database' : 'Try adjusting your filters'}</p>
                    <Button onClick={() => setAddStudentDialogOpen(true)} className="bg-[#0A2540] hover:bg-[#082030]">
                      <Plus className="w-4 h-4 mr-2" />Add First Student
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
                      <button
                        role="checkbox"
                        aria-checked={isSelectAll}
                        aria-label="Select all students"
                        onClick={handleSelectAll}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${isSelectAll ? 'bg-[#0A2540] border-[#0A2540]' : 'border-gray-300'}`}
                      >
                        {isSelectAll && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                      <span className="text-sm font-medium text-gray-700">Select All ({filteredStudents.length} students)</span>
                    </div>
                    {paginatedStudents.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        isSelected={selectedStudents.includes(student.id)}
                        hasRecords={scores.some(s => s.student_id === student.id) || attendances.some(a => a.student_id === student.id) || compiledResults.some(cr => cr.student_id === student.id)}
                        parentInfo={getParentInfo(student)}
                        onSelect={handleSelectStudent}
                        onView={handleView}
                        onEdit={handleEdit}
                        onToggleStatus={handleToggleStatus}
                        onDelete={openDeleteDialog}
                        onLinkGuardian={(s) => { setSelectedStudent(s); setLinkGuardianDialogOpen(true); }}
                        onUnlinkGuardian={unlinkStudent}
                        onUploadPhoto={(s) => { setSelectedStudent(s); setUploadPassportDialogOpen(true); }}
                        onResetPassword={(s) => { setSelectedStudent(s); setResetPasswordDialogOpen(true); }}
                        parentStudentLinks={parentStudentLinks}
                      />
                    ))}
                    <Pagination
                      filteredCount={filteredStudents.length} currentPage={currentPage} totalPages={totalPages}
                      pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="block">
                {/* Mobile Card View inside table mode */}
                <div className="md:hidden space-y-3 p-4">
                  {paginatedStudents.map((student) => (
                    <div key={student.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleSelectStudent(student.id)} className="rounded border-gray-300" />
                          <div>
                            <div className="font-medium">{student.lastName}, {student.firstName}</div>
                            {student.otherName && <div className="text-sm text-gray-500">{student.otherName}</div>}
                          </div>
                        </div>
                        <Badge className={student.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>
                          {student.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div><span className="text-gray-500">Reg No:</span> <span className="font-mono">{student.admissionNumber}</span></div>
                        <div><span className="text-gray-500">Class:</span> <Badge variant="outline">{student.className}</Badge></div>
                        <div className="col-span-2"><span className="text-gray-500">Parent:</span> {getParentInfo(student).name || 'No Parent'}</div>
                      </div>
                      <div className="flex gap-1 border-t pt-2">
                        <Button size="sm" variant="ghost" aria-label="View student" onClick={() => handleView(student)} className="h-8 w-8 p-0"><Eye className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Edit student" onClick={() => handleEdit(student)} className="h-8 w-8 p-0"><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" aria-label={student.status === 'Active' ? 'Deactivate student' : 'Activate student'} onClick={() => handleToggleStatus(student)}
                          disabled={student.status === 'Active' && (scores.some(s => s.student_id === student.id) || attendances.some(a => a.student_id === student.id) || compiledResults.some(cr => cr.student_id === student.id))}
                          className="h-8 w-8 p-0">
                          {student.status === 'Active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Delete student" onClick={() => openDeleteDialog(student)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <StudentTable
                  paginatedStudents={paginatedStudents} selectedStudents={selectedStudents}
                  onSelectStudent={handleSelectStudent} onView={handleView} onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus} onDelete={openDeleteDialog}
                  getParentInfo={getParentInfo} scores={scores} attendances={attendances} compiledResults={compiledResults}
                />

                <Pagination
                  filteredCount={filteredStudents.length} currentPage={currentPage} totalPages={totalPages}
                  pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* View Dialog */}
      {selectedStudent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>View detailed information about the selected student</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><p className="font-medium">{selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.otherName || ''}</p></div>
              <div><Label>Admission Number</Label><p className="font-medium">{selectedStudent.admissionNumber}</p></div>
              <div><Label>Class</Label><p className="font-medium">{selectedStudent.className}</p></div>
              <div><Label>Status</Label>
                <Badge className={selectedStudent.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>
                  {selectedStudent.status}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Student Dialog */}
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Register a new student in the system</DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center py-8"><div className="w-6 h-6 animate-spin rounded-full border border-gray-300 border-t-[#0A2540]"></div><span className="ml-2">Loading form...</span></div>}>
            <AddStudentForm
              onSuccess={async () => { setAddStudentDialogOpen(false); await refreshStudents(); toast.success('Student registered successfully!'); }}
              onClose={() => setAddStudentDialogOpen(false)}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <EditStudentDialog
        open={editDialogOpen} onOpenChange={setEditDialogOpen} selectedStudent={selectedStudent}
        editFormData={editFormData} onFormDataChange={setEditFormData}
        editPassportFile={editPassportFile} onPassportFileChange={setEditPassportFile}
        editPassportInputRef={editPassportInputRef} classes={classes}
        onSave={handleSaveEdit} actionLoading={actionLoading}
        getStudentPhotoCandidates={getStudentPhotoCandidates} handleStudentPhotoError={handleStudentPhotoError}
      />

      <LinkGuardianDialog
        open={linkGuardianDialogOpen} onOpenChange={setLinkGuardianDialogOpen}
        selectedStudent={selectedStudent} selectedParentId={selectedParentId}
        onParentChange={setSelectedParentId} parents={parents} parentStudentLinks={parentStudentLinks}
        onLink={async () => {
          if (!selectedStudent || !selectedParentId) return;
          try {
            setActionLoading('link-guardian');
            await linkStudentToParent(parseInt(selectedParentId), selectedStudent.id);
            toast.success('Student linked to guardian successfully');
            setLinkGuardianDialogOpen(false);
            setSelectedParentId(null);
            await refreshStudents();
          } catch { toast.error('Failed to link guardian'); }
          finally { setActionLoading(null); }
        }}
        actionLoading={actionLoading}
      />

      <ConfirmationDialogs
        deleteDialogOpen={deleteDialogOpen} onDeleteDialogChange={setDeleteDialogOpen}
        bulkDeleteDialogOpen={bulkDeleteDialogOpen} onBulkDeleteDialogChange={setBulkDeleteDialogOpen}
        unlinkDialogOpen={unlinkDialogOpen} onUnlinkDialogChange={setUnlinkDialogOpen}
        selectedStudent={selectedStudent} selectedStudents={selectedStudents}
        actionLoading={actionLoading} onDelete={handleDelete}
        onBulkDelete={async () => {
          try {
            setActionLoading('bulk-delete');
            await deleteBulkStudents(selectedStudents);
            toast.success(`${selectedStudents.length} student(s) deleted successfully`);
            setSelectedStudents([]);
            setIsSelectAll(false);
            await refreshStudents();
          } catch { toast.error('Failed to delete selected students'); }
          finally { setActionLoading(null); setBulkDeleteDialogOpen(false); }
        }}
        onUnlink={confirmUnlinkStudent}
      />
    </div>
  );
}

export { ManageStudentsPageMobile as ManageStudentsPage };
