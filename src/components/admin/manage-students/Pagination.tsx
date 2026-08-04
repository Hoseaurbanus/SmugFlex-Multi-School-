import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Trash2 } from "lucide-react";

interface PaginationProps {
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (filteredCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        Showing {Math.min(filteredCount, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredCount, currentPage * pageSize)} of {filteredCount}
      </div>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v) || 20)}>
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
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  actionLoading: string | null;
}

export function BulkActionsBar({ selectedCount, onClear, onDelete, actionLoading }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-[#F5F6F8] border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#0A2540]">
            {selectedCount} student{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClear} variant="outline" size="sm">
            Clear Selection
          </Button>
          <Button
            onClick={onDelete}
            variant="destructive"
            size="sm"
            disabled={actionLoading === 'bulk-delete'}
          >
            {actionLoading === 'bulk-delete' ? (
              <div className="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
