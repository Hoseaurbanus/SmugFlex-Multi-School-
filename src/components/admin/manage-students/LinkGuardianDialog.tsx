import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Student } from "../../../types/school";

interface LinkGuardianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent: Student | null;
  selectedParentId: string | null;
  onParentChange: (id: string | null) => void;
  parents: any[];
  parentStudentLinks: any[];
  onLink: () => void;
  actionLoading: string | null;
}

export function LinkGuardianDialog({
  open,
  onOpenChange,
  selectedStudent,
  selectedParentId,
  onParentChange,
  parents,
  parentStudentLinks,
  onLink,
  actionLoading,
}: LinkGuardianDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Link Guardian</DialogTitle>
          <DialogDescription>
            Link {selectedStudent?.firstName} {selectedStudent?.lastName} to a parent/guardian
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Parent/Guardian</Label>
            <Select value={selectedParentId || ""} onValueChange={onParentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a parent" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(parents) && parents
                  .filter(p => !Array.isArray(parentStudentLinks) || !parentStudentLinks.some(link =>
                    Number(link.parent_id) === Number(p.id) && Number(link.student_id) === Number(selectedStudent?.id)
                  ))
                  .map((parent) => (
                  <SelectItem key={parent.id} value={parent.id.toString()}>
                    {parent.firstName} {parent.lastName} - {parent.email}
                  </SelectItem>
                ))}
                {Array.isArray(parents) && parents.filter(p =>
                  Array.isArray(parentStudentLinks) && parentStudentLinks.some(link =>
                    Number(link.parent_id) === Number(p.id) && Number(link.student_id) === Number(selectedStudent?.id)
                  )
                ).length > 0 && (
                  <div className="px-2 py-1.5 text-xs text-gray-400 italic border-t border-gray-100 mt-1 pt-2">
                    All available parents shown — already linked parents are hidden
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onLink}
            disabled={actionLoading === 'link-guardian' || !selectedParentId}
          >
            {actionLoading === 'link-guardian' && (
              <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
            )}
            Link Guardian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
