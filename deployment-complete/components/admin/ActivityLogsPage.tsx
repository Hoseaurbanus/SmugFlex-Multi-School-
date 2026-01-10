import { useState } from "react";
import { KeyRound, Settings, Link } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function ActivityLogsPage() {
  const { activityLogs, getActivityLogs } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  const allLogs = getActivityLogs(undefined, filterAction);

  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getActionIcon = (action: string) => {
    if (action.includes('User') || action.includes('Create')) return <Settings className="w-4 h-4" />;
    if (action.includes('Password')) return <KeyRound className="w-4 h-4" />;
    if (action.includes('Link') || action.includes('Unlink')) return <Link className="w-4 h-4" />;
    if (action.includes('Deactivate') || action.includes('Activate')) return <span className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('Create') || action.includes('Add')) return "bg-[#28A745]";
    if (action.includes('Password') || action.includes('Reset')) return "bg-[#FFC107]";
    if (action.includes('Link') && !action.includes('Unlink')) return "bg-[#1E90FF]";
    if (action.includes('Delete') || action.includes('Unlink') || action.includes('Deactivate')) return "bg-[#DC3545]";
    if (action.includes('Activate') || action.includes('Approve')) return "bg-[#28A745]";
    return "bg-[#C0C8D3]";
  };

  const handleExport = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'IP Address', 'Status'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.actor,
      log.actor_role,
      log.action,
      log.target,
      log.ip_address,
      log.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Activity log exported successfully");
  };

  // Calculate statistics
  const totalActions = activityLogs.length;
  const usersCreated = activityLogs.filter(log => log.action.includes('Create User') || log.action.includes('Add')).length;
  const linksCreated = activityLogs.filter(log => log.action.includes('Link')).length;
  const failedActions = activityLogs.filter(log => log.status === 'Failed').length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Activity Logs</h1>
        <p className="text-[#C0C8D3]">Audit trail of all administrative actions</p>
      </div>

      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardHeader className="p-5 border-b border-white/10">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by actor, action, or target..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Actions</SelectItem>
                  <SelectItem value="Create User" className="text-white hover:bg-[#1E90FF]">Create User</SelectItem>
                  <SelectItem value="Reset Password" className="text-white hover:bg-[#1E90FF]">Reset Password</SelectItem>
                  <SelectItem value="Link Student-Parent" className="text-white hover:bg-[#1E90FF]">Link Student-Parent</SelectItem>
                  <SelectItem value="Unlink Student-Parent" className="text-white hover:bg-[#1E90FF]">Unlink Student-Parent</SelectItem>
                  <SelectItem value="Deactivate User" className="text-white hover:bg-[#1E90FF]">Deactivate User</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="h-12 w-full sm:w-36 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Time</SelectItem>
                  <SelectItem value="today" className="text-white hover:bg-[#1E90FF]">Today</SelectItem>
                  <SelectItem value="week" className="text-white hover:bg-[#1E90FF]">This Week</SelectItem>
                  <SelectItem value="month" className="text-white hover:bg-[#1E90FF]">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExport}
                className="h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <span className="w-5 h-5 mr-2" />
                Export Log
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                  <TableHead className="text-white">Timestamp</TableHead>
                  <TableHead className="text-white">Actor</TableHead>
                  <TableHead className="text-white">Action</TableHead>
                  <TableHead className="text-white">Target</TableHead>
                  <TableHead className="text-white">IP Address</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow className="bg-[#0F243E] border-b border-white/5">
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-white mb-2">No activity logs found</p>
                      <p className="text-[#C0C8D3] text-sm">Activity will be logged here automatically</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                      <TableCell className="text-[#C0C8D3] text-sm font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{log.actor}</p>
                          <p className="text-xs text-[#C0C8D3]">{log.actor_role}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getActionBadgeColor(log.action)} text-white border-0 flex items-center gap-1 w-fit`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{log.target}</TableCell>
                      <TableCell className="text-[#C0C8D3] text-sm font-mono">{log.ip_address}</TableCell>
                      <TableCell>
                        <Badge className={log.status === "Success" ? "bg-[#28A745] text-white border-0" : "bg-[#DC3545] text-white border-0"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-4 text-[#1E90FF]" />
              <p className="text-[#C0C8D3] text-sm">Total Actions</p>
            </div>
            <p className="text-white text-xl">{totalActions}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Users Created</p>
            <p className="text-[#28A745] text-xl">{usersCreated}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Links Created</p>
            <p className="text-[#1E90FF] text-xl">{linksCreated}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Failed Actions</p>
            <p className="text-[#DC3545] text-xl">{failedActions}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
