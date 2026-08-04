import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { GraduationCap } from "lucide-react";

interface ProgressionRule {
  id: number;
  from_class_id: number;
  to_class_id: number;
  from_class_name?: string;
  to_class_name?: string;
  academic_year: string;
  is_active: boolean;
}

interface ClassItem {
  id: number;
  name: string;
  status: string;
}

interface ProgressionRulesPanelProps {
  progressionRules: ProgressionRule[];
  classes: ClassItem[];
  currentAcademicYear: string;
  newRuleFromClassId: number | null;
  newRuleToClassId: number | null;
  newRuleIsActive: boolean;
  ruleActionLoading: boolean;
  onSetFromClassId: (id: number | null) => void;
  onSetToClassId: (id: number | null) => void;
  onSetActive: (active: boolean) => void;
  onCreateRule: () => void;
  onUpdateStatus: (ruleId: number, active: boolean) => void;
  onDeleteRule: (ruleId: number) => void;
  onRefresh: () => void;
}

export function ProgressionRulesPanel({
  progressionRules,
  classes,
  currentAcademicYear,
  newRuleFromClassId,
  newRuleToClassId,
  newRuleIsActive,
  ruleActionLoading,
  onSetFromClassId,
  onSetToClassId,
  onSetActive,
  onCreateRule,
  onUpdateStatus,
  onDeleteRule,
  onRefresh,
}: ProgressionRulesPanelProps) {
  const activeClasses = classes.filter((c) => c.status === 'Active');

  return (
    <Card className="border border-gray-100 shadow-xl bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <GraduationCap className="w-5 h-5 text-[#0A2540]" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-gray-900">Progression Rules</h3>
              <p className="text-sm text-gray-600">Manage valid class progression paths for {currentAcademicYear}.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Badge variant="outline" className="text-[#0A2540] border-gray-200">
              {currentAcademicYear}
            </Badge>
            <Button
              onClick={onRefresh}
              disabled={ruleActionLoading}
              variant="outline"
              className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Refresh Rules
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">From Class</Label>
            <Select value={newRuleFromClassId ? newRuleFromClassId.toString() : ''} onValueChange={(value) => onSetFromClassId(value ? Number(value) : null)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                <SelectValue placeholder="Select source class" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {activeClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">To Class</Label>
            <Select value={newRuleToClassId ? newRuleToClassId.toString() : ''} onValueChange={(value) => onSetToClassId(value ? Number(value) : null)}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-[#0A2540] focus:ring-[#0A2540]">
                <SelectValue placeholder="Select destination class" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {activeClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Rule Active</Label>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={newRuleIsActive}
                onCheckedChange={(checked: boolean) => onSetActive(checked)}
                className="border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <Button
              onClick={onCreateRule}
              disabled={ruleActionLoading}
              className="w-full h-12 bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
            >
              Add Rule
            </Button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="text-gray-700 font-semibold">From Class</TableHead>
                <TableHead className="text-gray-700 font-semibold">To Class</TableHead>
                <TableHead className="text-gray-700 font-semibold">Academic Year</TableHead>
                <TableHead className="text-gray-700 font-semibold text-center">Active</TableHead>
                <TableHead className="text-gray-700 font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progressionRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    No progression rules found for this academic year.
                  </TableCell>
                </TableRow>
              ) : (
                progressionRules.map((rule) => (
                  <TableRow key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell>{rule.from_class_name || `#${rule.from_class_id}`}</TableCell>
                    <TableCell>{rule.to_class_name || `#${rule.to_class_id}`}</TableCell>
                    <TableCell>{rule.academic_year}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={rule.is_active ? 'bg-emerald-500 text-white border-0' : 'bg-gray-300 text-gray-700 border-0'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button
                        onClick={() => onUpdateStatus(rule.id, rule.is_active ? false : true)}
                        disabled={ruleActionLoading}
                        variant="outline"
                        className="h-9 px-3 text-sm border-gray-200"
                      >
                        {rule.is_active ? 'Disable' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => onDeleteRule(rule.id)}
                        disabled={ruleActionLoading}
                        variant="destructive"
                        className="h-9 px-3 text-sm"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {progressionRules.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No progression rules found for this academic year.</p>
          ) : (
            progressionRules.map((rule) => (
              <div key={rule.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{rule.from_class_name || `#${rule.from_class_id}`} → {rule.to_class_name || `#${rule.to_class_id}`}</p>
                  <Badge className={rule.is_active ? 'bg-emerald-500 text-white border-0' : 'bg-gray-300 text-gray-700 border-0'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{rule.academic_year}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => onUpdateStatus(rule.id, rule.is_active ? false : true)}
                    disabled={ruleActionLoading}
                    variant="outline"
                    className="h-9 px-3 text-sm border-gray-200 flex-1"
                  >
                    {rule.is_active ? 'Disable' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => onDeleteRule(rule.id)}
                    disabled={ruleActionLoading}
                    variant="destructive"
                    className="h-9 px-3 text-sm flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
