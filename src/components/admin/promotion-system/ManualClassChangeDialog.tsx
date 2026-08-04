import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Settings } from "lucide-react";

interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  className: string;
  admissionNumber: string;
  class_id: number;
}

interface ClassItem {
  id: number;
  name: string;
  status: string;
}

interface ClassCapacity {
  [classId: number]: { current: number; max: number };
}

interface ManualClassChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent: StudentData | null;
  classes: ClassItem[];
  classCapacity: ClassCapacity;
  demotionClassId: number | null;
  manualClassChangeReason: string;
  onSetDemotionClassId: (id: number | null) => void;
  onSetManualClassChangeReason: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ManualClassChangeDialog({
  open,
  onOpenChange,
  selectedStudent,
  classes,
  classCapacity,
  demotionClassId,
  manualClassChangeReason,
  onSetDemotionClassId,
  onSetManualClassChangeReason,
  onConfirm,
  onCancel,
}: ManualClassChangeDialogProps) {
  const availableClasses = classes.filter(c => c.status === 'Active' && c.id !== selectedStudent?.class_id);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-lg rounded-2xl">
        <AlertDialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <Settings className="w-6 h-6 text-[#0A2540]" />
            </div>
            <div>
              <AlertDialogTitle className="text-gray-900 text-xl font-semibold">Manual Class Change</AlertDialogTitle>
              <p className="text-sm text-gray-600 mt-1">Change student class anytime (Admin Override)</p>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="text-gray-700">
          <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  {selectedStudent?.firstName} {selectedStudent?.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedStudent?.admissionNumber} • {selectedStudent?.className}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Target Class</Label>
              <Select
                value={demotionClassId?.toString() || ''}
                onValueChange={(value: string) => onSetDemotionClassId(Number(value))}
              >
                <SelectTrigger className="h-12 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-[#0A2540] focus:ring-[#0A2540]">
                  <SelectValue placeholder="Select target class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 rounded-xl">
                  {availableClasses.map(cls => {
                    const capacity = classCapacity[cls.id];
                    const isFull = capacity && capacity.current >= capacity.max;
                    return (
                      <SelectItem
                        key={cls.id}
                        value={cls.id.toString()}
                        className={`text-gray-900 ${isFull ? 'text-red-600 bg-red-50' : ''}`}
                      >
                        {cls.name} ({capacity?.current || 0}/{capacity?.max || 40}) {isFull ? '(FULL)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Reason for Change *</Label>
              <textarea
                value={manualClassChangeReason}
                onChange={(e) => onSetManualClassChangeReason(e.target.value)}
                placeholder="Enter reason for manual class change..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540] resize-none"
              />
            </div>
          </div>
        </div>

        <AlertDialogFooter className="pt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50 h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!demotionClassId || !manualClassChangeReason}
            className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-11 rounded-xl disabled:opacity-50"
          >
            Change Class
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
