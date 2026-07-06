import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import {
  User,
  UserCheck,
  UserMinus,
  Users,
  Link,
  LinkBreak,
  CheckCircle,
  MagnifyingGlass,
  X,
  Warning
} from "@phosphor-icons/react";

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  level: string;
  class_id: number;
  parent_id: number | null;
  parent_name?: string | null;
  date_of_birth: string;
  profileImage?: string;
}

interface Parent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  occupation?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  profileImage?: string;
}

const LinkStudentParentPage: React.FC = () => {
  const {
    students,
    parents,
    parentStudentLinks,
    loadStudentsFromAPI,
    loadParentsFromAPI,
    loadParentStudentLinksFromAPI,
    linkStudentToParent,
    unlinkStudentFromParent,
    getParentStudents
  } = useSchool();
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [relationshipType, setRelationshipType] = useState<"father" | "mother" | "guardian">("guardian");
  const [notifyParent, setNotifyParent] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const linkInFlightRef = useRef(false);

  const getParentDisplayName = (parent: any) => {
    const first = parent?.first_name ?? parent?.firstName ?? '';
    const last = parent?.last_name ?? parent?.lastName ?? '';
    return `${first} ${last}`.trim();
  };

  const getParentEmail = (parent: any) => {
    return parent?.email ?? '';
  };

  // Load data on component mount
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        loadStudentsFromAPI(),
        loadParentsFromAPI(),
        loadParentStudentLinksFromAPI()
      ]);

      const values = results.map(r => (r.status === 'fulfilled' ? r.value : false));
      const [studentsOk, parentsOk, linksOk] = values as boolean[];

      if (studentsOk && parentsOk && linksOk) {
        toast.success("Data refreshed successfully");
      } else {
        const failed = [
          !studentsOk ? 'students' : null,
          !parentsOk ? 'parents' : null,
          !linksOk ? 'links' : null,
        ].filter(Boolean).join(', ');
        toast.error(`Refresh incomplete: failed to load ${failed}`);
      }
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const linkedStudentIdSet = React.useMemo(() => {
    return new Set(parentStudentLinks.map((l: any) => String(l.student_id)));
  }, [parentStudentLinks]);

  // Helper function to check if student is linked
  const isStudentLinked = (student: Student) => {
    return linkedStudentIdSet.has(String(student.id));
  };

  // Filter students and parents based on search
  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredParents = parents.filter(parent => {
    const q = parentSearch.toLowerCase();
    const name = getParentDisplayName(parent).toLowerCase();
    const email = getParentEmail(parent).toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // Calculate statistics
  const totalStudents = students.length;
  const linkedStudents = linkedStudentIdSet.size;
  const unlinkedStudents = Math.max(0, totalStudents - linkedStudents);
  const linkingProgress = totalStudents > 0 ? (linkedStudents / totalStudents) * 100 : 0;

  const handleLinkStudentParent = async () => {
    if (linkInFlightRef.current || isLinking) {
      return;
    }

    if (!selectedStudent || !selectedParent) {
      toast.error("Please select both a student and a parent to link");
      return;
    }

    // Prevent avoidable API conflicts: detect existing links locally
    const alreadyLinkedToThisParent = parentStudentLinks.some(
      (l: any) => String(l.student_id) === String(selectedStudent.id) && String(l.parent_id) === String(selectedParent.id)
    );

    if (alreadyLinkedToThisParent) {
      toast.error('This student is already linked to the selected parent');
      return;
    }

    const linkedToAnotherParent =
      selectedStudent.parent_id != null && String(selectedStudent.parent_id) !== String(selectedParent.id);

    if (linkedToAnotherParent) {
      toast.error('This student is already linked to another parent. Unlink the student first before linking to a different parent.');
      return;
    }

    setIsLinking(true);
    linkInFlightRef.current = true;
    try {
      const ok = await linkStudentToParent(
        selectedParent.id,
        selectedStudent.id,
        relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1) as 'Father' | 'Mother' | 'Guardian'
      );

      if (!ok) {
        throw new Error('Link operation failed');
      }

      toast.success(`Successfully linked ${selectedStudent.firstName} ${selectedStudent.lastName} with ${getParentDisplayName(selectedParent)}`);
      
      // Links are refreshed inside linkStudentToParent; avoid additional refresh here that can overwrite fresh state.
      
      // Reset selection
      setSelectedStudent(null);
      setSelectedParent(null);
      setRelationshipType("guardian");
    } catch (error: any) {
      toast.error(error.message || "Failed to link student and parent");
    } finally {
      linkInFlightRef.current = false;
      setIsLinking(false);
    }
  };

  const handleUnlinkChild = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student to unlink");
      return;
    }

    setIsUnlinking(true);
    try {
      // Find the parent_id from either student record or parentStudentLinks
      let parentId = selectedStudent.parent_id;
      if (parentId == null) {
        const link = parentStudentLinks.find((link: any) => String(link.student_id) === String(selectedStudent.id));
        if (link) {
          parentId = link.parent_id;
        }
      }
      
      if (parentId == null) {
        toast.error("No parent link found for this student");
        return;
      }
      
      const ok = await unlinkStudentFromParent(Number(parentId), Number(selectedStudent.id));
      if (!ok) {
        throw new Error('Unlink operation failed');
      }

      toast.success(`Successfully unlinked ${selectedStudent.firstName} ${selectedStudent.lastName}`);
      setShowUnlinkDialog(false);
      
      // Links are refreshed inside unlinkStudentFromParent; avoid additional refresh here that can overwrite fresh state.
      
      setSelectedStudent(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to unlink student");
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2 flex items-center gap-3 text-white" style={{ color: 'white' }}>
              <Link weight="bold" className="w-8 h-8" style={{ color: 'white' }} />
              <span style={{ color: 'white' }}>Student-Parent Linking</span>
            </h1>
            <p className="text-[#E0F2FE] text-sm md:text-base max-w-2xl" style={{ color: '#E0F2FE' }}>
              Connect students with their parents/guardians for seamless portal access and real-time progress tracking
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
            <Users weight="bold" className="w-5 h-5" style={{ color: 'white' }} />
            <span className="font-medium" style={{ color: 'white' }}>{totalStudents} Total Students</span>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="ml-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              {isRefreshing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle weight="bold" className="w-4 h-4" style={{ color: 'white' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium">Total Students</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{totalStudents}</p>
            </div>
            <div className="bg-[#0A2540]/10 p-3 rounded-lg">
              <User weight="bold" className="w-5 h-5 text-[#0A2540]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium">Linked Students</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{linkedStudents}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg">
              <UserCheck weight="bold" className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium">Unlinked Students</p>
              <p className="text-lg font-bold text-orange-600 mt-1">{unlinkedStudents}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <UserMinus weight="bold" className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-heading font-bold text-gray-900">Linking Progress</h3>
          <span className="text-xs text-gray-500">{Math.round(linkingProgress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] h-3 rounded-full transition-all duration-300"
            style={{ width: `${linkingProgress}%` }}
          />
        </div>
      </div>

      {/* Main Linking Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0A2540]/5 to-[#0A2540]/10 px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-heading font-bold text-gray-900 flex items-center gap-2">
              <User weight="bold" className="w-4 h-4 text-[#0A2540]" />
              Select Student
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A2540] focus:border-transparent"
              />
            </div>

            {/* Selected Student Display */}
            {selectedStudent && (
              <div className="bg-[#0A2540]/5 border border-[#0A2540]/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0A2540]/10 rounded-full flex items-center justify-center">
                      <User weight="bold" className="w-5 h-5 text-[#0A2540]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{selectedStudent.admissionNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Students List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.map((student) => {
                const isLinked = isStudentLinked(student);
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStudent?.id === student.id
                        ? "border-[#0A2540] bg-[#0A2540]/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User weight="bold" className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{student.admissionNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLinked && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                            Linked
                          </span>
                        )}
                        {selectedStudent?.id === student.id && !isLinked && selectedParent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkStudentParent();
                            }}
                            disabled={isLinking}
                            className="bg-[#0A2540] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#0A2540]/90 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isLinking ? (
                              <>
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                Linking...
                              </>
                            ) : (
                              <>
                                <Link weight="bold" className="w-3 h-3" />
                                Link
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Parent Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#FFD700]/5 to-[#FFD700]/10 px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-heading font-bold text-gray-900 flex items-center gap-2">
              <Users weight="bold" className="w-4 h-4 text-emerald-600" />
              Select Parent
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search parents by name or email..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A2540] focus:border-transparent"
              />
            </div>

            {/* Selected Parent Display */}
            {selectedParent && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Users weight="bold" className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {selectedParent.first_name} {selectedParent.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{selectedParent.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedParent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Parents List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredParents.map((parent) => {
                const linkedStudents = getParentStudents(parent.id);
                return (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParent(parent)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedParent?.id === parent.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users weight="bold" className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {getParentDisplayName(parent) || 'Unknown Parent'}
                          </p>
                          <p className="text-xs text-gray-500">{getParentEmail(parent)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {linkedStudents.length > 0 && (
                          <span className="text-xs bg-[#0A2540]/10 text-[#0A2540] px-2 py-1 rounded-full">
                            {linkedStudents.length} linked
                          </span>
                        )}
                        {selectedParent?.id === parent.id && selectedStudent && !isStudentLinked(selectedStudent) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkStudentParent();
                            }}
                            disabled={isLinking}
                            className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isLinking ? (
                              <>
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                Linking...
                              </>
                            ) : (
                              <>
                                <Link weight="bold" className="w-3 h-3" />
                                Link
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Current Links Display */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CheckCircle weight="bold" className="w-5 h-5 text-emerald-600" />
          Current Student-Parent Links
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {students.filter(student => isStudentLinked(student)).map((student) => {
            // Find parent from either student.parent_id or parentStudentLinks
            let parent = null;
            if (student.parent_id) {
              parent = parents.find(p => p.id === student.parent_id);
            } else {
              const link = parentStudentLinks.find(link => link.student_id === student.id);
              if (link) {
                parent = parents.find(p => p.id === link.parent_id);
              }
            }
            
            if (!parent) return null;
            
            return (
              <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0A2540]/10 rounded-full flex items-center justify-center">
                    <User weight="bold" className="w-5 h-5 text-[#0A2540]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{student.admissionNumber} • {student.level}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400">
                  <Link weight="bold" className="w-4 h-4" />
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users weight="bold" className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {parent.first_name} {parent.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{parent.email}</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {students.filter(student => student.parent_id !== null).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users weight="bold" className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No student-parent links have been created yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Linking Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-heading font-bold text-gray-900 mb-6">Linking Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as "father" | "mother" | "guardian")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A2540] focus:border-transparent"
            >
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="guardian">Guardian</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyParent"
              checked={notifyParent}
              onChange={(e) => setNotifyParent(e.target.checked)}
              className="w-4 h-4 text-[#0A2540] border-gray-300 rounded focus:ring-[#0A2540]"
            />
            <label htmlFor="notifyParent" className="ml-2 text-sm text-gray-700">
              Send notification email to parent
            </label>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleLinkStudentParent}
            disabled={!selectedStudent || !selectedParent || isLinking}
            className="flex-1 bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] text-white px-6 py-3 rounded-lg font-medium hover:from-[#0A2540]/90 hover:to-[#1a3a5c]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLinking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link weight="bold" className="w-5 h-5" />
                Link Student to Parent
              </>
            )}
          </button>

          {selectedStudent && isStudentLinked(selectedStudent) && (
              <button
                onClick={() => setShowUnlinkDialog(true)}
                disabled={isUnlinking}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isUnlinking ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Unlinking...
                  </>
                ) : (
                  <>
                    <LinkBreak weight="bold" className="w-5 h-5" />
                    Unlink Student
                  </>
                )}
              </button>
            )}
        </div>
      </div>

      {/* Unlink Confirmation Dialog */}
      {showUnlinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Warning weight="bold" className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-gray-900">Confirm Unlink</h3>
                  <p className="text-sm text-gray-500">
                  Are you sure you want to unlink {selectedStudent?.firstName} {selectedStudent?.lastName} from their parent?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUnlinkDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlinkChild}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Unlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { LinkStudentParentPage };
