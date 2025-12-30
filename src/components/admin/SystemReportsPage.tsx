import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function SystemReportsPage() {
  const { students, teachers, classes, payments, compiledResults, subjects } = useSchool();
  const [selectedReport, setSelectedReport] = useState<string>("enrollment");

  const generateReport = (reportType: string) => {
    toast.success(`Generating ${reportType} report...`);
  };

  // Calculate statistics
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const activeTeachers = teachers.filter(t => t.status === 'Active').length;
  const totalRevenue = payments.filter(p => p.status === 'Verified').reduce((sum, p) => sum + p.amount, 0);
  const approvedResults = compiledResults.filter(r => r.status === 'Approved').length;

  const reportCategories = [
    {
      id: "enrollment",
      title: "Enrollment Report",
      description: "Student enrollment statistics by class and term",
      icon: <span className="w-5 h-5" />,
      color: "bg-[#3B82F6]",
    },
    {
      id: "academic",
      title: "Academic Performance",
      description: "Class performance and result analysis",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "bg-[#10B981]",
    },
    {
      id: "financial",
      title: "Financial Report",
      description: "Revenue, payments, and outstanding balances",
      icon: <span className="w-5 h-5" />,
      color: "bg-[#F59E0B]",
    },
    {
      id: "staff",
      title: "Staff Report",
      description: "Teacher assignments and workload analysis",
      icon: <span className="w-5 h-5" />,
      color: "bg-[#8B5CF6]",
    },
    {
      id: "results",
      title: "Results Summary",
      description: "Compiled results and approval status",
      icon: <span className="w-5 h-5" />,
      color: "bg-[#EF4444]",
    },
    {
      id: "custom",
      title: "Custom Report",
      description: "Generate custom reports with filters",
      icon: <span className="w-5 h-5" />,
      color: "bg-[#6B7280]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">System Reports</h1>
        <p className="text-[#6B7280]">Generate comprehensive reports and analytics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Students</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{activeStudents}</p>
            <p className="text-xs text-[#10B981]">Active enrollment</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Teaching Staff</p>
              <GraduationCap className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{activeTeachers}</p>
            <p className="text-xs text-[#10B981]">Active teachers</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Total Revenue</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">₦{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-[#10B981]">Verified payments</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6B7280] text-sm">Approved Results</p>
              <span className="w-5 h-5 text-[#EF4444]" />
            </div>
            <p className="text-[#1F2937] mb-1 font-semibold">{approvedResults}</p>
            <p className="text-xs text-[#6B7280]">This term</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCategories.map((report) => (
          <Card
            key={report.id}
            className={`rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift cursor-pointer ${
              selectedReport === report.id ? "ring-2 ring-[#3B82F6]" : ""
            }`}
            onClick={() => setSelectedReport(report.id)}
          >
            <CardContent className="p-6">
              <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-4 text-white`}>
                {report.icon}
              </div>
              <h3 className="text-[#1F2937] font-semibold mb-2">{report.title}</h3>
              <p className="text-[#6B7280] text-sm mb-4">{report.description}</p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  generateReport(report.title);
                }}
                className="w-full bg-[#3B82F6] text-white hover:bg-[#2563EB] h-10 rounded-lg shadow-clinical transition-all"
              >
                <span className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enrollment Breakdown */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="bg-[#3B82F6] rounded-t-lg p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Enrollment by Class</h3>
            <Button className="h-8 px-4 bg-white text-[#3B82F6] hover:bg-[#F9FAFB] rounded-lg">
              <span className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {classes.map((cls) => {
              const classStudents = students.filter(s => s.class_id === cls.id && s.status === 'Active');
              const percentage = cls.capacity > 0 ? (classStudents.length / cls.capacity) * 100 : 0;

              return (
                <div key={cls.id} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-[#1F2937] font-medium">{cls.name}</h4>
                      <p className="text-[#6B7280] text-sm">
                        {classStudents.length} / {cls.capacity} students
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#3B82F6] font-semibold">{percentage.toFixed(0)}%</p>
                      <p className="text-[#6B7280] text-xs">Capacity</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                    <div
                      className="bg-[#3B82F6] h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Academic Performance Summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#1F2937] font-semibold">Subject Overview</h3>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {subjects.slice(0, 5).map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div>
                  <p className="text-[#1F2937] font-medium">{subject.name}</p>
                  <p className="text-xs text-[#6B7280]">{subject.code} • {subject.department}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${subject.is_core ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-[#1F2937] font-semibold">Class Teacher Distribution</h3>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {classes.slice(0, 5).map((cls) => {
              const teacher = teachers.find(t => t.id === cls.classTeacherId);
              return (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div>
                    <p className="text-[#1F2937] font-medium">{cls.name}</p>
                    <p className="text-xs text-[#6B7280]">{cls.currentStudents} students</p>
                  </div>
                  <p className="text-[#3B82F6] text-sm">
                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
