import { useState, useEffect, useMemo } from "react";
import { User, Calendar, Award, Download, Eye, Search } from 'lucide-react';
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { generatePDFFromData, generateCumulativePDF } from '../../utils/pdfGenerator';
import { FullPageResultView } from "../shared/FullPageResultView";
import { CumulativeResultSheet } from "../CumulativeResultSheet";
import { useSchool } from "../../contexts/SchoolContext";

interface Child {
  id: number;
  firstName: string;
  otherName?: string;
  lastName: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  classLevel: string;
  gender: string;
  photoUrl?: string;
  dateOfBirth: string;
  address: string;
  parentContact: string;
  enrollmentDate: string;
  status: string;
  recentActivities: any[];
  feeBalance: number;
  totalFees: number;
}

export function MyChildrenPage() {
  const { 
    currentUser, 
    parents, 
    getParentChildren,
    getParentChildrenFromAPI,
    compiledResults,
    scores,
    loadParentsFromAPI,
    loadCompiledResultsFromAPI,
    loadClassesFromAPI,
    loadSchoolSettings,
    currentTerm,
    currentAcademicYear,
    classes,
    schoolSettings,
    teachers,
    affectiveDomains,
    psychomotorDomains,
    cumulativeResults,
    loadCumulativeResultsFromAPI,
    loadingCumulative,
  } = useSchool();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
  const [_showFilters, _setShowFilters] = useState(false);
  const [cumulativeViewChild, setCumulativeViewChild] = useState<Child | null>(null);

  const currentParent = currentUser && parents.length > 0 ? parents.find((p) => p.id === currentUser?.linked_id) : null;
  
  let parentName = currentUser?.username || "Parent";
  if (currentParent && currentParent.firstName && currentParent.lastName) {
    parentName = `${currentParent.firstName} ${currentParent.lastName}`;
  }

  // Get approved results for a specific child - same logic as admin
  const getChildApprovedResults = (childId: number) => {
    return compiledResults.filter(result => 
      result.student_id === childId && 
      result.status === 'Approved'
    );
  };

  // Get students with results - EXACT same as admin ResultsManagementPage
  const filteredResults = useMemo(() => {
    // Use same filtering as admin for current term/year
    let allResults = compiledResults;

    // Parents must only see results for their linked children
    const linkedChildIds = new Set((children || []).map(c => c.id));
    if (linkedChildIds.size > 0) {
      allResults = allResults.filter((r: any) => linkedChildIds.has(r.student_id));
    } else {
      allResults = [];
    }

    // Filter by status - same as admin approved tab
    let results = allResults.filter((r: any) => r.status === "Approved");

    // Only enforce term/year when they are available in context.
    if (currentTerm && currentAcademicYear) {
      results = results.filter(
        (r: any) =>
          r.term === currentTerm &&
          r.academic_year === currentAcademicYear
      );
    }

    return results;
  }, [compiledResults, currentTerm, currentAcademicYear, children]);

  // Get students with results - EXACT same as admin
  const _studentsWithResults = useMemo(() => {
    return filteredResults
      .map((result: any) => {
        const child = (children || []).find((c: any) => Number(c.id) === Number(result.student_id));
        // Prefer the already-loaded children list for parents (fast + parent-safe).
        // Fall back to result payload fields when necessary.
        const fallbackStudent = {
          id: result.student_id,
          firstName: result.first_name ?? result.student_first_name ?? '',
          otherName: '',
          lastName: result.last_name ?? result.student_last_name ?? '',
          admissionNumber: result.admission_number ?? '',
          class_id: result.class_id,
        };
        const student = child || fallbackStudent;
        return student ? { ...student, result } : null;
      })
      .filter(Boolean);
  }, [filteredResults, children]);

  useEffect(() => {
    const loadParentData = async () => {
      if (currentUser && currentUser.role === "parent") {
        setLoading(true);
        try {
          await Promise.all([
            loadParentsFromAPI(),
            loadCompiledResultsFromAPI(),
            loadClassesFromAPI(), // ← IMPORTANT: Load classes for class name fetching
            loadSchoolSettings() // ← Load school settings for logo and info
          ]);

          const parentId = currentUser?.linked_id;
          
          if (parentId) {
            const apiChildren = await getParentChildrenFromAPI(Number(parentId));
            const childrenData = Array.isArray(apiChildren) && apiChildren.length > 0
              ? apiChildren
              : getParentChildren(parentId);
            
            if (childrenData && childrenData.length > 0) {
              const transformedChildren = childrenData.map((child: any) => ({
                ...child,
                firstName: child.firstName ?? child.first_name ?? "",
                otherName: child.otherName ?? child.other_name ?? "",
                lastName: child.lastName ?? child.last_name ?? "",
                fullName: (
                  child.fullName ??
                  child.full_name ??
                  [
                    child.firstName ?? child.first_name ?? '',
                    child.otherName ?? child.other_name ?? '',
                    child.lastName ?? child.last_name ?? ''
                  ]
                    .filter((p: any) => String(p || '').trim() !== '')
                    .join(' ')
                    .trim()
                ),
                admissionNumber: child.admissionNumber ?? child.admission_number ?? "",
                className: child.className ?? child.class_name ?? "",
                classLevel: child.classLevel ?? child.level ?? "",
                gender: child.gender ?? "",
                status: child.status ?? "Active",
                dateOfBirth: child.dateOfBirth ?? child.date_of_birth ?? "",
                address: child.address ?? "",
                parentContact: child.parentContact ?? "",
                enrollmentDate: child.enrollmentDate ?? child.admission_date ?? "",
                recentActivities: child.recentActivities ?? [],
                feeBalance: child.feeBalance ?? 0,
                totalFees: child.totalFees ?? 0
              }));
              setChildren(transformedChildren);
              
              // Auto-select first child if none selected
              if (!selectedChild && transformedChildren.length > 0) {
                setSelectedChild(transformedChildren[0]);
              }
            } else {
              setChildren([]);
              toast.info(`No linked students found for ${parentName}. Please contact administration to link students.`);
            }
          } else {
            setChildren([]);
            toast.error("Parent account not properly linked");
          }
        } catch (error) {
          toast.error("Failed to load parent data");
          setChildren([]);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadParentData();
  }, [currentUser?.id, currentUser?.linked_id, parents.length]);

  // Keep parent results fresh without requiring hard refresh / cache clearing.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') return;

    let intervalId: number | undefined;

    const refresh = async () => {
      try {
        await loadCompiledResultsFromAPI();
      } catch (e) {
        // Keep UI stable if refresh fails.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    refresh();
    intervalId = window.setInterval(refresh, 10000);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentUser?.id, currentUser?.role]);

  // Filter children based on search
  const filteredChildren = children.filter(child => {
    const query = (searchTerm || '').toLowerCase();
    const fullName = String((child as any).fullName ?? '').toLowerCase();
    const admissionNumber = String((child as any).admissionNumber ?? '').toLowerCase();
    const className = String((child as any).className ?? '').toLowerCase();
    return (
      fullName.includes(query) ||
      admissionNumber.includes(query) ||
      className.includes(query)
    );
  });

  const handleViewResult = (resultId: number) => {
    // Use the same result viewing as admin - FullPageResultView
    const result = compiledResults.find(r => r.id === resultId);
    const student = children.find((c: any) => Number(c.id) === Number(result?.student_id));
    
    if (result && student) {
      // Open the same FullPageResultView that admin uses
      setFullPageView({ studentId: student.id, resultId: result.id });
    } else {
      toast.error("Result not found");
    }
  };

  // Get cumulative result for a child
  const getCumulativeForChild = (childId: number) => {
    return cumulativeResults.find(cr => cr.student_id === childId);
  };

  const handleViewCumulative = async (child: Child) => {
    if (!currentAcademicYear) {
      toast.error('Academic year not set');
      return;
    }
    // Load cumulative results if not already loaded
    const existing = getCumulativeForChild(child.id);
    if (!existing) {
      const classObj = classes.find((c: any) => c.name === child.className);
      if (classObj) {
        await loadCumulativeResultsFromAPI(classObj.id, currentAcademicYear);
      }
    }
    setCumulativeViewChild(child);
  };

  const handleDownloadResult = async (student: any, result: any) => {
    try {
      if (!student || !result) {
        toast.error('Missing student or result data');
        return;
      }
      
      const context = {
        schoolSettings: schoolSettings,
        teachers: teachers,
        classes: classes,
        students: children,
        scores: scores,
        affectiveDomains: affectiveDomains,
        psychomotorDomains: psychomotorDomains
      };
      
      await generatePDFFromData(student, result, context);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  if (fullPageView) {
    return (
      <FullPageResultView
        studentId={fullPageView.studentId}
        resultId={fullPageView.resultId}
        onClose={() => setFullPageView(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome, {parentName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {children.length} Children
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {filteredResults.length} Results
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search children..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="shrink-0"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="shrink-0"
                >
                  List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading children...</span>
        </div>
      )}

      {/* Children Grid/List */}
      {!loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredChildren.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-gray-200">
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No children match your search criteria.' : 'No children are linked to your account.'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Please contact the school administration to link students to your account.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredChildren.map((child) => {
              const approvedResults = getChildApprovedResults(child.id);
              const isSelected = selectedChild?.id === child.id;
              
              return (
                <Card 
                  key={child.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                  } border-gray-200`}
                  onClick={() => setSelectedChild(child)}
                >
                  <CardContent className="p-4">
                    {/* Child Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{child.fullName}</h3>
                          <p className="text-xs text-gray-500">{child.admissionNumber}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={child.status === "Active" ? "default" : "secondary"} 
                        className="text-xs shrink-0"
                      >
                        {child.status}
                      </Badge>
                    </div>

                    {/* Child Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Award className="w-3 h-3" />
                        <span>{child.className}</span>
                      </div>
                      {child.gender && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{child.gender}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Class: {child.classLevel}</span>
                      </div>
                    </div>

                    {/* Results Badge */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {approvedResults.length} Approved Results
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewResult(approvedResults[0]?.id)}
                          className="h-8 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadResult(child, approvedResults[0])}
                          className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                          disabled={!approvedResults[0]}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        {currentTerm === "Third Term" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingCumulative}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCumulative(child);
                            }}
                            className="h-8 px-2 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Award className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Cumulative Result Dialog */}
      <Dialog open={!!cumulativeViewChild} onOpenChange={(open) => { if (!open) setCumulativeViewChild(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cumulative Result - {cumulativeViewChild?.fullName}
            </DialogTitle>
          </DialogHeader>
          {cumulativeViewChild && (
            <>
              <CumulativeResultSheet
                studentId={cumulativeViewChild.id}
                academicYear={currentAcademicYear || ''}
              />
              <div className="flex gap-3 justify-end border-t pt-4 mt-4">
                <Button
                  disabled={loadingCumulative}
                  onClick={async () => {
                    const cr = cumulativeResults.find(
                      r => r.student_id === cumulativeViewChild.id && r.academic_year === currentAcademicYear
                    );
                    if (!cr) { toast.error('Cumulative result data not found'); return; }
                    try {
                      await generateCumulativePDF(cumulativeViewChild, cr, schoolSettings, classes, currentAcademicYear || '');
                      toast.success('PDF downloaded');
                    } catch { toast.error('Failed to generate PDF'); }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {loadingCumulative ? 'Loading...' : 'Download PDF'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
