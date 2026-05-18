import { Plus, Search, Clock, Users, BarChart3, MoreHorizontal, Play, Archive, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { useSchool } from '../../contexts/SchoolContext';
import { CbtExamForm } from './CbtExamForm';
import { CbtQuestionEditor } from './CbtQuestionEditor';
import { CbtExamResultsPage } from './CbtExamResultsPage';

export function CbtExamListPage() {
  const { cbtExams, loadCbtExamsFromAPI, deleteCbtExam, publishCbtExam, currentUser } = useSchool();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [examFormOpen, setExamFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'questions' | 'results'>('list');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCbtExamsFromAPI();
  }, []);

  const filteredExams = useMemo(() => {
    return cbtExams.filter(e => {
      const matchesSearch = (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.class_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [cbtExams, searchQuery, filterStatus]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / pageSize));
  const paginatedExams = filteredExams.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = () => {
    setEditingExam(null);
    setExamFormOpen(true);
  };

  const handleEdit = (exam: any) => {
    setEditingExam(exam);
    setExamFormOpen(true);
  };

  const handleDelete = async () => {
    if (!examToDelete) return;
    setActionLoading('delete');
    try {
      await deleteCbtExam(examToDelete);
      toast.success('Exam deleted');
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    } catch {
      toast.error('Failed to delete exam');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: number) => {
    setActionLoading(`publish-${id}`);
    try {
      await publishCbtExam(id);
      toast.success('Exam published');
    } catch {
      toast.error('Failed to publish exam');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageQuestions = (exam: any) => {
    setSelectedExam(exam);
    setActiveView('questions');
  };

  const handleViewResults = (exam: any) => {
    setSelectedExam(exam);
    setActiveView('results');
  };

  if (activeView === 'questions' && selectedExam) {
    return (
      <CbtQuestionEditor
        exam={selectedExam}
        onBack={() => { setActiveView('list'); setSelectedExam(null); }}
      />
    );
  }

  if (activeView === 'results' && selectedExam) {
    return (
      <CbtExamResultsPage
        exam={selectedExam}
        onBack={() => { setActiveView('list'); setSelectedExam(null); }}
      />
    );
  }

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2937]">CBT Exams</h2>
              <p className="text-sm text-[#6B7280] mt-1">Manage computer-based tests and examinations</p>
            </div>
            {canManage && (
              <Button onClick={handleCreate} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                <Plus className="w-4 h-4 mr-2" />
                Create Exam
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
            {/* Desktop table - hidden on small screens */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Feed Into</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-[#6B7280]">
                        {searchQuery ? 'No exams match your search' : 'No exams yet. Create your first exam!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExams.map(exam => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>{exam.subject_name || '—'}</TableCell>
                        <TableCell>{exam.class_name || '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                            {exam.duration_minutes} min
                          </span>
                        </TableCell>
                        <TableCell>{exam.total_marks}</TableCell>
                        <TableCell>
                          {exam.feed_into_scores ? (
                            <Badge className="bg-[#10B981]">{exam.score_slot === 'second_test' ? 'CA2' : 'CA1'}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[#6B7280]">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={exam.published ? 'bg-[#3B82F6]' : 'bg-[#F59E0B]'}>
                            {exam.published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleManageQuestions(exam)}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Questions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewResults(exam)}>
                                <Users className="w-4 h-4 mr-2" />
                                Results
                              </DropdownMenuItem>
                              {canManage && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEdit(exam)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {!exam.published && (
                                    <DropdownMenuItem onClick={() => handlePublish(exam.id)} disabled={actionLoading === `publish-${exam.id}`}>
                                      <Play className="w-4 h-4 mr-2" />
                                      Publish
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => { setExamToDelete(exam.id); setDeleteDialogOpen(true); }} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards - shown on small screens */}
            <div className="md:hidden divide-y">
              {paginatedExams.length === 0 ? (
                <div className="text-center py-12 text-[#6B7280] px-4">
                  {searchQuery ? 'No exams match your search' : 'No exams yet. Create your first exam!'}
                </div>
              ) : (
                paginatedExams.map(exam => (
                  <div key={exam.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#1F2937] truncate">{exam.title}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{exam.subject_name || '—'} · {exam.class_name || '—'}</p>
                      </div>
                      <Badge className={exam.published ? 'bg-[#3B82F6] shrink-0' : 'bg-[#F59E0B] shrink-0'}>
                        {exam.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} min</span>
                      <span>{exam.total_marks} marks</span>
                      {exam.feed_into_scores ? (
                        <Badge className="bg-[#10B981] text-xs">{exam.score_slot === 'second_test' ? 'CA2' : 'CA1'}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-[#6B7280]">No feed</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleManageQuestions(exam)}>
                        <BarChart3 className="w-3 h-3 mr-1" /> Questions
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleViewResults(exam)}>
                        <Users className="w-3 h-3 mr-1" /> Results
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleEdit(exam)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {!exam.published && (
                            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handlePublish(exam.id)} disabled={actionLoading === `publish-${exam.id}`}>
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="text-xs h-8 text-red-600" onClick={() => { setExamToDelete(exam.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-[#6B7280]">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CbtExamForm
        open={examFormOpen}
        onOpenChange={setExamFormOpen}
        exam={editingExam}
        onSaved={() => { setExamFormOpen(false); loadCbtExamsFromAPI(); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the exam and all associated questions and attempts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={actionLoading === 'delete'}>
              {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
