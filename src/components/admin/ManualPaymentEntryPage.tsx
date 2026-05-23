import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function ManualPaymentEntryPage() {
  const { students, classes, addPayment, currentAcademicYear, currentTerm } = useSchool();

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [term, setTerm] = useState<string>(currentTerm);
  const [description, setDescription] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get active classes
  const activeClasses = classes.filter(c => c.status === 'Active');

  // Filter students by selected class and search
  const filteredStudents = students.filter((s) => {
    const matchesClass = !selectedClassId || s.class_id === Number(selectedClassId);
    if (!searchQuery) return matchesClass;
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (s.firstName && s.firstName.toLowerCase().includes(query)) ||
      (s.lastName && s.lastName.toLowerCase().includes(query)) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(query))
    );
    return matchesClass && matchesSearch;
  });

  // Get students count per class
  const getStudentCount = (classId: number) => {
    return students.filter(s => s.class_id === classId && s.status === 'Active').length;
  };

  const selectedStudent = students.find((s) => s.id === Number(selectedStudentId));

  // Handle class change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudentId(""); // Reset student selection when class changes
  };

  // Generate receipt number
  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `RCP${year}${month}${random}`;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!paymentDate) {
      toast.error("Please select payment date");
      return;
    }

    const receipt = receiptNumber || generateReceiptNumber();

    try {
      await addPayment({
        student_id: Number(selectedStudentId),
        student_name: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "",
        amount: Number(amount),
        payment_type: "School Fees",
        term,
        academic_year: currentAcademicYear,
        payment_method: "Cash",
        reference: receipt,
        recorded_date: `${paymentDate} 00:00:00`,
        notes: description || `School fees payment - ${term} ${currentAcademicYear}`,
        transaction_reference: receipt,
      });

      toast.success(
        `Payment of ₦${Number(amount).toLocaleString()} recorded successfully! Receipt: ${receipt}`
      );

      // Reset form
      setSelectedStudentId("");
      setSelectedClassId("");
      setAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setReceiptNumber("");
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#0A2540] mb-2">Manual Payment Entry</h1>
        <p className="text-gray-600">Record cash payments for student fees</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Entry Form */}
        <Card className="border-[#0A2540]/10">
          <CardHeader className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <span className="w-5 h-5" />
              Enter Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Class Selection */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">
                Select Class
              </Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue placeholder="Select class first" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} ({getStudentCount(cls.id)} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Selection */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">
                Search Student *
              </Label>
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or admission number"
                  className="h-12 pl-10 rounded-xl border-[#0A2540]/20"
                  disabled={!selectedClassId}
                />
              </div>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue placeholder={selectedClassId ? "Select student" : "Select class first"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {filteredStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.firstName} {student.lastName} - {student.admissionNumber} ({student.className})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">Amount (₦) *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-12 rounded-xl border-[#0A2540]/20"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Date */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-12 rounded-xl border-[#0A2540]/20"
              />
            </div>

            {/* Term */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">Term *</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="h-12 rounded-xl border-[#0A2540]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Receipt Number (Optional) */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">
                Receipt Number (Optional)
              </Label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Auto-generated if left blank"
                className="h-12 rounded-xl border-[#0A2540]/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to auto-generate
              </p>
            </div>

            {/* Description */}
            <div>
              <Label className="text-[#0A2540] mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes or description"
                className="min-h-24 rounded-xl border-[#0A2540]/20"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <div className="space-y-6">
          {/* Selected Student Info */}
          {selectedStudent && (
            <Card className="border-[#0A2540]/10">
              <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <span className="w-5 h-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-2xl font-bold">
                    {selectedStudent.firstName[0]}
                    {selectedStudent.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[#0A2540] font-bold text-lg">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-gray-600">{selectedStudent.admissionNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Class</p>
                    <p className="text-[#0A2540] font-medium">
                      {selectedStudent.className}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Level</p>
                    <p className="text-[#0A2540] font-medium">
                      {selectedStudent.level}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="text-[#0A2540] font-medium">
                      {selectedStudent.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-[#0A2540] font-medium">
                      {selectedStudent.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          {selectedStudent && amount && (
            <Card className="border-[#0A2540]/10">
              <CardHeader className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <span className="w-5 h-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-900 mb-1">Amount to Record</p>
                  <p className="text-3xl text-green-900 font-bold">
                    ₦{Number(amount).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Student:</span>
                    <span className="text-[#0A2540] font-medium">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Admission No:</span>
                    <span className="text-[#0A2540] font-medium">
                      {selectedStudent.admissionNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Class:</span>
                    <span className="text-[#0A2540] font-medium">
                      {selectedStudent.className}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Date:</span>
                    <span className="text-[#0A2540] font-medium">
                      {new Date(paymentDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Term:</span>
                    <span className="text-[#0A2540] font-medium">{term}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="text-[#0A2540] font-medium">Cash</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Receipt Number:</span>
                    <span className="text-[#0A2540] font-medium">
                      {receiptNumber || "Auto-generated"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <span className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-blue-900 font-medium mb-2">Instructions</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Select the student who made the payment</li>
                    <li>• Enter the exact amount received in cash</li>
                    <li>• Verify the payment date is correct</li>
                    <li>• Select the appropriate term</li>
                    <li>• Receipt number will be auto-generated if not provided</li>
                    <li>• Payment will be marked as "Verified" immediately</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
