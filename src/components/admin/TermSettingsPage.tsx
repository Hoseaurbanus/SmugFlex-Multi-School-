import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function TermSettingsPage() {
    const {
    currentTerm,
    currentAcademicYear,
    updateCurrentTerm,
    updateCurrentAcademicYear,
    updateCurrentTermAndYear,
    updateAttendanceRequirements,
    getAttendanceRequirements,
    loadAttendanceRequirements,
    attendanceRequirements,
    updateTermDates,
    getTermDates,
    loadTermDates,
    currentUser
  } = useSchool();
  const [settings, setSettings] = useState({
    academicYear: currentAcademicYear || "2025/2026",
    currentTerm: currentTerm || "First Term",
    termStartDate: "2025-09-01",
    termEndDate: "2025-12-15",
    nextTermStarts: "2026-01-10",
    schoolResumptionDate: "2025-09-01",
    midTermBreakStart: "2025-10-25",
    midTermBreakEnd: "2025-11-01",
    // Attendance settings
    attendanceRequirements: getAttendanceRequirements()
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load attendance requirements and term dates from database when component loads and user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadAttendanceRequirements();
      loadTermDates();
    }
  }, [currentUser]); // Remove loadAttendanceRequirements and loadTermDates from dependencies

  // Update local state when attendance requirements change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      attendanceRequirements: getAttendanceRequirements()
    }));
  }, [attendanceRequirements]); // Use the state, not the function

  // Update local state when term dates change
  useEffect(() => {
    const termDates = getTermDates();
    setSettings(prev => ({
      ...prev,
      termStartDate: termDates.termStartDate,
      termEndDate: termDates.termEndDate,
      nextTermStarts: termDates.nextTermStarts,
      schoolResumptionDate: termDates.schoolResumptionDate,
      midTermBreakStart: termDates.midTermBreakStart,
      midTermBreakEnd: termDates.midTermBreakEnd
    }));
  }, [getTermDates]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateCurrentTermAndYear(settings.academicYear, settings.currentTerm);
      await updateAttendanceRequirements(settings.attendanceRequirements);
      
      // Save term dates
      await updateTermDates({
        termStartDate: settings.termStartDate,
        termEndDate: settings.termEndDate,
        nextTermStarts: settings.nextTermStarts,
        schoolResumptionDate: settings.schoolResumptionDate,
        midTermBreakStart: settings.midTermBreakStart,
        midTermBreakEnd: settings.midTermBreakEnd
      });
      
      toast.success("Term and attendance settings updated successfully!");
    } catch (error) {
      console.error('Error saving term settings:', error);
      toast.error("Failed to save term and attendance settings");
    } finally {
      setIsLoading(false);
    }
  };

  const termOptions = ["First Term", "Second Term", "Third Term"];
  
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Term & Session Settings</h1>
        <p className="text-[#6B7280]">Configure academic year, term dates and school calendar</p>
      </div>

      {/* System Control Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">System Control Notice</h3>
              <p className="text-xs text-amber-700">
                These settings control the entire system. All teachers, students, and other roles will only be able to access and work with the current academic year and term you set here. Only administrators can view and manage historical data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Session Info */}
      <Card className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] border-0 text-white shadow-clinical">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Current Academic Session</p>
              <h2 className="text-2xl font-semibold">{settings.academicYear}</h2>
              <p className="text-white/90">{settings.currentTerm}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Year Settings */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h2 className="font-semibold text-[#1F2937]">Academic Year Settings</h2>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                placeholder="2025/2026"
                className="rounded-lg"
              />
              <p className="text-xs text-[#6B7280] mt-1">Format: YYYY/YYYY</p>
            </div>

            <div>
              <Label htmlFor="currentTerm">Current Term</Label>
              <Select
                value={settings.currentTerm}
                onValueChange={(value: string) => setSettings({ ...settings, currentTerm: value })}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((term) => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={isLoading} className="w-full rounded-lg bg-[#3B82F6] hover:bg-[#2563EB]">
              <span className="w-4 h-4 mr-2" />
              {isLoading ? "Updating..." : "Update Academic Year"}
            </Button>
          </CardContent>
        </Card>

        {/* Term Dates */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h2 className="font-semibold text-[#1F2937]">Term Dates</h2>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="termStart">Term Start Date</Label>
              <Input
                id="termStart"
                type="date"
                value={settings.termStartDate}
                onChange={(e) => setSettings({ ...settings, termStartDate: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="termEnd">Term End Date</Label>
              <Input
                id="termEnd"
                type="date"
                value={settings.termEndDate}
                onChange={(e) => setSettings({ ...settings, termEndDate: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="nextTerm">Next Term Starts</Label>
              <Input
                id="nextTerm"
                type="date"
                value={settings.nextTermStarts}
                onChange={(e) => setSettings({ ...settings, nextTermStarts: e.target.value })}
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Break Periods */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h2 className="font-semibold text-[#1F2937]">Break Periods</h2>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="midTermStart">Mid-Term Break Start</Label>
              <Input
                id="midTermStart"
                type="date"
                value={settings.midTermBreakStart}
                onChange={(e) => setSettings({ ...settings, midTermBreakStart: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="midTermEnd">Mid-Term Break End</Label>
              <Input
                id="midTermEnd"
                type="date"
                value={settings.midTermBreakEnd}
                onChange={(e) => setSettings({ ...settings, midTermBreakEnd: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="resumption">School Resumption Date</Label>
              <Input
                id="resumption"
                type="date"
                value={settings.schoolResumptionDate}
                onChange={(e) => setSettings({ ...settings, schoolResumptionDate: e.target.value })}
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Requirements */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-gradient-to-r from-[#10B981] to-[#059669] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Attendance Requirements</h2>
                <p className="text-white/80 text-sm">Set total required attendance days per term</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {termOptions.map((term) => (
              <div key={term} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div>
                  <Label className="text-sm font-medium text-[#1F2937]">{term} Required Days</Label>
                  <p className="text-xs text-[#6B7280]">Total days student must be present</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={settings.attendanceRequirements[term as keyof typeof settings.attendanceRequirements]}
                    onChange={(e) => setSettings({
                      ...settings,
                      attendanceRequirements: {
                        ...settings.attendanceRequirements,
                        [term]: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-20 text-center rounded-lg"
                  />
                  <span className="text-sm text-[#6B7280]">days</span>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> These settings will be used in the Compile Results page to calculate attendance ratios (e.g., 58/60).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Term Summary */}
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h2 className="font-semibold text-[#1F2937]">Term Summary</h2>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-[#6B7280]">Academic Year</p>
                <p className="font-semibold text-[#1F2937]">{settings.academicYear}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-[#6B7280]">Current Term</p>
                <p className="font-semibold text-[#1F2937]">{settings.currentTerm}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-[#6B7280]">Term Duration</p>
                <p className="font-semibold text-[#1F2937]">
                  {settings.termStartDate} to {settings.termEndDate}
                </p>
              </div>
              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                <p className="text-sm text-[#3B82F6]">Next Term Begins</p>
                <p className="font-semibold text-[#1F2937]">{settings.nextTermStarts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
