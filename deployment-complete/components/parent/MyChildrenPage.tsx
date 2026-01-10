import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Search, User, Calendar, Award, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { FullPageResultView } from "../shared/FullPageResultView";
import { generatePDFFromData } from '../../utils/pdfGenerator';
import { useSchool } from "../../contexts/SchoolContext";

interface Child {
  id: number;
  firstName: string;
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

interface CompiledResult {
  id: number;
  student_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  total_score: number;
  average_score: number;
  class_average: number;
  position: number;
  total_students: number;
  times_present: number;
  times_absent: number;
  status: string;
  compiled_date: string;
  scores: any[];
}

export function MyChildrenPage() {
  const { 
    currentUser, 
    parents, 
    getParentChildren,
    compiledResults,
    loadParentsFromAPI,
    loadParentStudentLinksFromAPI,
    loadStudentsFromAPI,
    loadCompiledResultsFromAPI,
    currentTerm,
    currentAcademicYear,
    students,
    classes,
    schoolSettings,
    teachers,
    scores,
    loadScoresFromAPI,
    loadSchoolSettings,
    parentStudentLinks,
    feeStructures,
    loadFeeStructuresFromAPI,
    loadStudentFeeBalancesFromAPI,
    affectiveDomains,
    psychomotorDomains,
    loadAffectiveDomainsFromAPI,
    loadPsychomotorDomainsFromAPI
  } = useSchool();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [retryScheduled, setRetryScheduled] = useState(false);
  const [fullPageView, setFullPageView] = useState<{ studentId: number; resultId: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const currentParent = currentUser && parents.length > 0 ? parents.find((p) => p.id === currentUser?.linked_id) : null;
  
  let parentName = currentUser?.username || "Parent";
  if (currentParent && currentParent.firstName && currentParent.lastName) {
    parentName = `${currentParent.firstName} ${currentParent.lastName}`;
  }

  // Get approved results for a specific child - same logic as admin
  const getChildApprovedResults = (childId: number) => {
    const results = compiledResults.filter(result => 
      result.student_id === childId && 
      result.status === 'Approved'
    );
    console.log(`Child ${childId} approved results:`, results);
    return results;
  };

  // Get students with results - EXACT same as admin ResultsManagementPage
  const filteredResults = useMemo(() => {
    // Use same filtering as admin for current term/year
    let allResults = compiledResults;

    let results = allResults.filter(
      (r: any) =>
        r.term === currentTerm &&
        r.academic_year === currentAcademicYear
    );

    // Filter by status - same as admin approved tab
    results = results.filter((r: any) => r.status === "Approved");

    return results;
  }, [compiledResults, currentTerm, currentAcademicYear]);

  // Get students with results - EXACT same as admin
  const studentsWithResults = useMemo(() => {
    return filteredResults
      .map((result: any) => {
        const student = students.find((s: any) => s.id === result.student_id);
        return student ? { ...student, result } : null;
      })
      .filter(Boolean);
  }, [filteredResults, students]);

  useEffect(() => {
    const loadParentData = async () => {
      if (currentUser && currentUser.role === "parent") {
        setLoading(true);
        try {
          await Promise.all([
            loadParentsFromAPI(),
            loadParentStudentLinksFromAPI(),
            loadStudentsFromAPI(),
            loadCompiledResultsFromAPI(),
            loadScoresFromAPI(), // ← IMPORTANT: Load scores like admin
            loadSchoolSettings(), // ← IMPORTANT: Load school settings for PDF
            loadFeeStructuresFromAPI(), // ← IMPORTANT: Load fee structures for fee calculations
            loadStudentFeeBalancesFromAPI(), // ← IMPORTANT: Load fee balances for fee calculations
            loadAffectiveDomainsFromAPI(), // ← IMPORTANT: Load affective domains for result cards
            loadPsychomotorDomainsFromAPI() // ← IMPORTANT: Load psychomotor domains for result cards
          ]);
          
          // Wait a moment for state to update after API calls
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const parentId = currentUser?.linked_id;
          
          console.log('=== PARENT ID DEBUG ===');
          console.log('Current user:', currentUser);
          console.log('Parent ID from linked_id:', parentId);
          console.log('Parent ID type:', typeof parentId);
          console.log('Parent ID exists:', !!parentId);
          
          if (parentId) {
            console.log('Fetching children for parent ID:', parentId);
            console.log('Available parent-student links:', parentStudentLinks);
            console.log('Available students:', students);
            console.log('Data loaded check - links length:', parentStudentLinks.length, 'students length:', students.length);
            
            // Only proceed if data is actually loaded
            if (parentStudentLinks.length > 0 && students.length > 0) {
              const childrenData = getParentChildren(parentId);
              console.log('Children data fetched:', childrenData);
              
              if (childrenData && childrenData.length > 0) {
                const transformedChildren = childrenData.map((child: any) => ({
                  ...child,
                  dateOfBirth: child.dateOfBirth || "",
                  address: child.address || "",
                  parentContact: child.parentContact || "",
                  enrollmentDate: child.enrollmentDate || "",
                  recentActivities: child.recentActivities || [],
                  feeBalance: child.feeBalance || 0,
                  totalFees: child.totalFees || 0
                }));
                setChildren(transformedChildren);
                
                // Auto-select first child if none selected
                if (!selectedChild && transformedChildren.length > 0) {
                  setSelectedChild(transformedChildren[0]);
                }
              } else {
                console.log('No children found for parent after data loaded');
                setChildren([]);
              }
            } else {
              console.log('Data not loaded yet - links:', parentStudentLinks.length, 'students:', students.length);
              console.log('Retrying in 1 second...');
              
              // Only schedule retry if not already scheduled
              if (!retryScheduled) {
                setRetryScheduled(true);
                
                // Retry once more after 1 second
                setTimeout(async () => {
                  console.log('Retry - Available parent-student links:', parentStudentLinks.length);
                  console.log('Retry - Available students:', students.length);
                  
                  if (parentStudentLinks.length > 0 && students.length > 0) {
                    const childrenData = getParentChildren(parentId);
                    console.log('Retry - Children data fetched:', childrenData);
                    
                    if (childrenData && childrenData.length > 0) {
                      const transformedChildren = childrenData.map((child: any) => ({
                        ...child,
                        dateOfBirth: child.dateOfBirth || "",
                        address: child.address || "",
                        parentContact: child.parentContact || "",
                        enrollmentDate: child.enrollmentDate || "",
                        recentActivities: child.recentActivities || [],
                        feeBalance: child.feeBalance || 0,
                        totalFees: child.totalFees || 0
                      }));
                      setChildren(transformedChildren);
                      
                      if (!selectedChild && transformedChildren.length > 0) {
                        setSelectedChild(transformedChildren[0]);
                      }
                    } else {
                      // Don't set children to empty array if data was already loaded successfully
                      if (children.length === 0) {
                        setChildren([]);
                      }
                    }
                  } else {
                    console.log('Retry failed - Data still not loaded');
                    // Don't set children to empty array if data was already loaded successfully
                    if (children.length === 0) {
                      setChildren([]);
                    }
                  }
                  setRetryScheduled(false); // Reset retry flag
                }, 1000);
              }
            }
          } else {
            console.log('=== NO PARENT ID FOUND ===');
            console.log('Current user:', currentUser);
            console.log('User linked_id:', currentUser?.linked_id);
            console.log('Setting empty children array');
            setChildren([]);
            toast.info(`No linked students found for ${parentName}. Please contact administration to link students.`);
          }
        } catch (error) {
          console.error("Error loading parent data:", error);
          toast.error("Failed to load parent data");
          setChildren([]);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadParentData();
  }, [currentUser?.id, currentUser?.linked_id, parents.length]);

  // Filter children based on search
  const filteredChildren = children.filter(child =>
    child.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewResult = (resultId: number) => {
    // Use the same result viewing as admin - FullPageResultView
    const result = compiledResults.find(r => r.id === resultId);
    const student = students.find(s => s.id === result?.student_id);
    
    if (result && student) {
      // Open the same FullPageResultView that admin uses
      setFullPageView({ studentId: student.id, resultId: result.id });
    } else {
      toast.error("Result not found");
    }
  };

  const handleDownloadResult = async (student: any, result: any) => {
    try {
      console.log('=== PARENT PDF DOWNLOAD STARTED ===');
      console.log('Student:', student);
      console.log('Result:', result);
      
      if (!student || !result) {
        console.error('Missing student or result:', { student, result });
        toast.error("Student or result not found");
        return;
      }

console.log('Student:', student.firstName, student.lastName);
console.log('Student ID:', student.id);
console.log('Result ID:', result.id);
      
// Use the EXACT same admin PDF function from shared utility
// Pass complete context including domain data for proper affective/psychomotor display
const context = {
  schoolSettings: schoolSettings,
  teachers: teachers,
  classes: classes,
  scores: scores,
  affectiveDomains: affectiveDomains,
  psychomotorDomains: psychomotorDomains,
  // Add missing context items that admin uses
  subjects: [],
  subjectAssignments: [],
  students: students
};
      
console.log('=== PARENT PDF - USING EXACT ADMIN CONTEXT ===');
console.log('Parent context being passed:', context);
console.log('School settings from context:', schoolSettings);
console.log('Scores from context:', scores.length);
console.log('Affective domains available:', affectiveDomains.length);
console.log('Psychomotor domains available:', psychomotorDomains.length);
      
await generatePDFFromData(student, result, context);
      
console.log('=== PARENT PDF COMPLETED SUCCESSFULLY ===');
toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('=== PARENT PDF GENERATION FAILED ===');
      console.error('Error:', error);
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
                          onClick={() => {
                            console.log('Download button clicked!');
                            console.log('Child data:', child);
                            console.log('Approved result:', approvedResults[0]);
                            console.log('Button disabled:', !approvedResults[0]);
                            handleDownloadResult(child, approvedResults[0]);
                          }}
                          className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                          disabled={!approvedResults[0]}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
