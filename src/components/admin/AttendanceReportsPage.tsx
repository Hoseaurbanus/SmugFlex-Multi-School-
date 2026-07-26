import { useState } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { CapacitorHelper } from '../../utils/capacitorHelper';

export function AttendanceReportsPage() {
  const {
    classes,
    students,
    attendances,
    currentTerm,
    currentAcademicYear,
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'class' | 'student' | 'daily'>('class');

  const filteredAttendances = attendances.filter(a => {
    const matchesClass = selectedClassId === 0 || a.classId === selectedClassId;
    const matchesDateRange = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
    const matchesTerm = a.term === currentTerm && a.academicYear === currentAcademicYear;
    return matchesClass && matchesDateRange && matchesTerm;
  });

  const totalRecords = filteredAttendances.length;
  const presentCount = filteredAttendances.filter(a => a.status === 'Present').length;
  const absentCount = filteredAttendances.filter(a => a.status === 'Absent').length;
  const lateCount = filteredAttendances.filter(a => a.status === 'Late').length;
  const _excusedCount = filteredAttendances.filter(a => a.status === 'Excused').length;

  const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords * 100).toFixed(1) : 0;

  const getStudentAttendanceSummary = () => {
    const classStudents = selectedClassId
      ? (students || []).filter(s => s.class_id === selectedClassId && s.status === 'Active')
      : (students || []).filter(s => s.status === 'Active');

    return classStudents.map(student => {
      const studentAttendances = filteredAttendances.filter(a => a.studentId === student.id);
      const present = studentAttendances.filter(a => a.status === 'Present').length;
      const absent = studentAttendances.filter(a => a.status === 'Absent').length;
      const late = studentAttendances.filter(a => a.status === 'Late').length;
      const excused = studentAttendances.filter(a => a.status === 'Excused').length;
      const total = studentAttendances.length;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

      return {
        student,
        present,
        absent,
        late,
        excused,
        total,
        rate: Number(rate),
      };
    }).sort((a, b) => b.rate - a.rate);
  };

  const getDailyAttendanceSummary = () => {
    const dates = [...new Set(filteredAttendances.map(a => a.date))].sort().reverse();

    return dates.map(date => {
      const dayAttendances = filteredAttendances.filter(a => a.date === date);
      const present = dayAttendances.filter(a => a.status === 'Present').length;
      const absent = dayAttendances.filter(a => a.status === 'Absent').length;
      const late = dayAttendances.filter(a => a.status === 'Late').length;
      const excused = dayAttendances.filter(a => a.status === 'Excused').length;
      const total = dayAttendances.length;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

      return {
        date,
        present,
        absent,
        late,
        excused,
        total,
        rate: Number(rate),
      };
    });
  };

  const getClassAttendanceSummary = () => {
    return classes.map(cls => {
      const classAttendances = filteredAttendances.filter(a => a.classId === cls.id);
      const present = classAttendances.filter(a => a.status === 'Present').length;
      const absent = classAttendances.filter(a => a.status === 'Absent').length;
      const late = classAttendances.filter(a => a.status === 'Late').length;
      const excused = classAttendances.filter(a => a.status === 'Excused').length;
      const total = classAttendances.length;
      const rate = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

      return {
        class: cls,
        present,
        absent,
        late,
        excused,
        total,
        rate: Number(rate),
      };
    }).filter(c => c.total > 0).sort((a, b) => b.rate - a.rate);
  };

  const handleExportCSV = async () => {
    let csvContent = '';
    let fileName = '';

    if (reportType === 'student') {
      const summary = getStudentAttendanceSummary();
      csvContent = 'Student Name,Admission Number,Class,Present,Absent,Late,Excused,Total Days,Attendance Rate\n';
      summary.forEach(item => {
        csvContent += `${item.student.firstName} ${item.student.lastName},${item.student.admissionNumber},${item.student.className},${item.present},${item.absent},${item.late},${item.excused},${item.total},${item.rate}%\n`;
      });
      fileName = `student-attendance-report-${endDate}.csv`;
    } else if (reportType === 'daily') {
      const summary = getDailyAttendanceSummary();
      csvContent = 'Date,Present,Absent,Late,Excused,Total,Attendance Rate\n';
      summary.forEach(item => {
        csvContent += `${item.date},${item.present},${item.absent},${item.late},${item.excused},${item.total},${item.rate}%\n`;
      });
      fileName = `daily-attendance-report-${endDate}.csv`;
    } else {
      const summary = getClassAttendanceSummary();
      csvContent = 'Class,Present,Absent,Late,Excused,Total,Attendance Rate\n';
      summary.forEach(item => {
        csvContent += `${item.class.name},${item.present},${item.absent},${item.late},${item.excused},${item.total},${item.rate}%\n`;
      });
      fileName = `class-attendance-report-${endDate}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    await CapacitorHelper.downloadFile(blob, fileName, 'text/csv');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2 font-heading font-bold">Attendance Reports</h1>
        <p className="text-slate-600">View and analyze student attendance data</p>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-5 text-slate-600" />
          <h3 className="text-slate-800 font-heading font-bold">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="mb-2 text-slate-700">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as 'class' | 'student' | 'daily')}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">By Class</SelectItem>
                <SelectItem value="student">By Student</SelectItem>
                <SelectItem value="daily">By Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 text-slate-700">Class</Label>
            <Select value={selectedClassId.toString()} onValueChange={(v) => setSelectedClassId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 text-slate-700">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </div>

          <div>
            <Label className="mb-2 text-slate-700">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleExportCSV}>
            Export to CSV
          </Button>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-primary" />
          </div>
          <p className="text-primary text-sm mb-1">Total Records</p>
          <p className="text-3xl text-primary">{totalRecords}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-emerald-600 text-sm mb-1">Present</p>
          <p className="text-3xl text-emerald-900">{presentCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 text-sm mb-1">Absent</p>
          <p className="text-3xl text-red-900">{absentCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-yellow-600 text-sm mb-1">Late</p>
          <p className="text-3xl text-yellow-900">{lateCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-primary" />
          </div>
          <p className="text-primary text-sm mb-1">Attendance Rate</p>
          <p className="text-3xl text-primary">{attendanceRate}%</p>
        </Card>
      </div>

      {/* Report Content */}
      {reportType === 'student' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-slate-800 mb-4 font-heading font-bold">Student Attendance Summary</h3>
          {getStudentAttendanceSummary().length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No attendance data found for the selected filters.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-700">Student Name</th>
                  <th className="text-left p-3 text-slate-700">Admission No.</th>
                  <th className="text-left p-3 text-slate-700">Class</th>
                  <th className="text-center p-3 text-slate-700">Present</th>
                  <th className="text-center p-3 text-slate-700">Absent</th>
                  <th className="text-center p-3 text-slate-700">Late</th>
                  <th className="text-center p-3 text-slate-700">Excused</th>
                  <th className="text-center p-3 text-slate-700">Total Days</th>
                  <th className="text-center p-3 text-slate-700">Rate</th>
                </tr>
              </thead>
              <tbody>
                {getStudentAttendanceSummary().map(item => (
                  <tr key={item.student.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{item.student.firstName} {item.student.lastName}</td>
                    <td className="p-3 text-slate-600">{item.student.admissionNumber}</td>
                    <td className="p-3 text-slate-600">{item.student.className}</td>
                    <td className="p-3 text-center text-emerald-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-primary">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                        item.rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      )}

      {reportType === 'daily' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-slate-800 mb-4 font-heading font-bold">Daily Attendance Summary</h3>
          {getDailyAttendanceSummary().length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No attendance data found for the selected filters.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-700">Date</th>
                  <th className="text-center p-3 text-slate-700">Present</th>
                  <th className="text-center p-3 text-slate-700">Absent</th>
                  <th className="text-center p-3 text-slate-700">Late</th>
                  <th className="text-center p-3 text-slate-700">Excused</th>
                  <th className="text-center p-3 text-slate-700">Total</th>
                  <th className="text-center p-3 text-slate-700">Rate</th>
                </tr>
              </thead>
              <tbody>
                {getDailyAttendanceSummary().map(item => (
                  <tr key={item.date} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="p-3 text-center text-emerald-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-primary">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                        item.rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      )}

      {reportType === 'class' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-slate-800 mb-4 font-heading font-bold">Class Attendance Summary</h3>
          {getClassAttendanceSummary().length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No attendance data found for the selected filters.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-slate-700">Class</th>
                  <th className="text-center p-3 text-slate-700">Present</th>
                  <th className="text-center p-3 text-slate-700">Absent</th>
                  <th className="text-center p-3 text-slate-700">Late</th>
                  <th className="text-center p-3 text-slate-700">Excused</th>
                  <th className="text-center p-3 text-slate-700">Total Records</th>
                  <th className="text-center p-3 text-slate-700">Rate</th>
                </tr>
              </thead>
              <tbody>
                {getClassAttendanceSummary().map(item => (
                  <tr key={item.class.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{item.class.name}</td>
                    <td className="p-3 text-center text-emerald-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-primary">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                        item.rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      )}
    </div>
  );
}
