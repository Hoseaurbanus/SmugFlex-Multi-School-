import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { GraduationCap, Users, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  className: string;
  admissionNumber: string;
  class_id: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  attendance: number;
  promotionStatus: string;
}

interface ClassItem {
  id: number;
  name: string;
  status: string;
  capacity?: number;
  currentStudents?: number;
}

interface ClassCapacity {
  [classId: number]: { current: number; max: number };
}

interface StudentPromotionTableProps {
  selectedSourceClass: string;
  filteredStudents: StudentData[];
  paginatedStudents: StudentData[];
  selectedStudents: number[];
  promotionMapping: { [studentId: number]: number };
  promotionErrors: { [studentId: number]: string };
  currentPage: number;
  totalPages: number;
  pageSize: number;
  classes: ClassItem[];
  classCapacity: ClassCapacity;
  getNextClasses: (classId: number) => (ClassItem & { isGraduation?: boolean })[];
  onSelectStudent: (studentId: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSetDestinationClass: (studentId: number, classId: number) => void;
  onHandleManualPromotion: (student: StudentData) => void;
  onHandleManualClassChange: (student: StudentData) => void;
  onHandlePromoteStudents: () => void;
  onExportPromotionList: () => void;
  isPromoting: boolean;
  onSetCurrentPage: (page: number) => void;
  onSetPageSize: (size: number) => void;
}

export function getStatusBadge(status: string, studentId?: number) {
  const styles: Record<string, string> = {
    'Promoted': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Repeated': 'bg-red-100 text-red-700 border-red-200',
    'Conditional': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'On Hold': 'bg-orange-100 text-orange-700 border-orange-200',
    'Withdrawn': 'bg-gray-100 text-gray-700 border-gray-200',
    'Pending Approval': 'bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20',
    'Manual': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <Badge className={styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}>
      {status}
    </Badge>
  );
}

export function StudentPromotionTable({
  selectedSourceClass,
  filteredStudents,
  paginatedStudents,
  selectedStudents,
  promotionMapping,
  promotionErrors,
  currentPage,
  totalPages,
  pageSize,
  classes,
  classCapacity,
  getNextClasses,
  onSelectStudent,
  onSelectAll,
  onSetDestinationClass,
  onHandleManualPromotion,
  onHandleManualClassChange,
  onHandlePromoteStudents,
  onExportPromotionList,
  isPromoting,
  onSetCurrentPage,
  onSetPageSize,
}: StudentPromotionTableProps) {
  if (!selectedSourceClass) {
    return (
      <Card className="border border-gray-100 shadow-xl bg-white">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <GraduationCap className="w-8 h-8 text-[#0A2540]" />
            </div>
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">Select a Source Class</h3>
            <p className="text-gray-600 max-w-md">
              Choose a class from the dropdown above to view students eligible for promotion.
              The system will automatically analyze student performance and recommend promotion actions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 shadow-xl bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <GraduationCap className="w-5 h-5 text-[#0A2540]" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-gray-900">Students for Promotion</h3>
              <p className="text-sm text-gray-600">{filteredStudents.length} students found</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onExportPromotionList}
              variant="outline"
              className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export List
            </Button>
            <Button
              onClick={onHandlePromoteStudents}
              disabled={selectedStudents.length === 0 || isPromoting}
              className="h-10 bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl shadow-lg disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isPromoting ? 'Processing...' : `Promote Selected (${selectedStudents.length})`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="text-gray-700 font-semibold">
                  <Checkbox
                    checked={selectedStudents.length === filteredStudents.filter((s) => s.promotionStatus === "Promoted").length}
                    onCheckedChange={onSelectAll}
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
                <TableHead className="text-gray-700 font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-gray-900 font-medium mb-1">No students found</p>
                      <p className="text-gray-500 text-sm">
                        {selectedSourceClass ? 'No active students in this class' : 'Please select a source class'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => {
                  const nextClasses = getNextClasses(student.class_id);
                  return (
                    <TableRow key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked: boolean) => onSelectStudent(student.id, checked)}
                          disabled={student.promotionStatus === "Repeated"}
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
                        <span className={`font-semibold ${student.averageScore >= 50 ? 'text-emerald-600' : student.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.averageScore.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">
                        {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${student.attendance >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {student.attendance.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(student.promotionStatus, student.id)}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onHandleManualPromotion(student)}
                            className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            Manual
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {selectedStudents.includes(student.id) ? (
                          <div className="space-y-2">
                            <Select
                              value={promotionMapping[student.id]?.toString() || ''}
                              onValueChange={(value: string) => onSetDestinationClass(student.id, Number(value))}
                            >
                              <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-gray-900">
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                {nextClasses.map((cls) => {
                                  const capacity = classCapacity[cls.id];
                                  const isFull = capacity && capacity.current >= capacity.max;
                                  return (
                                    <SelectItem
                                      key={cls.id}
                                      value={cls.id.toString()}
                                      className={`text-gray-900 ${isFull && !cls.isGraduation ? 'text-red-600 bg-red-50' : cls.isGraduation ? 'text-emerald-600 bg-emerald-50 font-medium' : ''}`}
                                      onClick={() => {
                                        if (isFull && !cls.isGraduation) {
                                          toast.error('Class is at full capacity');
                                        }
                                      }}
                                    >
                                      {cls.isGraduation ? `Graduate — ${cls.name}` : `${cls.name} (${capacity?.current || 0}/${capacity?.max || 40}) ${isFull ? '(FULL)' : ''}`}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {promotionErrors[student.id] && (
                              <p className="text-xs text-red-600">{promotionErrors[student.id]}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onHandleManualPromotion(student)}
                            className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            Manual
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onHandleManualClassChange(student)}
                            className="h-7 px-2 text-xs border-gray-200 text-[#0A2540] hover:bg-gray-50"
                          >
                            Change Class
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-900 font-medium mb-1">No students found</p>
              <p className="text-gray-500 text-sm">
                {selectedSourceClass ? 'No active students in this class' : 'Please select a source class'}
              </p>
            </div>
          ) : (
            paginatedStudents.map((student) => {
              const nextClasses = getNextClasses(student.class_id);
              return (
                <div key={student.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked: boolean) => onSelectStudent(student.id, checked)}
                        disabled={student.promotionStatus === "Repeated"}
                        className="border-gray-300 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-gray-500">{student.className} • {student.admissionNumber}</p>
                      </div>
                    </div>
                    {getStatusBadge(student.promotionStatus, student.id)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs text-gray-500">Average</p>
                      <p className={`text-sm font-semibold ${student.averageScore >= 50 ? 'text-emerald-600' : student.averageScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {student.averageScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs text-gray-500">Attendance</p>
                      <p className={`text-sm font-semibold ${student.attendance >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {student.attendance.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {selectedStudents.includes(student.id) && (
                    <div className="space-y-2">
                      <Select
                        value={promotionMapping[student.id]?.toString() || ''}
                        onValueChange={(value: string) => onSetDestinationClass(student.id, Number(value))}
                      >
                        <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-gray-900">
                          <SelectValue placeholder="Select destination class" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {nextClasses.map((cls) => {
                            const capacity = classCapacity[cls.id];
                            const isFull = capacity && capacity.current >= capacity.max;
                            return (
                              <SelectItem
                                key={cls.id}
                                value={cls.id.toString()}
                                className={`text-gray-900 ${isFull && !cls.isGraduation ? 'text-red-600 bg-red-50' : cls.isGraduation ? 'text-emerald-600 bg-emerald-50 font-medium' : ''}`}
                                onClick={() => {
                                  if (isFull && !cls.isGraduation) {
                                    toast.error('Class is at full capacity');
                                  }
                                }}
                              >
                                {cls.isGraduation ? `Graduate — ${cls.name}` : `${cls.name} (${capacity?.current || 0}/${capacity?.max || 40}) ${isFull ? '(FULL)' : ''}`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {promotionErrors[student.id] && (
                        <p className="text-xs text-red-600">{promotionErrors[student.id]}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onHandleManualPromotion(student)}
                      className="h-8 px-3 text-xs border-orange-200 text-orange-600 hover:bg-orange-50 flex-1"
                    >
                      Manual
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onHandleManualClassChange(student)}
                      className="h-8 px-3 text-xs border-gray-200 text-[#0A2540] hover:bg-gray-50 flex-1"
                    >
                      Change Class
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredStudents.length, currentPage * pageSize)} of {filteredStudents.length}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => onSetPageSize(Number(v) || 20)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => onSetCurrentPage(Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>
              <div className="text-sm text-gray-700 min-w-[90px] text-center">
                Page {currentPage} / {totalPages}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => onSetCurrentPage(Math.min(totalPages, currentPage + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
