import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Eye, Pencil, Lock, Unlock, Trash2 } from "lucide-react";
import { Student } from "../../../types/school";

interface StudentTableProps {
  paginatedStudents: Student[];
  selectedStudents: number[];
  onSelectStudent: (id: number) => void;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
  onDelete: (student: Student) => void;
  getParentInfo: (student: Student) => { name: string };
  scores: any[];
  attendances: any[];
  compiledResults: any[];
}

export function StudentTable({
  paginatedStudents,
  selectedStudents,
  onSelectStudent,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  getParentInfo,
  scores,
  attendances,
  compiledResults,
}: StudentTableProps) {
  const hasRecords = (studentId: number) =>
    scores.some(s => s.student_id === studentId) ||
    attendances.some(a => a.student_id === studentId) ||
    compiledResults.some(cr => cr.student_id === studentId);

  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 font-medium text-sm">Select</th>
              <th className="text-left p-3 font-medium text-sm">Reg No</th>
              <th className="text-left p-3 font-medium text-sm">Name</th>
              <th className="text-left p-3 font-medium text-sm">Class</th>
              <th className="text-left p-3 font-medium text-sm">Parent</th>
              <th className="text-left p-3 font-medium text-sm">Status</th>
              <th className="text-left p-3 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => onSelectStudent(student.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="p-3 font-mono text-sm">{student.admissionNumber}</td>
                <td className="p-3">
                  <div>
                    <div className="font-medium">{student.lastName}, {student.firstName}</div>
                    {student.otherName && (
                      <div className="text-sm text-gray-500">{student.otherName}</div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline">{student.className}</Badge>
                </td>
                <td className="p-3 text-sm">
                  {getParentInfo(student).name || 'No Parent'}
                </td>
                <td className="p-3">
                  <Badge className={
                    student.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-800'
                  }>
                    {student.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onView(student)} className="h-8 w-8 p-0">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(student)} className="h-8 w-8 p-0">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleStatus(student)}
                      disabled={student.status === 'Active' && hasRecords(student.id)}
                      title={student.status === 'Active' ? 'Deactivate' : 'Activate'}
                      className="h-8 w-8 p-0"
                    >
                      {student.status === 'Active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(student)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
