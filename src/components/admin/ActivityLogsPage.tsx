import { useState } from "react";
import { Key, Settings, Link } from 'lucide-react';
import { CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
// @ts-ignore - TypeScript language service caching issue
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useActivityLogs } from "../../contexts/domains/IndependentActivityLogContext";
import { CapacitorHelper } from "../../utils/capacitorHelper";

export function ActivityLogsPage() {
  const { activityLogs, getActivityLogs } = useActivityLogs();
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
    if (action.includes('Password')) return <Key className="w-4 h-4" />;
    if (action.includes('Link') || action.includes('Unlink')) return <Link className="w-4 h-4" />;
    if (action.includes('Deactivate') || action.includes('Activate')) return <span className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('Create') || action.includes('Add')) return "bg-emerald-500";
    if (action.includes('Password') || action.includes('Reset')) return "bg-amber-500";
    if (action.includes('Link') && !action.includes('Unlink')) return "bg-[#0A2540]";
    if (action.includes('Delete') || action.includes('Unlink') || action.includes('Deactivate')) return "bg-red-500";
    if (action.includes('Activate') || action.includes('Approve')) return "bg-emerald-500";
    return "bg-gray-300";
  };

  const handleExport = async () => {
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
    await CapacitorHelper.downloadCSV(csvContent, `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
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
        <h1 className="text-[#0A2540] font-heading font-bold mb-2">Activity Logs</h1>
        <p className="text-gray-400">Audit trail of all administrative actions</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100/80">
        <CardHeader className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by actor, action, or target..."
                className="h-12 pl-10 rounded-xl border border-gray-100 bg-white text-[#0A2540]"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl border border-gray-100 bg-white text-[#0A2540]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-100">
                  <SelectItem value="all" className="text-[#0A2540] hover:bg-[#0A2540]/5">All Actions</SelectItem>
                  <SelectItem value="Create User" className="text-[#0A2540] hover:bg-[#0A2540]/5">Create User</SelectItem>
                  <SelectItem value="Reset Password" className="text-[#0A2540] hover:bg-[#0A2540]/5">Reset Password</SelectItem>
                  <SelectItem value="Link Student-Parent" className="text-[#0A2540] hover:bg-[#0A2540]/5">Link Student-Parent</SelectItem>
                  <SelectItem value="Unlink Student-Parent" className="text-[#0A2540] hover:bg-[#0A2540]/5">Unlink Student-Parent</SelectItem>
                  <SelectItem value="Deactivate User" className="text-[#0A2540] hover:bg-[#0A2540]/5">Deactivate User</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="h-12 w-full sm:w-36 rounded-xl border border-gray-100 bg-white text-[#0A2540]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-100">
                  <SelectItem value="all" className="text-[#0A2540] hover:bg-[#0A2540]/5">All Time</SelectItem>
                  <SelectItem value="today" className="text-[#0A2540] hover:bg-[#0A2540]/5">Today</SelectItem>
                  <SelectItem value="week" className="text-[#0A2540] hover:bg-[#0A2540]/5">This Week</SelectItem>
                  <SelectItem value="month" className="text-[#0A2540] hover:bg-[#0A2540]/5">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExport}
                className="h-12 bg-[#0A2540] hover:bg-[#082030] text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <span className="w-5 h-5 mr-2" />
                Export Log
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A2540] border-none">
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
                  <TableRow className="bg-white border-b border-gray-50">
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-[#0A2540] mb-2">No activity logs found</p>
                      <p className="text-gray-400 text-sm">Activity will be logged here automatically</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="bg-white border-b border-gray-50 hover:bg-gray-50">
                      <TableCell className="text-gray-400 text-sm font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{log.actor}</p>
                          <p className="text-xs text-gray-400">{log.actor_role}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getActionBadgeColor(log.action)} text-white border-0 flex items-center gap-1 w-fit`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#0A2540]">{log.target}</TableCell>
                      <TableCell className="text-gray-400 text-sm font-mono">{log.ip_address}</TableCell>
                      <TableCell>
                        <Badge className={log.status === "Success" ? "bg-emerald-500 text-white border-0" : "bg-red-500 text-white border-0"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#0A2540] mb-2">No activity logs found</p>
                <p className="text-gray-400 text-sm">Activity will be logged here automatically</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`${getActionBadgeColor(log.action)} text-white border-0 flex items-center gap-1 w-fit`}>
                      {getActionIcon(log.action)}
                      {log.action}
                    </Badge>
                    <Badge className={log.status === "Success" ? "bg-emerald-500 text-white border-0" : "bg-red-500 text-white border-0"}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-400">Actor</p>
                      <p className="text-[#0A2540]">{log.actor}</p>
                      <p className="text-xs text-gray-400">{log.actor_role}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Target</p>
                      <p className="text-[#0A2540]">{log.target}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">IP Address</p>
                      <p className="text-[#0A2540] font-mono text-xs">{log.ip_address}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Timestamp</p>
                      <p className="text-[#0A2540] text-xs">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100/80 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 text-[#0A2540]" />
            <p className="text-gray-400 text-sm">Total Actions</p>
          </div>
          <p className="text-[#0A2540] text-xl">{totalActions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100/80 p-4">
          <p className="text-gray-400 mb-1 text-sm">Users Created</p>
          <p className="text-emerald-500 text-xl">{usersCreated}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100/80 p-4">
          <p className="text-gray-400 mb-1 text-sm">Links Created</p>
          <p className="text-[#0A2540] text-xl">{linksCreated}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100/80 p-4">
          <p className="text-gray-400 mb-1 text-sm">Failed Actions</p>
          <p className="text-red-500 text-xl">{failedActions}</p>
        </div>
      </div>
    </div>
  );
}
