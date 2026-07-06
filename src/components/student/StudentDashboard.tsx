import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, FileText, Clock, CheckCircle2, AlertCircle, LogOut, Eye, ArrowLeft, HelpCircle, XCircle, BarChart3, TrendingUp, Award, Play, ChevronRight, Sparkles, GraduationCap } from 'lucide-react';
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

function getGradeColor(percentage: number) {
  if (percentage >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500/20', bar: 'bg-gradient-to-r from-emerald-400 to-emerald-600', label: 'Excellent' };
  if (percentage >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500/20', bar: 'bg-gradient-to-r from-amber-400 to-amber-600', label: 'Good' };
  if (percentage >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-500/20', bar: 'bg-gradient-to-r from-orange-400 to-orange-600', label: 'Fair' };
  return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-500/20', bar: 'bg-gradient-to-r from-red-400 to-red-600', label: 'Needs Improvement' };
}

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const { cbtExams, cbtAttempts, loadCbtStudentExamsFromAPI, loadCbtMyAttemptsFromAPI, getCbtAttemptDetail, currentUser, schoolSettings } = useSchool();
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

  const sidebarSections = [
    { label: 'Overview', ids: ['dashboard'] },
    { label: 'Academics', ids: ['my-exams', 'my-results'] },
  ];

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

  const studentName = (currentUser?.first_name && currentUser?.last_name) ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.username || 'Student';
  const firstName = currentUser?.first_name || 'Student';

  const availableExams = cbtExams.filter((e: any) => e.published && e.status === 'Active');
  const myAttempts = cbtAttempts || [];
  const completedExams = myAttempts.filter((a: any) => a.status === 'submitted' || a.status === 'scored');
  const inProgressExams = myAttempts.filter((a: any) => a.status === 'in_progress');
  const averageScore = completedExams.length > 0
    ? Math.round(completedExams.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / completedExams.length)
    : 0;
  const gradeColor = getGradeColor(averageScore);

  if (selectedExam) {
    return <CbtExamPlayer exam={selectedExam} onExit={() => setSelectedExam(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DashboardSidebar items={sidebarItems} activeItem={activeItem} onItemClick={handleItemClick} sections={sidebarSections} schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'} />
      <div className="lg:pl-[var(--sidebar-width,256px)]">
        <DashboardTopBar
          userName={studentName}
          userRole="Student"
          notificationCount={0}
          notifications={[]}
          onLogout={onLogout}
          onNotificationClick={() => {}}
          onMarkAsRead={() => {}}
          schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'}
        />
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

          {activeItem === 'dashboard' && (
            <div className="space-y-6">

              {/* Welcome header */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#334155] to-[#1E293B] p-6 md:p-8">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <GraduationCap className="w-6 h-6 text-blue-400" />
                    <span className="text-blue-300 text-sm font-medium tracking-wide uppercase">Student Portal</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
                    Welcome back, {firstName}
                  </h1>
                  <p className="text-slate-300 mt-1 max-w-xl">
                    {inProgressExams.length > 0
                      ? `You have ${inProgressExams.length} exam${inProgressExams.length > 1 ? 's' : ''} in progress. Keep going!`
                      : availableExams.length > 0
                        ? `There ${availableExams.length === 1 ? 'is' : 'are'} ${availableExams.length} exam${availableExams.length > 1 ? 's' : ''} available for you.`
                        : 'No exams available at the moment.'}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] transition-colors group-hover:bg-blue-100" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{availableExams.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Available Exams</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] transition-colors group-hover:bg-emerald-100" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{completedExams.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Completed</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[100px] transition-colors group-hover:bg-amber-100" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{inProgressExams.length}</p>
                    <p className="text-sm text-slate-500 mt-1">In Progress</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[100px] transition-colors group-hover:bg-indigo-100" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{completedExams.length > 0 ? `${averageScore}%` : '--'}</p>
                    <p className="text-sm text-slate-500 mt-1">Average Score</p>
                  </div>
                </div>
              </div>

              {/* Quick actions + Performance summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card className="border-slate-100 shadow-sm overflow-hidden">
                    <CardHeader className="px-6 pt-6 pb-0 flex-row items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setActiveItem('my-exams')}
                          className="group relative overflow-hidden rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-left hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-blue-600 ml-0.5" />
                          </div>
                          <p className="font-semibold text-slate-900">Start an Exam</p>
                          <p className="text-sm text-slate-500 mt-0.5">{availableExams.length} exam{availableExams.length !== 1 ? 's' : ''} available</p>
                        </button>
                        <button
                          onClick={() => setActiveItem('my-results')}
                          className="group relative overflow-hidden rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-5 text-left hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <p className="font-semibold text-slate-900">View Results</p>
                          <p className="text-sm text-slate-500 mt-0.5">{completedExams.length} completed exam{completedExams.length !== 1 ? 's' : ''}</p>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Available Exams */}
                  <Card className="border-slate-100 shadow-sm overflow-hidden mt-4">
                    <CardHeader className="px-6 pt-6 pb-0 flex-row items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">Available Exams</h3>
                      {availableExams.length > 5 && (
                        <button onClick={() => setActiveItem('my-exams')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          View all <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </CardHeader>
                    <CardContent className="p-6">
                      {availableExams.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <BookOpen className="w-7 h-7 text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">No exams available</p>
                          <p className="text-sm text-slate-400 mt-1">Check back later for new exams.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableExams.slice(0, 5).map((exam: any) => {
                            const attempted = myAttempts.find((a: any) => a.exam_id === exam.id);
                            return (
                              <div key={exam.id} className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-200">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                                    <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900 truncate">{exam.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{exam.subject_name} &middot; {exam.duration_minutes} min &middot; {exam.total_marks} marks</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  {attempted ? (
                                    attempted.status === 'submitted' || attempted.status === 'scored'
                                      ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
                                      : <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>
                                  ) : (
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setSelectedExam(exam)}>
                                      Start
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

                {/* Performance summary card */}
                <div className="lg:col-span-1">
                  <Card className="border-slate-100 shadow-sm overflow-hidden h-full">
                    <CardHeader className="px-6 pt-6 pb-0">
                      <h3 className="text-base font-semibold text-slate-900">Performance</h3>
                    </CardHeader>
                    <CardContent className="p-6">
                      {completedExams.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <TrendingUp className="w-7 h-7 text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">No data yet</p>
                          <p className="text-sm text-slate-400 mt-1">Complete an exam to see your performance.</p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Circular score */}
                          <div className="flex flex-col items-center py-2">
                            <div className="relative w-28 h-28 mb-3">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                                <circle
                                  cx="60" cy="60" r="54" fill="none"
                                  stroke={averageScore >= 70 ? '#10B981' : averageScore >= 50 ? '#F59E0B' : '#EF4444'}
                                  strokeWidth="8" strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 54}`}
                                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - averageScore / 100)}`}
                                  className="transition-all duration-1000"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <p className={`text-2xl font-bold ${gradeColor.text}`}>{averageScore}%</p>
                                  <p className="text-xs text-slate-500">Average</p>
                                </div>
                              </div>
                            </div>
                            <Badge className={`${gradeColor.bg} text-white border-0 px-3 py-1`}>
                              {gradeColor.label}
                            </Badge>
                          </div>

                          {/* Quick stats */}
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Exams Taken</span>
                              <span className="font-semibold text-slate-900">{completedExams.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">In Progress</span>
                              <span className="font-semibold text-slate-900">{inProgressExams.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Available</span>
                              <span className="font-semibold text-slate-900">{availableExams.length}</span>
                            </div>
                          </div>

                          {completedExams.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 mt-1"
                              onClick={() => setActiveItem('my-results')}
                            >
                              View All Results <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeItem === 'my-exams' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">My Exams</h2>
                  <p className="text-sm text-slate-500 mt-1">{availableExams.length} exam{availableExams.length !== 1 ? 's' : ''} available</p>
                </div>
              </div>
              {availableExams.length === 0 ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No exams available</p>
                    <p className="text-sm text-slate-400 mt-1">Check back later for new exams.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {availableExams.map((exam: any) => {
                    const attempt = myAttempts.find((a: any) => a.exam_id === exam.id);
                    const isCompleted = attempt && (attempt.status === 'submitted' || attempt.status === 'scored');
                    const isInProgress = attempt && attempt.status === 'in_progress';
                    return (
                      <Card key={exam.id} className={`border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${isCompleted ? 'ring-1 ring-emerald-200' : ''}`}>
                        <div className={`h-1.5 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : isInProgress ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} />
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-slate-900 truncate">{exam.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">{exam.subject_name}</p>
                            </div>
                            {isCompleted && attempt && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">{attempt.score}/{attempt.max_score}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                              <Clock className="w-3 h-3" /> {exam.duration_minutes} min
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                              <Award className="w-3 h-3" /> {exam.total_marks} marks
                            </span>
                            {exam.class_name && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                {exam.class_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!attempt && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex-1" onClick={() => setSelectedExam(exam)}>
                                <Play className="w-3.5 h-3.5 mr-1.5" /> Start Exam
                              </Button>
                            )}
                            {isInProgress && (
                              <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 flex-1" onClick={() => setSelectedExam(exam)}>
                                <Clock className="w-3.5 h-3.5 mr-1.5" /> Continue
                              </Button>
                            )}
                            {isCompleted && attempt && (
                              <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 flex-1" onClick={() => handleViewDetail(attempt.id)} disabled={detailLoading}>
                                <Eye className="w-3.5 h-3.5 mr-1.5" /> View Results
                              </Button>
                            )}
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">My Results</h2>
                  <p className="text-sm text-slate-500 mt-1">{completedExams.length} completed exam{completedExams.length !== 1 ? 's' : ''}</p>
                </div>
                {completedExams.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <TrendingUp className={`w-4 h-4 ${gradeColor.text}`} />
                    <span className={`text-sm font-semibold ${gradeColor.text}`}>Avg: {averageScore}%</span>
                  </div>
                )}
              </div>
              {completedExams.length === 0 ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No completed exams yet</p>
                    <p className="text-sm text-slate-400 mt-1">Start and submit an exam to see your results here.</p>
                    <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setActiveItem('my-exams')}>
                      Browse Exams
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedExams.map((attempt: any) => {
                    const pc = attempt.percentage || 0;
                    const gc = getGradeColor(pc);
                    return (
                      <Card key={attempt.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {/* Score ring */}
                              <div className="relative w-14 h-14 shrink-0 hidden sm:block">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                                  <circle cx="28" cy="28" r="24" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                                  <circle
                                    cx="28" cy="28" r="24" fill="none"
                                    stroke={gc.bg.includes('emerald') ? '#10B981' : gc.bg.includes('amber') ? '#F59E0B' : gc.bg.includes('orange') ? '#F97316' : '#EF4444'}
                                    strokeWidth="4" strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 24}`}
                                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - pc / 100)}`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-xs font-bold ${gc.text}`}>{pc}%</span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-900 truncate">{attempt.exam_title || 'Exam'}</p>
                                  <Badge className={`${gc.bg} text-white border-0 text-[10px] px-2 py-0.5`}>{gc.label}</Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{attempt.subject_name}</p>
                                {/* Mobile score indicator */}
                                <div className="flex items-center gap-3 mt-2 sm:hidden">
                                  <span className="text-sm font-bold text-slate-900">{attempt.score}/{attempt.max_score}</span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${gc.bar}`} style={{ width: `${Math.min(pc, 100)}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="hidden sm:block text-right">
                                <p className="text-base font-bold text-slate-900">{attempt.score}/{attempt.max_score}</p>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                  <div className={`h-full rounded-full ${gc.bar}`} style={{ width: `${Math.min(pc, 100)}%` }} />
                                </div>
                              </div>
                              <Badge className={attempt.status === 'scored' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                                {attempt.status === 'scored' ? 'Scored' : 'Submitted'}
                              </Badge>
                              <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => handleViewDetail(attempt.id)} disabled={detailLoading}>
                                <Eye className="w-3.5 h-3.5 mr-1" /> Details
                              </Button>
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
