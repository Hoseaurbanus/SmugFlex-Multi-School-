import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

export function ExamTimetablePage() {
  const {
    classes,
    subjects,
    examTimetables,
    addExamTimetable,
    updateExamTimetable,
    deleteExamTimetable,
    currentUser,
    currentTerm,
    currentAcademicYear,
  } = useSchool();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const [formData, setFormData] = useState({
    classId: 0,
    subjectId: 0,
    examType: 'Exam' as 'CA1' | 'CA2' | 'Exam' | 'Practical',
    examDate: '',
    startTime: '',
    endTime: '',
    venue: '',
    instructions: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  };

  const handleSubmit = () => {
    if (!formData.classId || !formData.subjectId || !formData.examType || !formData.examDate || !formData.startTime || !formData.endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    const selectedClass = classes.find(c => c.id === formData.classId);
    const selectedSubject = subjects.find(s => s.id === formData.subjectId);

    if (!selectedClass || !selectedSubject) {
      toast.error('Invalid class or subject selection');
      return;
    }

    const duration = calculateDuration(formData.startTime, formData.endTime);

    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const timetableData = {
      class_id: formData.classId,
      class_name: selectedClass.name,
      subject_id: formData.subjectId,
      subject_name: selectedSubject.name,
      exam_type: formData.examType,
      exam_date: formData.examDate,
      start_time: formData.startTime,
      end_time: formData.endTime,
      duration_minutes: duration,
      venue: formData.venue || undefined,
      supervisor_id: undefined,
      term: currentTerm || '',
      academic_year: currentAcademicYear || '',
      instructions: formData.instructions || undefined,
      created_by: currentUser?.id || undefined,
      created_at: new Date().toISOString(),
    };

    if (editingId) {
      updateExamTimetable(editingId, timetableData);
      toast.success('Exam timetable updated successfully');
    } else {
      addExamTimetable(timetableData);
      toast.success('Exam timetable created successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      classId: 0,
      subjectId: 0,
      examType: 'Exam' as 'CA1' | 'CA2' | 'Exam' | 'Practical',
      examDate: '',
      startTime: '',
      endTime: '',
      venue: '',
      instructions: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (timetable: any) => {
    setFormData({
      classId: timetable.class_id,
      subjectId: timetable.subject_id,
      examType: timetable.exam_type,
      examDate: timetable.exam_date,
      startTime: timetable.start_time,
      endTime: timetable.end_time,
      venue: timetable.venue || '',
      instructions: timetable.instructions || '',
    });
    setEditingId(timetable.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this exam schedule?')) {
      deleteExamTimetable(id);
      toast.success('Exam timetable deleted successfully');
    }
  };

  const handleExportPDF = () => {
    toast.info('PDF export functionality will be available with backend integration');
  };

  const filteredTimetables = selectedClassId === 0
    ? examTimetables.filter(t => t.term === currentTerm && t.academic_year === currentAcademicYear)
    : examTimetables.filter(t => t.class_id === selectedClassId && t.term === currentTerm && t.academic_year === currentAcademicYear);

  const groupedTimetables = filteredTimetables.reduce((acc, timetable) => {
    const className = timetable.class_name || 'Unknown Class';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(timetable);
    return acc;
  }, {} as { [className: string]: typeof examTimetables });

  Object.keys(groupedTimetables).forEach(className => {
    groupedTimetables[className].sort((a, b) => {
      if (a.exam_date !== b.exam_date) {
        return a.exam_date.localeCompare(b.exam_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[#0A2540] mb-2 font-heading font-bold">Exam Timetable Management</h1>
          <p className="text-gray-500">Create and manage examination schedules</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportPDF} className="bg-[#0A2540] hover:bg-[#082030] text-white">
            <span className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="bg-[#0A2540] hover:bg-[#082030] text-white">
            <span className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Add Exam'}
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[#0A2540] mb-4 font-heading font-semibold">{editingId ? 'Edit' : 'Create'} Exam Schedule</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 text-gray-600">Class <span className="text-red-500">*</span></Label>
              <Select value={formData.classId.toString()} onValueChange={(v) => setFormData({ ...formData, classId: Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Select Class</SelectItem>
                  {classes.filter(c => c.status === 'Active').map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 text-gray-600">Subject <span className="text-red-500">*</span></Label>
              <Select value={formData.subjectId.toString()} onValueChange={(v) => setFormData({ ...formData, subjectId: Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Select Subject</SelectItem>
                  {subjects.filter(s => s.status === 'Active').map(sub => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 text-gray-600">Exam Type <span className="text-red-500">*</span></Label>
              <Select value={formData.examType} onValueChange={(v) => setFormData({ ...formData, examType: v as 'CA1' | 'CA2' | 'Exam' | 'Practical' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA1">CA1</SelectItem>
                  <SelectItem value="CA2">CA2</SelectItem>
                  <SelectItem value="Exam">Main Exam</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 text-gray-600">Exam Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                name="examDate"
                value={formData.examDate}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label className="mb-2 text-gray-600">Venue <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                placeholder="e.g., Exam Hall A, Classroom 201"
              />
            </div>

            <div>
              <Label className="mb-2 text-gray-600">Start Time <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label className="mb-2 text-gray-600">End Time <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-2 text-gray-600">Special Instructions</Label>
              <Textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Add any special instructions for the exam..."
                rows={3}
              />
            </div>
          </div>

          {formData.startTime && formData.endTime && (
            <div className="mt-4 p-3 bg-[#0A2540]/5 border border-[#0A2540]/10 rounded-lg">
              <p className="text-[#0A2540] text-sm">
                Duration: {calculateDuration(formData.startTime, formData.endTime)} minutes
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button onClick={resetForm} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-[#0A2540] hover:bg-[#082030] text-white">
              {editingId ? 'Update' : 'Create'} Exam Schedule
            </Button>
          </div>
        </Card>
      )}

      {/* Filter */}
      <Card className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Label className="text-gray-600">Filter by Class:</Label>
          <Select value={selectedClassId.toString()} onValueChange={(v) => setSelectedClassId(Number(v))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Classes</SelectItem>
              {classes.filter(c => c.status === 'Active').map(cls => (
                <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-gray-500 ml-auto">
            {filteredTimetables.length} exam{filteredTimetables.length !== 1 ? 's' : ''} scheduled
          </span>
        </div>
      </Card>

      {/* Timetable Display */}
      {Object.keys(groupedTimetables).length === 0 ? (
        <Card className="p-12 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
          <span className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-[#0A2540] mb-2">No Exams Scheduled</h3>
          <p className="text-gray-500">Click "Add Exam" to create an examination schedule</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedTimetables).sort().map(className => (
            <Card key={className} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-[#0A2540] mb-4 font-heading font-semibold">{className}</h3>

              <div className="space-y-3">
                {groupedTimetables[className].map(timetable => (
                  <div
                    key={timetable.id}
                    className="p-4 border border-gray-100 rounded-lg hover:border-[#FFD700]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-[#0A2540]">{timetable.subject_name}</h4>
                          <span className="px-3 py-1 bg-[#0A2540]/10 text-[#0A2540] rounded-full text-sm">
                            {timetable.exam_type}
                          </span>
                          <span className="px-3 py-1 bg-[#FFD700]/10 text-[#0A2540] rounded-full text-sm">
                            {timetable.duration_minutes} mins
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-500">
                            <span className="w-4 h-4" />
                            {new Date(timetable.exam_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <span className="w-4 h-4" />
                            {timetable.start_time} - {timetable.end_time}
                          </div>
                          <div className="text-gray-500">
                            📍 {timetable.venue}
                          </div>
                        </div>

                        {timetable.instructions && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-amber-700 text-sm">{timetable.instructions}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(timetable)}
                          variant="ghost"
                          size="sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(timetable.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
