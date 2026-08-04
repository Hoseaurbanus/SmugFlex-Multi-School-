import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { resolveCanonicalClassId } from '../../../utils/idResolution';

interface ClassSelectionCardProps {
  selectedStudentId: number | null;
  selectedClassId: string | null;
  onClassChange: (value: string) => void;
  classTeacherClasses: Array<{ id: number | string; name: string }>;
  currentTerm: string | null;
  currentAcademicYear: string | null;
  classSubjectIdSet: Set<string | number>;
}

export const ClassSelectionCard = React.memo(function ClassSelectionCard({
  selectedStudentId,
  selectedClassId,
  onClassChange,
  classTeacherClasses,
  currentTerm,
  currentAcademicYear,
  classSubjectIdSet,
}: ClassSelectionCardProps) {
  if (selectedStudentId) return null;

  return (
    <Card className="border-[#0A2540]/10 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl px-4 py-3">
        <CardTitle className="text-base">Select Class</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-[#0A2540] mb-1 block text-sm">Class</Label>
            <Select
              value={selectedClassId ?? undefined}
              onValueChange={(value: string) => {
                const canonical = resolveCanonicalClassId(value, classTeacherClasses as any) ?? value;
                onClassChange(canonical);
              }}
            >
              <SelectTrigger className="h-9 rounded-lg border-[#0A2540]/20">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classTeacherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#0A2540] mb-1 block text-sm">Term & Year</Label>
            <div className="h-9 flex items-center px-3 rounded-lg border border-[#0A2540]/20 bg-gray-50">
              <p className="text-[#0A2540] text-sm">{currentTerm} {currentAcademicYear}</p>
            </div>
          </div>
        </div>

        {selectedClassId && classSubjectIdSet.size > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>{classSubjectIdSet.size} subjects</strong> assigned to this class for {currentTerm} {currentAcademicYear}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
