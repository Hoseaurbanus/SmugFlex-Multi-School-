import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function SetFeesPage() {
  const { 
    classes, 
    currentTerm, 
    currentAcademicYear, 
    addFeeStructure, 
    updateFeeStructure, 
    getFeeStructureByClass,
    feeStructures,
    autoGenerateInvoices,
    getAllAcademicYears
  } = useSchool();

  const NAIRA = "₦";

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm || 'First Term');
  const [selectedYear, setSelectedYear] = useState<string>(currentAcademicYear || '');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFeeStructureId, setEditingFeeStructureId] = useState<number | null>(null);

  useEffect(() => {
    if (currentTerm) setSelectedTerm(currentTerm);
    if (currentAcademicYear) setSelectedYear(currentAcademicYear);
  }, [currentTerm, currentAcademicYear]);

  // Load academic years on component mount
  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const years = await getAllAcademicYears();
        setAcademicYears(years);
      } catch (error) {
        // Fallback to some default years if API fails
        setAcademicYears(['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028']);
      }
    };
    loadAcademicYears();
  }, [getAllAcademicYears]);

  const [fees, setFees] = useState({
    tuition_fee: "",
    development_levy: "",
    sports_fee: "",
    exam_fee: "",
    books_fee: "",
    uniform_fee: "",
    transport_fee: "",
  });

  const feeFields: Array<{ key: keyof typeof fees; label: string }> = [
    { key: 'tuition_fee', label: `Tuition Fee (${NAIRA})` },
    { key: 'development_levy', label: `Development Levy (${NAIRA})` },
    { key: 'sports_fee', label: `Sports Fee (${NAIRA})` },
    { key: 'exam_fee', label: `Exam Fee (${NAIRA})` },
    { key: 'books_fee', label: `Books Fee (${NAIRA})` },
    { key: 'uniform_fee', label: `Uniform Fee (${NAIRA})` },
    { key: 'transport_fee', label: `Transport Fee (${NAIRA})` },
  ];

  const loadExistingFeeStructure = (classId: string, term: string, year: string) => {
    if (!classId || !term || !year) return;

    const existing = getFeeStructureByClass(Number(classId), term, year);
    if (existing) {
      setEditingFeeStructureId(existing.id);
      setFees({
        tuition_fee: existing.tuition_fee.toString(),
        development_levy: existing.development_levy.toString(),
        sports_fee: existing.sports_fee.toString(),
        exam_fee: existing.exam_fee.toString(),
        books_fee: existing.books_fee.toString(),
        uniform_fee: existing.uniform_fee.toString(),
        transport_fee: existing.transport_fee.toString(),
      });
    } else {
      setEditingFeeStructureId(null);
      setFees({
        tuition_fee: "",
        development_levy: "",
        sports_fee: "",
        exam_fee: "",
        books_fee: "",
        uniform_fee: "",
        transport_fee: "",
      });
    }
  };

  useEffect(() => {
    if (!selectedClassId) return;
    if (!selectedTerm || !selectedYear) return;
    loadExistingFeeStructure(selectedClassId, selectedTerm, selectedYear);
  }, [selectedClassId, selectedTerm, selectedYear]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);

    if (!selectedTerm || !selectedYear) {
      return;
    }

    loadExistingFeeStructure(classId, selectedTerm, selectedYear);
  };

  const handleFeeChange = (field: keyof typeof fees, value: string) => {
    const cleaned = String(value ?? '').replace(/[^0-9]/g, '');
    setFees(prev => ({ ...prev, [field]: cleaned }));
  };

  const calculateTotal = () => {
    const total = Object.values(fees).reduce((sum, val) => sum + (val ? parseInt(val) : 0), 0);
    return total || 0;
  };

  const handleClearForm = () => {
    setEditingFeeStructureId(null);
    setFees({
      tuition_fee: "",
      development_levy: "",
      sports_fee: "",
      exam_fee: "",
      books_fee: "",
      uniform_fee: "",
      transport_fee: "",
    });
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    const totalFee = calculateTotal();
    if (totalFee === 0) {
      toast.error("Please enter at least one fee amount");
      return;
    }

    if (!selectedTerm || !selectedYear) {
      toast.error('Current term and academic year are required');
      return;
    }

    const selectedClass = classes.find(c => c.id === Number(selectedClassId));
    if (!selectedClass) {
      toast.error("Selected class not found");
      return;
    }

    setIsSaving(true);
    
    try {
      const feeData = {
        class_id: Number(selectedClassId),
        class_name: selectedClass.name,
        level: selectedClass.level,
        term: selectedTerm,
        academic_year: selectedYear,
        tuition_fee: parseInt(fees.tuition_fee || "0"),
        development_levy: parseInt(fees.development_levy || "0"),
        sports_fee: parseInt(fees.sports_fee || "0"),
        exam_fee: parseInt(fees.exam_fee || "0"),
        books_fee: parseInt(fees.books_fee || "0"),
        uniform_fee: parseInt(fees.uniform_fee || "0"),
        transport_fee: parseInt(fees.transport_fee || "0"),
        total_fee: calculateTotal(),
      };

      // Check if updating existing or creating new
      const existing = getFeeStructureByClass(Number(selectedClassId), selectedTerm, selectedYear);
      
      if (existing) {
        await updateFeeStructure(existing.id, feeData);
        let invoicesOk = true;
        try {
          await autoGenerateInvoices(Number(selectedClassId), selectedTerm, selectedYear);
        } catch (e) {
          invoicesOk = false;
        }

        if (invoicesOk) {
          toast.success("Fee structure updated successfully and invoices refreshed.");
        } else {
          toast.success("Fee structure updated successfully.");
          toast.warning("Invoices could not be refreshed automatically. Please try again.");
        }
      } else {
        const newFeeId = await addFeeStructure(feeData);
        let invoicesOk = true;
        try {
          await autoGenerateInvoices(Number(selectedClassId), selectedTerm, selectedYear);
        } catch (e) {
          invoicesOk = false;
        }

        if (invoicesOk) {
          toast.success("Fee structure created successfully and invoices generated.");
        } else {
          toast.success("Fee structure created successfully.");
          toast.warning("Invoices could not be generated automatically. Please try again.");
        }
      }
    } catch (error: any) {
      // Display specific validation error message if available
      const errorMessage = error?.message || "Failed to save fee structure. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const activeClasses = classes.filter(c => c.status === 'Active');

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Set Fee Structure</h1>
        <p className="text-[#6B7280]">Define and manage school fees per class and term</p>
      </div>

      <Alert className="bg-[#007C91]/10 border-[#007C91] rounded-xl">
        <span className="h-4 w-4 text-[#007C91]" />
        <AlertDescription className="text-[#007C91]">
          Set fees for each class and term. Parents will see these fees in real-time on their dashboard.
        </AlertDescription>
      </Alert>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-[#1F2937]">Fee Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div className="text-sm text-[#6B7280]">
              {selectedClassId && selectedTerm && selectedYear ? (
                editingFeeStructureId ? (
                  <span>Editing existing fee structure (ID: {editingFeeStructureId})</span>
                ) : (
                  <span>Creating new fee structure</span>
                )
              ) : (
                <span>Select class, term, and academic year to begin</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={handleClearForm}
                disabled={isSaving}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Class</Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} ({cls.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        <div className="grid md:grid-cols-2 gap-6">
          {feeFields.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-[#1F2937] mb-2 block">{label}</Label>
              <Input
                inputMode="numeric"
                type="text"
                value={fees[key]}
                onChange={(e) => handleFeeChange(key, e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#007C91]/10 rounded-lg border border-[#007C91]">
          <div className="flex items-center justify-between">
            <span className="text-[#1F2937]">Total Fee</span>
            <span className="text-[#007C91]">{NAIRA}{calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl shadow-clinical hover:shadow-clinical-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Fee Structure"}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Existing Fee Structures */}
    <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
      <CardHeader className="p-6 border-b border-[#E5E7EB]">
        <CardTitle className="text-[#1F2937]">Existing Fee Structures</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#007C91] text-white">
                <th className="text-left p-4">Class</th>
                <th className="text-left p-4">Level</th>
                <th className="text-left p-4">Term</th>
                <th className="text-left p-4">Year</th>
                <th className="text-right p-4">Total Fee</th>
              </tr>
            </thead>
            <tbody>
              {feeStructures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-[#6B7280]">
                    No fee structures created yet
                  </td>
                </tr>
              ) : (
                feeStructures.map((fee) => (
                  <tr
                    key={fee.id}
                    className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer"
                    onClick={() => {
                      setSelectedClassId(String(fee.class_id));
                      setSelectedTerm(String(fee.term));
                      setSelectedYear(String(fee.academic_year));
                      loadExistingFeeStructure(String(fee.class_id), String(fee.term), String(fee.academic_year));
                      toast.success('Loaded fee structure for editing');
                    }}
                  >
                    <td className="p-4 text-[#1F2937]">{fee.class_name}</td>
                    <td className="p-4 text-[#6B7280]">{fee.level}</td>
                    <td className="p-4 text-[#6B7280]">{fee.term}</td>
                    <td className="p-4 text-[#6B7280]">{fee.academic_year}</td>
                    <td className="p-4 text-right text-[#007C91]">{NAIRA}{(fee.total_fee || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);
}
