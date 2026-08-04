import { useState } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { useTimetables } from '../../contexts/domains/IndependentTimetableContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { CapacitorHelper } from '../../utils/capacitorHelper';
interface ViewExamTimetablePageProps {
  userRole: 'teacher' | 'parent' | 'student';
}

export function ViewExamTimetablePage({ userRole }: ViewExamTimetablePageProps) {
  const {
    currentUser,
    classes,
    students,
    parents,
    teachers,
    currentTerm,
    currentAcademicYear,
  } = useSchool();
  const { examTimetables } = useTimetables();

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  // Get relevant classes based on user role
  const getRelevantClasses = () => {
    if (userRole === 'teacher') {
      const teacher = teachers.find(t => t.id === currentUser?.linked_id);
      // Only show classes where teacher is class teacher
      return classes.filter(c => c.classTeacherId === teacher?.id);
    } else if (userRole === 'parent') {
      const parent = parents.find(p => p.id === currentUser?.linked_id);
      if (parent) {
        const childrenClasses = students
          .filter(s => parent.student_ids?.includes(s.id))
          .map(s => s.class_id);
        return classes.filter(c => childrenClasses.includes(c.id));
      }
    }
    return classes;
  };

  const relevantClasses = getRelevantClasses();
  
  // Auto-select first class if only one available
  if (relevantClasses.length === 1 && selectedClassId === 0) {
    setSelectedClassId(relevantClasses[0].id);
  }

  const filteredTimetables = selectedClassId === 0
    ? examTimetables.filter(t => t.term === currentTerm && t.academic_year === currentAcademicYear)
    : examTimetables.filter(
        t => t.class_id === selectedClassId && t.term === currentTerm && t.academic_year === currentAcademicYear
      );

  // Group by date
  const groupedByDate = filteredTimetables.reduce((acc, timetable) => {
    const date = timetable.exam_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(timetable);
    return acc;
  }, {} as { [date: string]: typeof examTimetables });

  // Sort by date and within each date by time
  const sortedDates = Object.keys(groupedByDate).sort();
  sortedDates.forEach(date => {
    groupedByDate[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  const handleDownload = async () => {
    // Create CSV content
    let csvContent = `${currentUser?.school_name || currentUser?.school_suffix || 'School'} - Exam Timetable\n`;
    csvContent += `Term: ${currentTerm}, Academic Year: ${currentAcademicYear}\n`;
    csvContent += `Class: ${selectedClassId ? classes.find(c => c.id === selectedClassId)?.name : 'All Classes'}\n\n`;
    csvContent += `Date,Day,Subject,Start Time,End Time,Duration (mins),Venue,Instructions\n`;

    filteredTimetables
      .sort((a, b) => {
        if (a.exam_date !== b.exam_date) return a.exam_date.localeCompare(b.exam_date);
        return a.start_time.localeCompare(b.start_time);
      })
      .forEach(timetable => {
        const date = new Date(timetable.exam_date);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        csvContent += `${formattedDate},${day},${timetable.subject_name},${timetable.start_time},${timetable.end_time},${timetable.duration_minutes},${timetable.venue},"${timetable.instructions || 'N/A'}"\n`;
      });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    await CapacitorHelper.downloadFile(blob, `exam-timetable-${selectedClassId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-slate-900 mb-2">Exam Timetable</h1>
          <p className="text-slate-600">
            {currentTerm} - {currentAcademicYear}
          </p>
        </div>
        {(filteredTimetables || []).length > 0 && (
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
            <span className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Class Selection */}
      {relevantClasses.length > 1 && (
        <Card className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <label className="text-slate-700">Select Class:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>All Classes</option>
              {relevantClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Timetable Display */}
      {sortedDates.length === 0 ? (
        <Card className="p-12 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
          <span className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-900 mb-2">No Exams Scheduled</h3>
          <p className="text-slate-600">
            There are no exams scheduled for this class in the current term
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-blue-600 text-sm mb-1">Total Exams</p>
                <p className="text-3xl text-blue-900">{(filteredTimetables || []).length}</p>
              </div>
              <div>
                <p className="text-blue-600 text-sm mb-1">Exam Days</p>
                <p className="text-3xl text-blue-900">{sortedDates.length}</p>
              </div>
              <div>
                <p className="text-blue-600 text-sm mb-1">First Exam</p>
                <p className="text-blue-900">
                  {new Date(sortedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-blue-600 text-sm mb-1">Last Exam</p>
                <p className="text-blue-900">
                  {new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </Card>

          {/* Timetable by Date */}
          {sortedDates.map(date => {
            const dateExams = groupedByDate[date];
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Card key={date} className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                  <span className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-slate-900">{dayName}</h3>
                    <p className="text-slate-600 text-sm">{formattedDate}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {dateExams.length} exam{dateExams.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {dateExams.map(exam => (
                    <div
                      key={exam.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-slate-900">{exam.subject_name}</h4>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {exam.exam_type}
                            </span>
                            {selectedClassId === 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {exam.class_name}
                              </span>
                            )}
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {exam.duration_minutes} minutes
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="w-4 h-4" />
                              <span className="text-sm">
                                {exam.start_time} - {exam.end_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="w-4 h-4" />
                              <span className="text-sm">{exam.venue}</span>
                            </div>
                          </div>

                          {exam.instructions && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                              <span className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-yellow-800 text-sm">{exam.instructions}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          {/* Important Notes */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <h3 className="text-purple-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5" />
              Important Examination Guidelines
            </h3>
            <ul className="space-y-2 text-purple-800 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Arrive at the examination venue at least 15 minutes before the scheduled start time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Bring all required materials (pens, pencils, calculator if allowed)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Electronic devices (mobile phones, smartwatches) are not allowed in the exam hall</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Follow all instructions given by the examination supervisors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Any form of cheating or examination malpractice will result in serious disciplinary action</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
