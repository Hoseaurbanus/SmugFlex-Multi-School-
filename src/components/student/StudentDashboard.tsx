import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, FileText, Clock, CheckCircle2, AlertCircle, LogOut, Eye, ArrowLeft, HelpCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { DashboardSidebar } from '../DashboardSidebar';
import { DashboardTopBar } from '../DashboardTopBar';
import { CbtExamPlayer } from '../cbt/CbtExamPlayer';
import { ResultsSummary } from '../cbt/cbt-exam/ResultsSummary';

interface StudentDashboardProps {
  onLogout: () => void;
}

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const { cbtExams, cbtAttempts, loadCbtStudentExamsFromAPI, loadCbtMyAttemptsFromAPI, getCbtAttemptDetail, currentUser } = useSchool();
  const [activeItem, setActiveItem] = useState('dashboard');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [viewAttempt, setViewAttempt] = useState<any>(null);
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    loadCbtStudentExamsFromAPI();
    loadCbtMyAttemptsFromAPI();
  }, []);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', id: 'dashboard' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'My Exams', id: 'my-exams' },
    { icon: <FileText className="w-5 h-5" />, label: 'My Results', id: 'my-results' },
    { icon: <LogOut className="w-5 h-5" />, label: 'Logout', id: 'logout' },
  ];

  const handleItemClick = (id: string) => {
    if (id === 'logout') {
      toast.success('Logged out');
      onLogout();
    } else {
      setActiveItem(id);
    }
  };

  const handleViewDetail = async (attemptId: number) => {
    setDetailLoading(true);
    try {
      const data = await getCbtAttemptDetail(attemptId);
      setDetailData(data);
      setViewDetailOpen(true);
    } catch {
      toast.error('Failed to load attempt details');
    } finally {
      setDetailLoading(false);
    }
  };

  const studentName = currentUser?.full_name || currentUser?.username || 'Student';

  const availableExams = cbtExams.filter((e: any) => e.published && e.status === 'Active');
  const myAttempts = cbtAttempts || [];
  const completedExams = myAttempts.filter((a: any) => a.status === 'submitted' || a.status === 'scored');

  if (selectedExam) {
    return <CbtExamPlayer exam={selectedExam} onExit={() => setSelectedExam(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar items={sidebarItems} activeItem={activeItem} onItemClick={handleItemClick} />
      <div className="lg:pl-64">
        <DashboardTopBar
          userName={studentName}
          userRole="Student"
          notificationCount={0}
          notifications={[]}
          onLogout={onLogout}
          onNotificationClick={() => {}}
          onMarkAsRead={() => {}}
        />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#1F2937]">Student Dashboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-8 h-8 text-[#3B82F6] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{availableExams.length}</p>
                    <p className="text-sm text-[#6B7280]">Available Exams</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{completedExams.length}</p>
                    <p className="text-sm text-[#6B7280]">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Clock className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{myAttempts.filter((a: any) => a.status === 'in_progress').length}</p>
                    <p className="text-sm text-[#6B7280]">In Progress</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Available Exams</h3>
                </CardHeader>
                <CardContent>
                  {availableExams.length === 0 ? (
                    <div className="text-center py-8 text-[#6B7280]">No exams available right now.</div>
                  ) : (
                    <div className="space-y-3">
                      {availableExams.slice(0, 5).map((exam: any) => {
                        const attempted = myAttempts.find((a: any) => a.exam_id === exam.id);
                        return (
                          <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-[#E5E7EB] gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-[#1F2937] truncate">{exam.title}</p>
                              <p className="text-sm text-[#6B7280]">{exam.subject_name} · {exam.duration_minutes} min · {exam.total_marks} marks</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {attempted ? (
                                attempted.status === 'submitted' || attempted.status === 'scored'
                                  ? <Badge className="bg-[#10B981]"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
                                  : <Badge className="bg-[#F59E0B]"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>
                              ) : (
                                <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] w-full sm:w-auto" onClick={() => setSelectedExam(exam)}>
                                  Start Exam
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeItem === 'my-exams' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#1F2937]">My Exams</h2>
              {availableExams.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-[#6B7280]">No exams available.</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableExams.map((exam: any) => {
                    const attempt = myAttempts.find((a: any) => a.exam_id === exam.id);
                    return (
                      <Card key={exam.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-[#1F2937] truncate">{exam.title}</h3>
                              <p className="text-sm text-[#6B7280] mt-1">{exam.subject_name} · {exam.duration_minutes} minutes</p>
                            </div>
                            {attempt && (attempt.status === 'submitted' || attempt.status === 'scored') && (
                              <Badge className="bg-[#10B981] shrink-0">{attempt.score}/{attempt.max_score}</Badge>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-[#6B7280]">{exam.total_marks} marks · {exam.class_name}</span>
                            <div className="flex items-center gap-2">
                              {!attempt && (
                                <Button size="sm" className="bg-[#3B82F6]" onClick={() => setSelectedExam(exam)}>
                                  Start
                                </Button>
                              )}
                              {attempt && attempt.status === 'in_progress' && (
                                <Button size="sm" variant="outline" onClick={() => setSelectedExam(exam)}>
                                  Continue
                                </Button>
                              )}
                              {attempt && (attempt.status === 'submitted' || attempt.status === 'scored') && (
                                <Button size="sm" variant="outline" onClick={() => handleViewDetail(attempt.id)} disabled={detailLoading}>
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeItem === 'my-results' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-[#1F2937]">My Results</h2>
              {completedExams.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-[#6B7280]">No completed exams yet.</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedExams.map((attempt: any) => (
                    <Card key={attempt.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#1F2937] truncate">{attempt.exam_title || 'Exam'}</p>
                            <p className="text-sm text-[#6B7280]">{attempt.subject_name} · {attempt.percentage}%</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-lg font-bold">{attempt.score}/{attempt.max_score}</p>
                              <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${(attempt.percentage || 0) >= 70 ? 'bg-[#10B981]' : (attempt.percentage || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                                  style={{ width: `${Math.min(attempt.percentage || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                            <Badge className={attempt.status === 'scored' ? 'bg-[#10B981]' : 'bg-[#3B82F6]'}>
                              {attempt.status === 'scored' ? 'Scored' : 'Submitted'}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleViewDetail(attempt.id)} disabled={detailLoading}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Attempt detail dialog */}
      <Dialog open={viewDetailOpen} onOpenChange={setViewDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam Results</DialogTitle>
          </DialogHeader>
          {detailData && (
            <ResultsSummary
              attempt={detailData}
              answers={detailData.answers || []}
              questions={detailData.answers?.map((a: any, i: number) => ({
                question_text: a.question_text,
                correct_answer: a.correct_answer,
              })) || []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
