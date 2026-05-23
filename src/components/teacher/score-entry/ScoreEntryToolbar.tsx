import { Button } from '../../ui/button';
import { RefreshCw, FileDown, FileUp } from 'lucide-react';

interface ScoreEntryToolbarProps {
  onRefresh: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  isLocked: boolean;
  fileInputId: string;
}

export function ScoreEntryToolbar({ onRefresh, onExport, onImport, disabled, isLocked, fileInputId }: ScoreEntryToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <Button
        onClick={onRefresh}
        className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-3 sm:px-4 h-9 sm:h-auto flex items-center justify-center gap-2 w-full sm:w-auto"
        disabled={disabled}
      >
        <RefreshCw className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">Refresh Scores</span>
        <span className="sm:hidden whitespace-nowrap">Refresh</span>
      </Button>

      <Button
        onClick={onExport}
        className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg px-3 sm:px-4 h-9 sm:h-auto flex items-center justify-center gap-2 w-full sm:w-auto"
        disabled={disabled}
      >
        <FileDown className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">Export CSV</span>
        <span className="sm:hidden whitespace-nowrap">Export</span>
      </Button>

      <div>
        <input
          type="file"
          accept=".csv"
          onChange={onImport}
          className="hidden"
          disabled={disabled || isLocked}
          id={fileInputId}
        />
        <Button
          type="button"
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 sm:px-4 h-9 sm:h-auto flex items-center justify-center gap-2 w-full sm:w-auto"
          disabled={disabled || isLocked}
          onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <FileUp className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Import CSV</span>
          <span className="sm:hidden whitespace-nowrap">Import</span>
        </Button>
      </div>
    </div>
  );
}
