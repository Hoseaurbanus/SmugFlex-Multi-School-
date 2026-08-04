import React from 'react';
import { Button } from '../../ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export const BulkActionsBar = React.memo(function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onApprove,
  onReject,
}: BulkActionsBarProps) {
  return (
    <div className="section-band mb-3">
      <div className="p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCount === totalCount && totalCount > 0}
                onChange={onSelectAll}
                className="w-4 h-4 text-[#0A2540] rounded border-gray-300"
                aria-label="Select all results"
              />
              <span className="sr-only">Select all results</span>
            </label>
            <span className="text-xs sm:text-sm text-gray-600">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={selectedCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 sm:h-8 text-xs"
            >
              <span className="w-3 h-3 mr-1" />
              Approve ({selectedCount})
            </Button>
            <Button
              size="sm"
              onClick={onReject}
              disabled={selectedCount === 0}
              variant="destructive"
              className="h-7 sm:h-8 text-xs"
            >
              <span className="w-3 h-3 mr-1" />
              Reject ({selectedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
