import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CapacitorHelper } from "../../utils/capacitorHelper";
import { TrendingUp, DollarSign, Users, CheckCircle, AlertCircle, Clock, Download, FileText } from 'lucide-react';

export function PaymentReportsPage() {
  const {
    students,
    classes,
    studentFeeBalances,
    currentTerm,
    currentAcademicYear,
    schoolSettings,
    getAllAcademicYears,
  } = useSchool();

  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterTerm, setFilterTerm] = useState<string>(currentTerm || "");
  const [filterYear, setFilterYear] = useState<string>(currentAcademicYear || "");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  // Load academic years dynamically
  useEffect(() => {
    const loadYears = async () => {
      const years = await getAllAcademicYears();
      setAcademicYears(years);
    };
    loadYears();
  }, [getAllAcademicYears]);

  const getFilteredData = (): any[] => {
    return studentFeeBalances.filter(
      (balance) =>
        (filterClass === "all" || balance.class_id === Number(filterClass)) &&
        balance.academic_year === filterYear &&
        balance.term === filterTerm &&
        (filterStatus === "all" || balance.status === filterStatus)
    );
  };

  const calculateStats = () => {
    const filteredBalances = getFilteredData();
    
    const totalExpected = filteredBalances.reduce((sum: number, b: any) => sum + b.total_fee_required, 0);
    const totalCollected = filteredBalances.reduce((sum: number, b: any) => sum + b.total_paid, 0);
    const totalOutstanding = filteredBalances.reduce((sum: number, b: any) => sum + b.balance, 0);
    
    const fullyPaid = filteredBalances.filter((b: any) => b.status === "Paid").length;
    const partiallyPaid = filteredBalances.filter((b: any) => b.status === "Partial").length;
    const unpaid = filteredBalances.filter((b: any) => b.status === "Unpaid").length;
    
    const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0";

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      fullyPaid,
      partiallyPaid,
      unpaid,
      collectionRate,
      totalStudents: filteredBalances.length,
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const stats = calculateStats();
    const filteredBalances = getFilteredData();

    // Header
    doc.setFontSize(18);
    doc.text(schoolSettings.school_name, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(schoolSettings.school_motto, 105, 22, { align: "center" });
    
    // Report Title
    doc.setFontSize(14);
    doc.text("Payment Report", 105, 32, { align: "center" });
    
    // Report Details
    doc.setFontSize(10);
    doc.text(`Term: ${filterTerm}`, 14, 42);
    doc.text(`Academic Year: ${filterYear}`, 14, 48);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 54);
    
    // Summary Stats
    doc.setFontSize(12);
    doc.text("Summary Statistics", 14, 65);
    doc.setFontSize(10);
    doc.text(`Total Expected: ₦${stats.totalExpected.toLocaleString()}`, 14, 72);
    doc.text(`Total Collected: ₦${stats.totalCollected.toLocaleString()}`, 14, 78);
    doc.text(`Outstanding: ₦${stats.totalOutstanding.toLocaleString()}`, 14, 84);
    doc.text(`Collection Rate: ${stats.collectionRate}%`, 14, 90);
    doc.text(`Total Students: ${stats.totalStudents}`, 110, 72);
    doc.text(`Fully Paid: ${stats.fullyPaid}`, 110, 78);
    doc.text(`Partially Paid: ${stats.partiallyPaid}`, 110, 84);
    doc.text(`Unpaid: ${stats.unpaid}`, 110, 90);

    // Table Data
    const tableData = filteredBalances.map((balance: any) => {
      const student = students.find((s) => s.id === balance.student_id);
      const classInfo = classes.find((c) => c.id === balance.class_id);
      
      return [
        student ? `${student.firstName} ${student.lastName}` : "N/A",
        classInfo?.name || "N/A",
        `\u20A6${balance.total_fee_required.toLocaleString()}`,
        `\u20A6${balance.total_paid.toLocaleString()}`,
        `\u20A6${balance.balance.toLocaleString()}`,
        balance.status,
      ];
    });

    autoTable(doc, {
      head: [["Student Name", "Class", "Required", "Paid", "Balance", "Status"]],
      body: tableData,
      startY: 100,
      theme: "grid",
      headStyles: { fillColor: [0, 124, 145] },
      styles: { fontSize: 8 },
    });

    doc.save(`Payment_Report_${filterTerm}_${filterYear}.pdf`);
    toast.success("Report exported successfully!");
  };

  const exportToCSV = async () => {
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const filteredBalances = getFilteredData();
    const stats = calculateStats();

    let csv = "Payment Report\n";
    csv += `${escapeCSV(schoolSettings.school_name)}\n`;
    csv += `Term: ${filterTerm}, Academic Year: ${filterYear}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    csv += "Summary Statistics\n";
    csv += `Total Expected,${stats.totalExpected}\n`;
    csv += `Total Collected,${stats.totalCollected}\n`;
    csv += `Outstanding,${stats.totalOutstanding}\n`;
    csv += `Collection Rate,${stats.collectionRate}%\n`;
    csv += `Total Students,${stats.totalStudents}\n`;
    csv += `Fully Paid,${stats.fullyPaid}\n`;
    csv += `Partially Paid,${stats.partiallyPaid}\n`;
    csv += `Unpaid,${stats.unpaid}\n\n`;

    csv += "Student Name,Admission Number,Class,Required,Paid,Balance,Status\n";
    
    filteredBalances.forEach((balance: any) => {
      const student = students.find((s) => s.id === balance.student_id);
      const classInfo = classes.find((c) => c.id === balance.class_id);
      
      csv += `${escapeCSV(student ? `${student.firstName} ${student.lastName}` : "N/A")},`;
      csv += `${escapeCSV(student?.admissionNumber || "N/A")},`;
      csv += `${escapeCSV(classInfo?.name || "N/A")},`;
      csv += `${balance.total_fee_required},`;
      csv += `${balance.total_paid},`;
      csv += `${balance.balance},`;
      csv += `${balance.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `Payment_Report_${filterTerm}_${filterYear}.csv`;
    await CapacitorHelper.downloadFile(blob, fileName, 'text/csv');
    
    toast.success("CSV exported successfully!");
  };

  const stats = calculateStats();
  const filteredBalances: any[] = getFilteredData();
  const activeClasses = classes.filter((c) => c.status === "Active");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payment Reports & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive payment reports and track collection performance</p>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Expected</p>
                <p className="text-2xl font-bold text-blue-800">₦{stats.totalExpected.toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-1">This term</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Collected</p>
                <p className="text-2xl font-bold text-green-800">₦{stats.totalCollected.toLocaleString()}</p>
                <p className="text-xs text-green-500 mt-1">Received payments</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-orange-100 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Outstanding</p>
                <p className="text-2xl font-bold text-orange-800">₦{stats.totalOutstanding.toLocaleString()}</p>
                <p className="text-xs text-orange-500 mt-1">Pending payments</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-purple-100 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-800">{stats.collectionRate}%</p>
                <p className="text-xs text-purple-500 mt-1">Performance</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Payment Status</h3>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fully Paid</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {stats.fullyPaid} students
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Partially Paid</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stats.partiallyPaid} students
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unpaid</span>
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  {stats.unpaid} students
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Quick Actions</h3>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <Button onClick={exportToPDF} className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export PDF Report
              </Button>
              <Button onClick={exportToCSV} className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Summary</h3>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Students:</span>
                <span className="font-medium">{stats.totalStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Collection Rate:</span>
                <span className="font-medium">{stats.collectionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding:</span>
                <span className="font-medium text-red-600">₦{stats.totalOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 text-[#007C91]" />
            <CardTitle className="text-[#1F2937]">Report Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Term</Label>
              <Select value={filterTerm} onValueChange={setFilterTerm}>
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
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.length > 0 ? (
                    academicYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="2023/2024">2023/2024</SelectItem>
                      <SelectItem value="2024/2025">2024/2025</SelectItem>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Payment Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Paid">Fully Paid</SelectItem>
                  <SelectItem value="Partial">Partially Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              onClick={exportToPDF}
              className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl shadow-clinical"
            >
              <span className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="border-[#007C91] text-[#007C91] hover:bg-[#007C91]/10 rounded-xl"
            >
              <span className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="rounded-xl bg-gradient-to-br from-[#007C91] to-[#006073] text-white shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="w-6 h-6" />
              </div>
              <span className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-white/80 text-sm mb-1">Total Expected</p>
            <h3 className="text-white">₦{stats.totalExpected.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="w-6 h-6" />
              </div>
              <span className="text-sm opacity-80">{stats.collectionRate}%</span>
            </div>
            <p className="text-white/80 text-sm mb-1">Total Collected</p>
            <h3 className="text-white">₦{stats.totalCollected.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="w-6 h-6" />
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">Outstanding</p>
            <h3 className="text-white">₦{stats.totalOutstanding.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-gradient-to-br from-[#F4B400] to-[#F59E0B] text-white shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="w-6 h-6" />
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">Total Students</p>
            <h3 className="text-white">{stats.totalStudents}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Breakdown */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Fully Paid</p>
                <h3 className="text-[#10B981]">{stats.fullyPaid}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                <span className="text-[#10B981]">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Partially Paid</p>
                <h3 className="text-[#F59E0B]">{stats.partiallyPaid}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <span className="text-[#F59E0B]">◐</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Unpaid</p>
                <h3 className="text-[#EF4444]">{stats.unpaid}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                <span className="text-[#EF4444]">✗</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 text-[#007C91]" />
            <CardTitle className="text-[#1F2937]">Detailed Payment Report</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#007C91] text-white">
                  <th className="text-left p-4">Student Name</th>
                  <th className="text-left p-4">Class</th>
                  <th className="text-right p-4">Required</th>
                  <th className="text-right p-4">Paid</th>
                  <th className="text-right p-4">Balance</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-[#6B7280]">
                      No payment records found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((balance: any) => {
                    const student = students.find((s) => s.id === balance.student_id);
                    const classInfo = classes.find((c) => c.id === balance.class_id);
                    
                    return (
                      <tr key={balance.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-4 text-[#1F2937]">
                          {student ? `${student.firstName} ${student.lastName}` : "N/A"}
                        </td>
                        <td className="p-4 text-[#6B7280]">{classInfo?.name || "N/A"}</td>
                        <td className="p-4 text-right text-[#1F2937]">
                          {"\u20A6"}{balance.total_fee_required.toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-[#10B981]">
                          {"\u20A6"}{balance.total_paid.toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-[#EF4444]">
                          {"\u20A6"}{balance.balance.toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            className={`rounded-full ${
                              balance.status === "Paid"
                                ? "bg-[#10B981] text-white"
                                : balance.status === "Partial"
                                ? "bg-[#F59E0B] text-white"
                                : "bg-[#EF4444] text-white"
                            }`}
                          >
                            {balance.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
