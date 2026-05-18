import { ArrowLeft, Search, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useSchool } from '../../contexts/SchoolContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Props {
  exam: any;
  onBack: () => void;
}

export function CbtExamResultsPage({ exam, onBack }: Props) {
  const { getCbtExamResults, feedCbtExamScores, deleteCbtExamScores } = useSchool();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedSlot, setFeedSlot] = useState<string>(exam.score_slot || 'first_test');
  const [feedLoading, setFeedLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'feed' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadResults();
  }, [exam.id]);

  const loadResults = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await getCbtExamResults(exam.id);
      setResults(data?.attempts || data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedScores = async () => {
    if (!feedSlot) return;
    setFeedLoading(true);
    setMessage(null);
    setConfirmAction(null);
    try {
      const result = await feedCbtExamScores(exam.id, feedSlot);
      const count = result?.fed_count || 0;
      setMessage({ type: 'success', text: `${count} score(s) fed to ${feedSlot === 'first_test' ? 'CA1' : 'CA2'} successfully` });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to feed scores';
      setMessage({ type: 'error', text: msg });
    } finally {
      setFeedLoading(false);
    }
  };

  const handleDeleteScores = async () => {
    setDeleteLoading(true);
    setMessage(null);
    setConfirmAction(null);
    try {
      const result = await deleteCbtExamScores(exam.id);
      const count = result?.deleted_count || 0;
      setMessage({ type: 'success', text: `${count} score(s) deleted successfully` });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete scores';
      setMessage({ type: 'error', text: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = results.filter((r: any) =>
    (r.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.admission_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const averageScore = results.length > 0
    ? (results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length).toFixed(1)
    : '—';

  const submittedCount = results.filter((r: any) => r.status === 'submitted' || r.status === 'scored').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">{exam.title} — Results</h2>
          <p className="text-sm text-[#6B7280]">{results.length} students · {submittedCount} submitted · Avg: {averageScore}%</p>
        </div>
      </div>

      {/* Score management actions */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[#1F2937]">Feed Scores:</span>
            <div className="w-36 sm:w-44">
              <Select value={feedSlot} onValueChange={setFeedSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_test">First Test (CA1)</SelectItem>
                  <SelectItem value="second_test">Second Test (CA2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {confirmAction === 'feed' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280] hidden sm:inline">Feed scores now?</span>
                <Button size="sm" onClick={handleFeedScores} disabled={feedLoading} className="bg-[#10B981]">
                  {feedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setConfirmAction('feed')} disabled={feedLoading || submittedCount === 0} className="bg-[#10B981]">
                {feedLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {feedLoading ? 'Feeding...' : 'Feed to Slot'}
              </Button>
            )}
            <div className="w-px h-6 bg-[#E5E7EB] hidden sm:block" />
            {confirmAction === 'delete' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#EF4444] hidden sm:inline"><AlertTriangle className="w-3 h-3 inline mr-1" />Delete fed scores?</span>
                <Button size="sm" onClick={handleDeleteScores} disabled={deleteLoading} className="bg-[#EF4444]">
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmAction('delete')} disabled={deleteLoading} className="text-[#EF4444] border-[#EF4444]">
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {deleteLoading ? 'Deleting...' : 'Delete Scores'}
              </Button>
            )}
          </div>
          {message && (
            <div className={`mt-3 text-sm px-3 py-2 rounded ${message.type === 'success' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#3B82F6]">{results.length}</p>
            <p className="text-sm text-[#6B7280]">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#10B981]">{submittedCount}</p>
            <p className="text-sm text-[#6B7280]">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#F59E0B]">{averageScore}%</p>
            <p className="text-sm text-[#6B7280]">Average Score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-[#6B7280]">Loading results...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              {searchQuery ? 'No matching results' : 'No submissions yet'}
            </div>
          ) : (<>
            <div className="hidden md:block rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tab Switches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.student_name || '—'}</TableCell>
                      <TableCell>{r.admission_number || '—'}</TableCell>
                      <TableCell>{r.score}/{r.max_score}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(r.percentage || 0) >= 70 ? 'bg-[#10B981]' : (r.percentage || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                              style={{ width: `${Math.min(r.percentage || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{r.percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.status === 'scored' ? (
                          <Badge className="bg-[#10B981]"><CheckCircle2 className="w-3 h-3 mr-1" />Scored</Badge>
                        ) : r.status === 'submitted' ? (
                          <Badge className="bg-[#3B82F6]"><CheckCircle2 className="w-3 h-3 mr-1" />Submitted</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[#F59E0B]">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.tab_switch_count || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden divide-y rounded-lg border overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-[#6B7280] px-4">
                  {searchQuery ? 'No matching results' : 'No submissions yet'}
                </div>
              ) : (
                filtered.map((r: any) => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{r.student_name || '—'}</p>
                        <p className="text-xs text-[#6B7280]">{r.admission_number || '—'}</p>
                      </div>
                      {r.status === 'scored' ? (
                        <Badge className="bg-[#10B981] shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Scored</Badge>
                      ) : r.status === 'submitted' ? (
                        <Badge className="bg-[#3B82F6] shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Submitted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[#F59E0B] shrink-0">In Progress</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Score: <strong>{r.score}/{r.max_score}</strong></span>
                      <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${(r.percentage || 0) >= 70 ? 'bg-[#10B981]' : (r.percentage || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} />
                        {r.percentage}%
                      </span>
                    </div>
                    <div className="text-xs text-[#6B7280]">Tab switches: {r.tab_switch_count || 0}</div>
                  </div>
                ))
              )}
            </div>
          </>)}
        </CardContent>
      </Card>
    </div>
  );
}
