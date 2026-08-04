import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Student } from "../../../types/school";

interface ConfirmationDialogsProps {
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  bulkDeleteDialogOpen: boolean;
  onBulkDeleteDialogChange: (open: boolean) => void;
  unlinkDialogOpen: boolean;
  onUnlinkDialogChange: (open: boolean) => void;
  selectedStudent: Student | null;
  selectedStudents: number[];
  actionLoading: string | null;
  onDelete: () => void;
  onBulkDelete: () => void;
  onUnlink: () => void;
}

export function ConfirmationDialogs({
  deleteDialogOpen,
  onDeleteDialogChange,
  bulkDeleteDialogOpen,
  onBulkDeleteDialogChange,
  unlinkDialogOpen,
  onUnlinkDialogChange,
  selectedStudent,
  selectedStudents,
  actionLoading,
  onDelete,
  onBulkDelete,
  onUnlink,
}: ConfirmationDialogsProps) {
  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogChange}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStudent?.firstName} {selectedStudent?.lastName}"?
              This action cannot be undone and will permanently remove all student data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={actionLoading === "delete"}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading === "delete" ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={onBulkDeleteDialogChange}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Students</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedStudents.length} student(s)? This action cannot be undone and will permanently remove all student data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              disabled={actionLoading === 'bulk-delete'}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading === 'bulk-delete' ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={onUnlinkDialogChange}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Guardian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink {selectedStudent?.firstName} {selectedStudent?.lastName} from their parent/guardian?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={onUnlink}
              disabled={actionLoading === 'unlink'}
              className="bg-[#0A2540] hover:bg-[#0A2540]/90"
            >
              {actionLoading === 'unlink' ? (
                <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
              ) : null}
              Unlink
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
