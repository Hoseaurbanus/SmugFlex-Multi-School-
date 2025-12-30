import { useState } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
export function AttendanceReportsPage() {
  const {
    classes,
    students,
    getStudentsByClass,
    getAttendancesByClass,
    getAttendancesByDate,
    attendances,
    currentTerm,
    currentAcademicYear,
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'class' | 'student' | 'daily'>('class');

  // Filter attendances by date range
  const filteredAttendances = attendances.filter(a => {
    const matchesClass = selectedClassId === 0 || a.classId === selectedClassId;
    const matchesDateRange = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
    const matchesTerm = a.term === currentTerm && a.academicYear === currentAcademicYear;
    return matchesClass && matchesDateRange && matchesTerm;
  });

  // Calculate statistics
  const totalRecords = filteredAttendances.length;
  const presentCount = filteredAttendances.filter(a => a.status === 'Present').length;
  const absentCount = filteredAttendances.filter(a => a.status === 'Absent').length;
  const lateCount = filteredAttendances.filter(a => a.status === 'Late').length;
  const excusedCount = filteredAttendances.filter(a => a.status === 'Excused').length;
  
  const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords * 100).toFixed(1) : 0;

  // Get student attendance summary
  const getStudentAttendanceSummary = () => {
    const classStudents = selectedClassId ? getStudentsByClass(selectedClassId) : students;
    
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
    }).sort((a, b) => b.rate - a.rate); // Sort by attendance rate
  };

  // Get daily attendance summary
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

  // Get class-wise attendance summary
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

  const handleExportCSV = () => {
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
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Attendance Reports</h1>
        <p className="text-slate-600">View and analyze student attendance data</p>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-5 text-slate-600" />
          <h3 className="text-slate-800">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 text-slate-700 text-sm">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'class' | 'student' | 'daily')}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="class">By Class</option>
              <option value="student">By Student</option>
              <option value="daily">By Date</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-slate-700 text-sm">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-slate-700 text-sm">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-slate-700 text-sm">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 text-white">
            <span className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-blue-600 text-sm mb-1">Total Records</p>
          <p className="text-3xl text-blue-900">{totalRecords}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-green-600 text-sm mb-1">Present</p>
          <p className="text-3xl text-green-900">{presentCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 text-sm mb-1">Absent</p>
          <p className="text-3xl text-red-900">{absentCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-yellow-600 text-sm mb-1">Late</p>
          <p className="text-3xl text-yellow-900">{lateCount}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-purple-600 text-sm mb-1">Attendance Rate</p>
          <p className="text-3xl text-purple-900">{attendanceRate}%</p>
        </Card>
      </div>

      {/* Report Content */}
      {reportType === 'student' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-800 mb-4">Student Attendance Summary</h3>
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
                    <td className="p-3 text-center text-green-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-blue-600">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-green-100 text-green-700' :
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
        </Card>
      )}

      {reportType === 'daily' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-800 mb-4">Daily Attendance Summary</h3>
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
                    <td className="p-3 text-center text-green-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-blue-600">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-green-100 text-green-700' :
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
        </Card>
      )}

      {reportType === 'class' && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-800 mb-4">Class Attendance Summary</h3>
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
                    <td className="p-3 text-center text-green-600">{item.present}</td>
                    <td className="p-3 text-center text-red-600">{item.absent}</td>
                    <td className="p-3 text-center text-yellow-600">{item.late}</td>
                    <td className="p-3 text-center text-blue-600">{item.excused}</td>
                    <td className="p-3 text-center">{item.total}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.rate >= 90 ? 'bg-green-100 text-green-700' :
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
        </Card>
      )}
    </div>
  );
}
