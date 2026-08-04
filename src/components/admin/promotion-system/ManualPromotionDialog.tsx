import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  className: string;
  admissionNumber: string;
  class_id: number;
  averageScore: number;
  attendance: number;
}

interface ClassItem {
  id: number;
  name: string;
}

type PromotionStatus = 'Promoted' | 'Repeated' | 'Transferred' | 'On Hold' | 'Withdrawn' | 'Pending Approval' | 'Conditional' | 'Manual';

interface ManualPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent: StudentData | null;
  demotionClassId: number | null;
  demotionClasses: ClassItem[];
  onSetDemotionClassId: (id: number | null) => void;
  onConfirmManualPromotion: (action: PromotionStatus, targetClassId?: number) => void;
  onCancel: () => void;
}

export function ManualPromotionDialog({
  open,
  onOpenChange,
  selectedStudent,
  demotionClassId,
  demotionClasses,
  onSetDemotionClassId,
  onConfirmManualPromotion,
  onCancel,
}: ManualPromotionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
                  {selectedStudent?.firstName} {selectedStudent?.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedStudent?.admissionNumber} • {selectedStudent?.className}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Average:</span>
                    <span className={`ml-1 font-semibold ${
                      (selectedStudent?.averageScore ?? 0) >= 50 ? 'text-emerald-600' :
                      (selectedStudent?.averageScore ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {selectedStudent?.averageScore?.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Attendance:</span>
                    <span className={`ml-1 font-semibold ${
                      (selectedStudent?.attendance ?? 0) >= 75 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {selectedStudent?.attendance?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-heading font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Promotion Options
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => onConfirmManualPromotion("Promoted")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Promote
                </Button>
                <Button
                  onClick={() => onConfirmManualPromotion("Conditional")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Conditional
                </Button>
                <Button
                  onClick={() => onConfirmManualPromotion("Repeated")}
                  className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Repeat
                </Button>
                <Button
                  onClick={() => onConfirmManualPromotion("On Hold")}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  On Hold
                </Button>
                <Button
                  onClick={() => onConfirmManualPromotion("Withdrawn")}
                  className="bg-gray-600 hover:bg-gray-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Withdrawn
                </Button>
                <Button
                  onClick={() => onConfirmManualPromotion("Pending Approval")}
                  className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending Approval
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-heading font-bold text-gray-900 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Demotion Options
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => onConfirmManualPromotion("Repeated")}
                  className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl shadow-md transition-all hover:shadow-lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Repeat
                </Button>
                <div className="flex gap-2">
                  <Select
                    value={demotionClassId?.toString() || ''}
                    onValueChange={(value: string) => onSetDemotionClassId(Number(value))}
                  >
                    <SelectTrigger className="h-12 border-gray-200 bg-white text-gray-900 rounded-xl focus:border-orange-500 focus:ring-orange-500">
                      <SelectValue placeholder="Demote to..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 rounded-xl">
                      {demotionClasses.map(cls => (
                        <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900 hover:bg-orange-50">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => onConfirmManualPromotion("Repeated", demotionClassId || undefined)}
                    disabled={!demotionClassId}
                    className="bg-orange-600 hover:bg-orange-700 text-white h-12 px-4 rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Repeat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="pt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-11 rounded-xl"
          >
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
