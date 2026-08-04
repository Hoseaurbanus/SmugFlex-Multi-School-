import React from 'react';
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Eye, Pencil, Trash2, Lock, Unlock, MoreVertical, Link, Camera, Key, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../../ui/dropdown-menu";
import { Student } from "../../../types/school";

interface ParentInfo {
  name: string;
  username: string;
  phone: string;
  email: string;
}

interface StudentCardProps {
  student: Student;
  isSelected: boolean;
  hasRecords: boolean;
  parentInfo: ParentInfo;
  onSelect: (id: number) => void;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
  onDelete: (student: Student) => void;
  onLinkGuardian: (student: Student) => void;
  onUnlinkGuardian: (student: Student) => void;
  onUploadPhoto: (student: Student) => void;
  onResetPassword: (student: Student) => void;
  parentStudentLinks: any[];
}

function StudentCardInner({
  student,
  isSelected,
  hasRecords,
  parentInfo,
  onSelect,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  onLinkGuardian,
  onUnlinkGuardian,
  onUploadPhoto,
  onResetPassword,
  parentStudentLinks,
}: StudentCardProps) {
  const isLinked = Array.isArray(parentStudentLinks) && parentStudentLinks.some(link => link.student_id === student.id);

  return (
    <div className="mb-4 border border-gray-100 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSelect(student.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[#0A2540] border-[#0A2540]'
                : 'border-gray-300 hover:border-[#0A2540]'
            }`}
          >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {student.lastName}, {student.firstName}
            </h3>
            {student.otherName && (
              <p className="text-sm text-gray-500 truncate">{student.otherName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${
            student.status === 'Active'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {student.status}
          </Badge>
          {hasRecords && student.status === 'Active' && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>Has Records</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Reg No:</span>
          <p className="font-medium font-mono text-xs">{student.admissionNumber}</p>
        </div>
        <div>
          <span className="text-gray-500">Class:</span>
          <Badge className="text-xs mt-1">{student.className}</Badge>
        </div>
        <div>
          <span className="text-gray-500">Gender:</span>
          <Badge className={`text-xs mt-1 ${
            student.gender === 'Male'
              ? 'bg-[#FFD700]/10 text-[#0A2540]'
              : 'bg-pink-50 text-pink-700'
          }`}>
            {student.gender === 'Male' ? 'M' : 'F'}
          </Badge>
        </div>
        <div>
          <span className="text-gray-500">Parent:</span>
          <p className="font-medium truncate text-xs">
            {parentInfo.name || 'No Parent'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onView(student)}
          size="sm"
          variant="outline"
          className="flex-1 min-w-[70px] text-xs px-2 py-1.5 h-7"
        >
          <Eye className="w-3 h-3 mr-1" />
          View
        </Button>
        <Button
          onClick={() => onEdit(student)}
          size="sm"
          variant="outline"
          className="flex-1 min-w-[70px] text-xs px-2 py-1.5 h-7"
        >
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          onClick={() => onToggleStatus(student)}
          size="sm"
          variant="outline"
          disabled={student.status === 'Active' && hasRecords}
          title={student.status === 'Active' && hasRecords ? 'Cannot deactivate: student has records' : undefined}
          className="flex-1 min-w-[90px] text-xs px-2 py-1.5 h-7"
        >
          {student.status === 'Active' ? (
            <Lock className={`w-3 h-3 mr-1 ${hasRecords ? 'text-amber-500' : ''}`} />
          ) : (
            <Unlock className="w-3 h-3 mr-1" />
          )}
          {student.status === 'Active' ? 'Deactivate' : 'Activate'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2 py-1.5 h-7">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onLinkGuardian(student)}>
              <Link className="w-3 h-3 mr-2" />
              Link Guardian
            </DropdownMenuItem>
            {isLinked && (
              <DropdownMenuItem onClick={() => onUnlinkGuardian(student)}>
                <Link className="w-3 h-3 mr-2" />
                Unlink Guardian
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (student.status === 'Active' && hasRecords) return;
                onToggleStatus(student);
              }}
              disabled={student.status === 'Active' && hasRecords}
            >
              {student.status === 'Active' ? (
                <>
                  <Lock className={`w-3 h-3 mr-2 ${hasRecords ? 'text-amber-500' : ''}`} />
                  <span className={hasRecords ? 'text-amber-600' : ''}>
                    {hasRecords ? 'Cannot Deactivate (Has Records)' : 'Deactivate'}
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUploadPhoto(student)}>
              <Camera className="w-3 h-3 mr-2" />
              Upload Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(student)}>
              <Key className="w-3 h-3 mr-2" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(student)}
              className="text-red-600"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export const StudentCard = React.memo(StudentCardInner);
