import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';

interface ResultsFilterBarProps {
  selectedYear: string;
  selectedTerm: string;
  selectedClassId: string;
  searchQuery: string;
  academicYears: string[];
  classes: Array<{ id: number; name: string }>;
  filteredResultsCount: number;
  currentAcademicYear: string | null;
  currentTerm: string | null;
  onYearChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export const ResultsFilterBar = React.memo(function ResultsFilterBar({
  selectedYear,
  selectedTerm,
  selectedClassId,
  searchQuery,
  academicYears,
  classes,
  filteredResultsCount,
  currentAcademicYear,
  currentTerm,
  onYearChange,
  onTermChange,
  onClassChange,
  onSearchChange,
}: ResultsFilterBarProps) {
  return (
    <div className="section-band">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year} className="text-xs sm:text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Term</Label>
            <Select value={selectedTerm} onValueChange={onTermChange}>
              <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Term" className="text-xs sm:text-sm">First</SelectItem>
                <SelectItem value="Second Term" className="text-xs sm:text-sm">Second</SelectItem>
                <SelectItem value="Third Term" className="text-xs sm:text-sm">Third</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Class</Label>
            <Select value={selectedClassId} onValueChange={onClassChange}>
              <SelectTrigger className="h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()} className="text-xs sm:text-sm">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-600 mb-1 block">Search</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <Input
                placeholder="Student name..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-7 h-8 sm:h-9 rounded-lg border-gray-200 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Showing {filteredResultsCount} results
          </div>
          <div className="flex items-center gap-2">
            {selectedYear !== currentAcademicYear || selectedTerm !== currentTerm ? (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                <span className="w-3 h-3" />
                <span>Historical</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <span className="w-3 h-3" />
                <span>Current</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
