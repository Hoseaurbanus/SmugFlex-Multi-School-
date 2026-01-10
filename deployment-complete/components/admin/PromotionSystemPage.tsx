import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { GraduationCap, Users, TrendingUp, AlertTriangle, Download, CheckCircle, XCircle, Clock } from "lucide-react";

export function PromotionSystemPage() {
  const { 
    students, 
    classes, 
    compiledResults, 
    currentTerm,
    currentAcademicYear,
    promoteMultipleStudents,
    addActivityLog,
    currentUser,
    refreshStudents
  } = useSchool();

  const [selectedSourceClass, setSelectedSourceClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [promotionMapping, setPromotionMapping] = useState<{ [studentId: number]: number }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newAcademicYear, setNewAcademicYear] = useState("2025/2026");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionProgress, setPromotionProgress] = useState(0);
  const [promotionHistory, setPromotionHistory] = useState<any[]>([]);
  const [manualOverride, setManualOverride] = useState<{ [studentId: number]: string }>({});
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedStudentForManual, setSelectedStudentForManual] = useState<any>(null);
  const [demotionClassId, setDemotionClassId] = useState<number | null>(null);

  // Load promotion history on component mount
  useEffect(() => {
    loadPromotionHistory();
  }, []);

  const loadPromotionHistory = async () => {
    try {
      const response = await fetch('/api/student/promotion-history');
      if (response.ok) {
        const data = await response.json();
        setPromotionHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error loading promotion history:', error);
    }
  };

  // Get students in selected class
  const classStudents = selectedSourceClass
    ? students.filter(s => s.class_id === Number(selectedSourceClass) && s.status === 'Active')
    : [];

  // Get latest results for each student to determine promotion status
  const studentsWithStatus = classStudents.map(student => {
    const latestResult = compiledResults
      .filter(r => r.student_id === student.id && r.status === 'Approved')
      .sort((a, b) => new Date(b.compiled_date).getTime() - new Date(a.compiled_date).getTime())[0];

    let promotionStatus: "Promote" | "Trial" | "Repeat" = "Repeat";
    let averageScore = 0;
    let attendance = 0;

    if (latestResult) {
      averageScore = typeof latestResult.average_score === 'string' 
        ? parseFloat(latestResult.average_score) 
        : Number(latestResult.average_score) || 0;
      attendance = latestResult.total_attendance_days > 0 
        ? (latestResult.times_present / latestResult.total_attendance_days) * 100 
        : 0;

      // Check for manual override first
      if (manualOverride[student.id]) {
        promotionStatus = manualOverride[student.id] as "Promote" | "Trial" | "Repeat";
      } else if (averageScore >= 50 && attendance >= 75) {
        promotionStatus = "Promote";
      } else if (averageScore >= 40 && averageScore < 50) {
        promotionStatus = "Trial";
      } else {
        promotionStatus = "Repeat";
      }
    }

    return {
      ...student,
      averageScore,
      attendance,
      promotionStatus,
      position: latestResult?.position || 0,
      totalStudents: latestResult?.total_students || 0,
    };
  });

  // Apply filters
  const filteredStudents = studentsWithStatus.filter(student => {
    const matchesSearch = 
      (student.firstName && student.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.lastName && student.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      filterStatus === "All" || 
      student.promotionStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary
  const summary = {
    totalStudents: filteredStudents.length,
    toPromote: filteredStudents.filter(s => s.promotionStatus === "Promote").length,
    onTrial: filteredStudents.filter(s => s.promotionStatus === "Trial").length,
    toRepeat: filteredStudents.filter(s => s.promotionStatus === "Repeat").length,
    pending: filteredStudents.filter(s => s.averageScore === 0).length,
  };

  const handleSelectStudent = (studentId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
      const newMapping = { ...promotionMapping };
      delete newMapping[studentId];
      setPromotionMapping(newMapping);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const promotableStudents = filteredStudents
        .filter(s => s.promotionStatus === "Promote")
        .map(s => s.id);
      setSelectedStudents(promotableStudents);
    } else {
      setSelectedStudents([]);
      setPromotionMapping({});
    }
  };

  const handleSetDestinationClass = (studentId: number, classId: number) => {
    setPromotionMapping({
      ...promotionMapping,
      [studentId]: classId,
    });
  };

  const handleManualPromotion = (student: any) => {
    setSelectedStudentForManual(student);
    setShowManualDialog(true);
  };

  const confirmManualPromotion = (action: string, targetClassId?: number) => {
    if (selectedStudentForManual) {
      if (action === 'promote' || action === 'demote') {
        // Set promotion status
        const status = action === 'promote' ? 'Promote' : 'Repeat';
        setManualOverride({
          ...manualOverride,
          [selectedStudentForManual.id]: status,
        });
        
        // Set destination class
        if (action === 'promote') {
          setSelectedStudents([...selectedStudents, selectedStudentForManual.id]);
        } else if (action === 'demote' && targetClassId) {
          // For demotion, set the target class in promotion mapping
          setPromotionMapping({
            ...promotionMapping,
            [selectedStudentForManual.id]: targetClassId,
          });
        }
        
        toast.success(`Manual ${action} status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
      } else {
        // Trial status
        setManualOverride({
          ...manualOverride,
          [selectedStudentForManual.id]: action,
        });
        toast.success(`Manual trial status set for ${selectedStudentForManual.firstName} ${selectedStudentForManual.lastName}`);
      }
      
      // Reset states
      setShowManualDialog(false);
      setSelectedStudentForManual(null);
      setDemotionClassId(null);
    }
  };

  const getDemotionClasses = (currentClassId: number) => {
    const currentClass = classes.find(c => c.id === currentClassId);
    if (!currentClass) return [];

    // Define demotion paths (reverse of promotion)
    const demotionMap: { [key: string]: string[] } = {
      'KG 1 (Sardius)': ['CRECHE (Onyx)'],
      'KG 1 (Sardonyx)': ['CRECHE (Onyx)'],
      'KG 2 (PEARL)': ['KG 1 (Sardius)', 'KG 1 (Sardonyx)'],
      'GRADE K. JASPER': ['KG 2 (PEARL)'],
      'GRADE K. RUBY': ['KG 2 (PEARL)'],
      'GRADE 1 (DIAMOND)': ['GRADE K. JASPER', 'GRADE K. RUBY'],
      'GRADE 1 (GOLD)': ['GRADE K. JASPER', 'GRADE K. RUBY'],
      'GRADE 2 (BERYL)': ['GRADE 1 (DIAMOND)', 'GRADE 1 (GOLD)'],
      'GRADE 3 (EMERALD)': ['GRADE 2 (BERYL)'],
      'GRADE 4 (JACINTH)': ['GRADE 3 (EMERALD)'],
      'GRADE 4 (SAPPHIRE)': ['GRADE 3 (EMERALD)'],
      'GRADE 5 (Topaz)': ['GRADE 4 (JACINTH)', 'GRADE 4 (SAPPHIRE)'],
      'JSS 1 (CHRYSOLITE)': ['GRADE 5 (Topaz)'],
      'JSS 2 (CHRYSOPRASUS)': ['JSS 1 (CHRYSOLITE)'],
    };

    const currentClassName = currentClass.name;
    const demotionClassNames = demotionMap[currentClassName] || [];
    
    return classes.filter(c => demotionClassNames.includes(c.name));
  };

  const handlePromoteStudents = () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students to promote");
      return;
    }

    // Check if all selected students have destination classes
    const missingDestination = selectedStudents.filter(id => !promotionMapping[id]);
    if (missingDestination.length > 0) {
      toast.error("Please set destination class for all selected students");
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmPromotion = async () => {
    setIsPromoting(true);
    setPromotionProgress(0);
    
    try {
      // Prepare promotion data for API
      const promotions = selectedStudents.map(studentId => {
        const student = students.find(s => s.id === studentId);
        const fromClassId = student?.class_id;
        const toClassId = promotionMapping[studentId];
        const studentData = studentsWithStatus.find(s => s.id === studentId);
        
        return {
          student_id: studentId,
          from_class_id: fromClassId,
          to_class_id: toClassId,
          from_academic_year: currentAcademicYear,
          status: studentData?.promotionStatus || 'Promoted'
        };
      });

      // Call the API
      const response = await fetch('/api/student/promote-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promotions: promotions,
          to_academic_year: newAcademicYear
        })
      });

      if (!response.ok) {
        throw new Error('Failed to promote students');
      }

      const result = await response.json();
      
      // Update progress
      setPromotionProgress(100);
      
      // Log activity
      if (currentUser) {
        addActivityLog({
          id: 0,
          timestamp: new Date().toISOString(),
          actor: currentUser.username,
          actor_role: 'Admin',
          action: 'Promote Students',
          target: `${selectedStudents.length} students promoted`,
          ip_address: 'System',
          status: 'Success',
          details: `Promoted ${selectedStudents.length} students from ${classes.find(c => c.id === Number(selectedSourceClass))?.name} to ${newAcademicYear}`,
        });
      }

      // Refresh students data
      await refreshStudents();
      
      // Reload promotion history
      await loadPromotionHistory();

      toast.success(`Successfully promoted ${selectedStudents.length} students!`);
      setShowConfirmDialog(false);
      setSelectedStudents([]);
      setPromotionMapping({});
      
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error("Failed to promote students. Please try again.");
    } finally {
      setIsPromoting(false);
      setPromotionProgress(0);
    }
  };

  const getStatusBadge = (status: string, studentId: number) => {
    const isManualOverride = manualOverride[studentId];
    const badgeClass = isManualOverride ? "ring-2 ring-orange-300" : "";
    
    switch (status) {
      case "Promote":
        return <Badge className={`bg-green-500 text-white border-0 ${badgeClass}`}><CheckCircle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Promote</Badge>;
      case "Trial":
        return <Badge className={`bg-yellow-500 text-white border-0 ${badgeClass}`}><Clock className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Trial</Badge>;
      case "Repeat":
        return <Badge className={`bg-red-500 text-white border-0 ${badgeClass}`}><XCircle className="w-3 h-3 mr-1" />{isManualOverride ? "Manual: " : ""}Repeat</Badge>;
      default:
        return <Badge className={`bg-gray-500 text-white border-0 ${badgeClass}`}><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getNextClasses = (currentClassId: number) => {
    const currentClass = classes.find(c => c.id === currentClassId);
    if (!currentClass) return [];

    // Define specific class progression based on your school structure
    const progressionMap: { [key: string]: string[] } = {
      // Creche progression
      'CRECHE (Onyx)': ['KG 1 (Sardius)', 'KG 1 (Sardonyx)'],
      
      // KG 1 progression
      'KG 1 (Sardius)': ['KG 2 (PEARL)'],
      'KG 1 (Sardonyx)': ['KG 2 (PEARL)'],
      
      // KG 2 progression
      'KG 2 (PEARL)': ['GRADE K. JASPER', 'GRADE K. RUBY'],
      
      // Kindergarten progression
      'GRADE K. JASPER': ['GRADE 1 (DIAMOND)', 'GRADE 1 (GOLD)'],
      'GRADE K. RUBY': ['GRADE 1 (DIAMOND)', 'GRADE 1 (GOLD)'],
      
      // Primary progression
      'GRADE 1 (DIAMOND)': ['GRADE 2 (BERYL)'],
      'GRADE 1 (GOLD)': ['GRADE 2 (BERYL)'],
      'GRADE 2 (BERYL)': ['GRADE 3 (EMERALD)'],
      'GRADE 3 (EMERALD)': ['GRADE 4 (JACINTH)', 'GRADE 4 (SAPPHIRE)'],
      'GRADE 4 (JACINTH)': ['GRADE 5 (Topaz)'],
      'GRADE 4 (SAPPHIRE)': ['GRADE 5 (Topaz)'],
      
      // Junior Secondary progression
      'GRADE 5 (Topaz)': ['JSS 1 (CHRYSOLITE)'],
      'JSS 1 (CHRYSOLITE)': ['JSS 2 (CHRYSOPRASUS)'],
      'JSS 2 (CHRYSOPRASUS)': [] // Would go to next class when added
    };

    const currentClassName = currentClass.name;
    const nextClassNames = progressionMap[currentClassName] || [];
    
    // Return class objects for the next classes
    return classes.filter(c => nextClassNames.includes(c.name));
  };

  const exportPromotionList = () => {
    const headers = ['Student Name', 'Admission No', 'Current Class', 'Average Score', 'Position', 'Attendance', 'Status', 'Next Class'];
    const rows = filteredStudents.map(s => {
      const nextClass = promotionMapping[s.id] ? classes.find(c => c.id === promotionMapping[s.id])?.name : '-';
      return [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber,
        s.className,
        s.averageScore.toFixed(1),
        `${s.position}/${s.totalStudents}`,
        `${s.attendance.toFixed(0)}%`,
        s.promotionStatus,
        nextClass || '-'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Promotion list exported successfully");
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Promotion System</h1>
            <p className="text-gray-600">Manage student promotions to next academic session</p>
          </div>
        </div>
      </div>

      {/* Promotion History Summary */}
      {promotionHistory.length > 0 && (
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Recent Promotion Activity
              </h3>
              <Badge variant="outline" className="text-blue-600">
                {promotionHistory.length} promotions this session
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotionHistory.slice(0, 3).map((promo, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {promo.total_students} students promoted
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(promo.promotion_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {selectedSourceClass && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">In selected class</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Promote</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.toPromote}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for promotion</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Trial</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{summary.onTrial}</p>
              <p className="text-xs text-gray-500 mt-1">Need improvement</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Repeat</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.toRepeat}</p>
              <p className="text-xs text-gray-500 mt-1">Need to repeat</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
              </div>
              <p className="text-2xl font-bold text-gray-600">{summary.pending}</p>
              <p className="text-xs text-gray-500 mt-1">No results yet</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-xl bg-white">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Promotion Settings</h3>
          <p className="text-sm text-gray-600">Configure promotion parameters and filter students</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">New Academic Year</Label>
              <Select value={newAcademicYear} onValueChange={setNewAcademicYear}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="2025/2026" className="text-gray-900">2025/2026</SelectItem>
                  <SelectItem value="2026/2027" className="text-gray-900">2026/2027</SelectItem>
                  <SelectItem value="2027/2028" className="text-gray-900">2027/2028</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Source Class *</Label>
              <Select value={selectedSourceClass} onValueChange={setSelectedSourceClass}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select source class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes.filter(c => c.status === 'Active').map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name} ({students.filter(s => s.class_id === cls.id && s.status === 'Active').length} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="All" className="text-gray-900">All Students</SelectItem>
                  <SelectItem value="Promote" className="text-gray-900">Promote Only</SelectItem>
                  <SelectItem value="Trial" className="text-gray-900">Trial Only</SelectItem>
                  <SelectItem value="Repeat" className="text-gray-900">Repeat Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Search Student</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or Admission No..."
                  className="h-12 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {selectedSourceClass ? (
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Students for Promotion</h3>
                  <p className="text-sm text-gray-600">{filteredStudents.length} students found</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={exportPromotionList}
                  variant="outline"
                  className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </Button>
                <Button
                  onClick={handlePromoteStudents}
                  disabled={selectedStudents.length === 0 || isPromoting}
                  className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isPromoting ? 'Processing...' : `Promote Selected (${selectedStudents.length})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-gray-700 font-semibold">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.filter(s => s.promotionStatus === "Promote").length}
                        onCheckedChange={handleSelectAll}
                        className="border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">Student</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Adm. No</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Average</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Position</TableHead>
                    <TableHead className="text-gray-700 font-semibold text-center">Attendance</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Destination Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-gray-900 font-medium mb-1">No students found</p>
                          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const nextClasses = getNextClasses(student.class_id);
                      return (
                        <TableRow key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked: boolean) => handleSelectStudent(student.id, checked)}
                              disabled={student.promotionStatus === "Repeat"}
                              className="border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900 font-medium">{student.firstName} {student.lastName}</p>
                              <p className="text-xs text-gray-500">{student.className}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{student.admissionNumber}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${student.averageScore >= 50 ? 'text-green-600' : student.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {student.averageScore.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-gray-600">
                            {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${student.attendance >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                              {student.attendance.toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(student.promotionStatus, student.id)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualPromotion(student)}
                                className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                Manual
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {selectedStudents.includes(student.id) ? (
                              <Select
                                value={promotionMapping[student.id]?.toString() || ''}
                                onValueChange={(value: string) => handleSetDestinationClass(student.id, Number(value))}
                              >
                                <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-gray-900">
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                  {nextClasses.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                                      {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-blue-100 rounded-full mb-4">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Source Class</h3>
              <p className="text-gray-600 max-w-md">
                Choose a class from the dropdown above to view students eligible for promotion. 
                The system will automatically analyze student performance and recommend promotion actions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <AlertDialogTitle className="text-gray-900 text-lg">Confirm Student Promotion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">
              You are about to promote <span className="font-semibold text-gray-900">{selectedStudents.length}</span> student(s) to the <span className="font-semibold text-gray-900">{newAcademicYear}</span> academic year.
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Update their class assignments</li>
                <li>Update academic year records</li>
                <li>Create promotion history entries</li>
                <li>Log this activity for audit purposes</li>
              </ul>
              <br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isPromoting && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Processing promotion...</span>
                <span className="text-sm text-gray-900">{promotionProgress}%</span>
              </div>
              <Progress value={promotionProgress} className="h-2" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isPromoting}
              className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPromotion}
              disabled={isPromoting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPromoting ? 'Processing...' : 'Confirm Promotion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Manual Promotion Dialog */}
      <AlertDialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-lg rounded-2xl">
          <AlertDialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-gray-900 text-xl font-semibold">Manual Promotion Override</AlertDialogTitle>
                <p className="text-sm text-gray-600 mt-1">Override automatic promotion criteria</p>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="text-gray-700">
            <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {selectedStudentForManual?.firstName} {selectedStudentForManual?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedStudentForManual?.admissionNumber} • {selectedStudentForManual?.className}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Average:</span>
                      <span className={`ml-1 font-semibold ${
                        selectedStudentForManual?.averageScore >= 50 ? 'text-green-600' : 
                        selectedStudentForManual?.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {selectedStudentForManual?.averageScore?.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Attendance:</span>
                      <span className={`ml-1 font-semibold ${
                        selectedStudentForManual?.attendance >= 75 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedStudentForManual?.attendance?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Promotion Options */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Promotion Options
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmManualPromotion("promote")}
                    className="bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Promote
                  </Button>
                  <Button
                    onClick={() => confirmManualPromotion("Trial")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Trial
                  </Button>
                </div>
              </div>
              
              {/* Demotion Options */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Demotion Options
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => confirmManualPromotion("Repeat")}
                    className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Repeat
                  </Button>
                  <div className="flex gap-2">
                    <Select
                      value={demotionClassId?.toString() || ''}
                      onValueChange={(value: string) => setDemotionClassId(Number(value))}
                    >
                      <SelectTrigger className="h-12 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="Demote to..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 rounded-xl">
                        {selectedStudentForManual && getDemotionClasses(selectedStudentForManual.class_id).map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900 hover:bg-orange-50">
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => confirmManualPromotion("demote", demotionClassId || undefined)}
                      disabled={!demotionClassId}
                      className="bg-orange-600 hover:bg-orange-700 text-white h-12 px-4 rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter className="pt-4">
            <Button
              onClick={() => {
                setShowManualDialog(false);
                setSelectedStudentForManual(null);
                setDemotionClassId(null);
              }}
              variant="outline"
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-11 rounded-xl"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
