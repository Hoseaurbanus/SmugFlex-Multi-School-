import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Progress } from "../../ui/progress";
import { GraduationCap } from "lucide-react";

interface ConfirmPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  newAcademicYear: string;
  isPromoting: boolean;
  promotionProgress: number;
  onConfirm: () => void;
}

export function ConfirmPromotionDialog({
  open,
  onOpenChange,
  selectedCount,
  newAcademicYear,
  isPromoting,
  promotionProgress,
  onConfirm,
}: ConfirmPromotionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-full">
              <GraduationCap className="w-5 h-5 text-[#0A2540]" />
            </div>
            <AlertDialogTitle className="text-gray-900 text-lg">Confirm Student Promotion</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600">
            You are about to promote <span className="font-semibold text-gray-900">{selectedCount}</span> student(s) to the <span className="font-semibold text-gray-900">{newAcademicYear}</span> academic year.
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
            onClick={onConfirm}
            disabled={isPromoting}
            className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white"
          >
            {isPromoting ? 'Processing...' : 'Confirm Promotion'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
