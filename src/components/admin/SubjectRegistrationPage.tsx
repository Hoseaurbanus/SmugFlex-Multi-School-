import { Book, BookOpen, Check } from 'lucide-react';
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { SubjectRegistration, SubjectAssignment } from "../../contexts/SchoolContext";

export function SubjectRegistrationPage() {
  const { 
    classes, 
    subjects, 
    teachers, 
    currentAcademicYear, 
    currentTerm,
    subjectRegistrations,
    subjectAssignments,
    registerSubjectForClass,
    removeSubjectRegistration,
    assignSubjectToTeacher,
    removeSubjectAssignment
  } = useSchool();

  const [activeTab, setActiveTab] = useState<"registration" | "assignment">("registration");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  
  // Academic settings - use current from context
  const [academicYear, setAcademicYear] = useState<string>(currentAcademicYear);
  const [term, setTerm] = useState<string>(currentTerm);
  
  // Data states
  const [registrations, setRegistrations] = useState<SubjectRegistration[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [unassignedSubjects, setUnassignedSubjects] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  
  // Dialog states
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAssignmentDialogOpen, setEditAssignmentDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<SubjectRegistration | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<SubjectAssignment | null>(null);
  
  // Form states
  const [registrationForm, setRegistrationForm] = useState({
    subject_id: 0,
    class_id: 0,
    is_compulsory: true
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    subject_id: 0,
    class_id: 0,
    teacher_id: 0
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (academicYear && term) {
      loadData();
    }
  }, [academicYear, term, selectedClass, selectedSubject, selectedTeacher]);

  const loadData = async () => {
    if (!academicYear || !term) return;
    
    setLoading(true);
    try {
      // Use context data directly instead of API calls
      if (activeTab === "registration") {
        // Filter subject registrations from context data
        const data = subjectRegistrations.filter(reg => 
          (!selectedClass || (typeof selectedClass === 'string' && selectedClass === 'all') || reg.class_id === selectedClass) &&
          reg.academic_year === academicYear &&
          reg.term === term
        );
        setRegistrations(data);
      } else {
        // Filter subject assignments from context data
        const data = subjectAssignments.filter(assignment => 
          (!selectedClass || (typeof selectedClass === 'string' && selectedClass === 'all') || assignment.class_id === selectedClass) &&
          (!selectedTeacher || (typeof selectedTeacher === 'string' && selectedTeacher === 'all') || assignment.teacher_id === selectedTeacher) &&
          assignment.academic_year === academicYear &&
          assignment.term === term
        );
        setAssignments(data);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUnassignedSubjects = async (classId: number) => {
    try {
      // Get subjects not already registered for this class
      const registeredSubjectIds = subjectRegistrations
        .filter(reg => reg.class_id === classId && reg.academic_year === academicYear && reg.term === term)
        .map(reg => reg.subject_id);
      
      const available = subjects.filter(subject => 
        !registeredSubjectIds.includes(subject.id)
      );
      setUnassignedSubjects(available);
    } catch (error) {
      toast.error('Failed to load available subjects');
    }
  };

  const loadAvailableTeachers = (subjectId: number, classId: number) => {
    try {
      // Get all teachers (simplified - in real system might check qualifications)
      setAvailableTeachers(teachers);
    } catch (error) {
      toast.error('Failed to load available teachers');
    }
  };

  const handleRegisterSubject = async () => {
    if (!registrationForm.subject_id || !registrationForm.class_id) {
      toast.error('Please select both subject and class');
      return;
    }

    try {
      const success = await registerSubjectForClass(
        registrationForm.subject_id,
        registrationForm.class_id,
        academicYear,
        term,
        registrationForm.is_compulsory
      );
      
      if (success) {
        setRegistrationDialogOpen(false);
        setRegistrationForm({ subject_id: 0, class_id: 0, is_compulsory: true });
        loadData();
        toast.success('Subject registered successfully!');
      }
    } catch (error) {
      toast.error('Failed to register subject');
    }
  };

  const handleAssignSubject = async () => {
    if (!assignmentForm.subject_id || !assignmentForm.class_id || !assignmentForm.teacher_id) {
      toast.error('Please select subject, class, and teacher');
      return;
    }

    try {
      const success = await assignSubjectToTeacher(
        assignmentForm.subject_id,
        assignmentForm.class_id,
        assignmentForm.teacher_id,
        academicYear,
        term
      );
      
      if (success) {
        setAssignmentDialogOpen(false);
        setAssignmentForm({ subject_id: 0, class_id: 0, teacher_id: 0 });
        loadData();
        toast.success('Teacher assigned successfully!');
      }
    } catch (error) {
      toast.error('Failed to assign teacher');
    }
  };

  const handleRemoveRegistration = async (registration: SubjectRegistration) => {
    try {
      const success = await removeSubjectRegistration(
        registration.subject_id,
        registration.class_id,
        registration.academic_year,
        registration.term
      );
      
      if (success) {
        loadData();
        toast.success('Subject registration removed!');
      }
    } catch (error) {
      toast.error('Failed to remove registration');
    }
  };

  const handleRemoveAssignment = async (assignment: SubjectAssignment) => {
    try {
      const success = await removeSubjectAssignment(
        assignment.subject_id,
        assignment.class_id,
        assignment.teacher_id,
        assignment.academic_year,
        assignment.term
      );
      
      if (success) {
        loadData();
        toast.success('Teacher assignment removed!');
      }
    } catch (error) {
      toast.error('Failed to remove assignment');
    }
  };

  const filteredRegistrations = registrations.filter(reg => 
    (reg.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (reg.class_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssignments = assignments.filter(assignment => 
    (assignment.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (assignment.class_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (assignment.teacher_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Registration & Assignment</h1>
          <p className="text-gray-600 mt-1">
            Manage subject registration per class and assign teachers for {academicYear} - {term}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {academicYear}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {term}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "registration" ? "default" : "ghost"}
          onClick={() => setActiveTab("registration")}
          className="flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Subject Registration
        </Button>
        <Button
          variant={activeTab === "assignment" ? "default" : "ghost"}
          onClick={() => setActiveTab("assignment")}
          className="flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Teacher Assignment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search subjects, classes, teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={selectedClass?.toString() || "all"} onValueChange={(value) => setSelectedClass(value === "all" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeTab === "assignment" && (
              <div>
                <Label>Teacher</Label>
                <Select value={selectedTeacher?.toString() || "all"} onValueChange={(value) => setSelectedTeacher(value === "all" ? null : parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button onClick={loadData} disabled={loading} variant="outline">
                <span className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Registration Tab */}
      {activeTab === "registration" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Subject Registration
            </CardTitle>
            <Button onClick={() => setRegistrationDialogOpen(true)}>
              <span className="w-4 h-4 mr-2" />
              Register Subject
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <span className="w-6 h-6 animate-spin mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No subject registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{registration.subject_name || 'No subject'}</div>
                          <div className="text-sm text-gray-500">{registration.subject_code || 'No code'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{registration.class_name || 'No class'}</div>
                          <div className="text-sm text-gray-500">{registration.class_level || 'No level'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{registration.subject_category || 'No category'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={registration.is_compulsory ? "default" : "secondary"}>
                          {registration.is_compulsory ? "Compulsory" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={registration.status === "Active" ? "default" : "destructive"}>
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRegistration(registration);
                              setEditDialogOpen(true);
                            }}
                          >
                            <span className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveRegistration(registration)}
                          >
                            <span className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Teacher Assignment Tab */}
      {activeTab === "assignment" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              Teacher Assignment
            </CardTitle>
            <Button onClick={() => setAssignmentDialogOpen(true)}>
              <span className="w-4 h-4 mr-2" />
              Assign Subject
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <span className="w-6 h-6 animate-spin mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No subject assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.subject_name || 'No subject'}</div>
                          <div className="text-sm text-gray-500">ID: {assignment.subject_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.class_name || 'No class'}</div>
                          <div className="text-sm text-gray-500">ID: {assignment.class_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {assignment.teacher_name || 'Unassigned'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignment.status === "Active" ? "default" : "destructive"}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setEditAssignmentDialogOpen(true);
                            }}
                          >
                            <span className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveAssignment(assignment)}
                          >
                            <span className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subject Registration Dialog */}
      <Dialog open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Subject for Class</DialogTitle>
            <DialogDescription>
              Register a subject for a class in {academicYear} - {term}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Select
                value={registrationForm.class_id.toString()}
                onValueChange={(value) => {
                  const classId = parseInt(value);
                  setRegistrationForm(prev => ({ ...prev, class_id: classId }));
                  loadUnassignedSubjects(classId);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select
                value={registrationForm.subject_id.toString()}
                onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, subject_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compulsory"
                checked={registrationForm.is_compulsory}
                onCheckedChange={(checked) => 
                  setRegistrationForm(prev => ({ ...prev, is_compulsory: checked as boolean }))
                }
              />
              <Label htmlFor="compulsory">Compulsory Subject</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegisterSubject} disabled={!registrationForm.subject_id || !registrationForm.class_id}>
              Register Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subject to Teacher</DialogTitle>
            <DialogDescription>
              Assign a subject to a teacher for {academicYear} - {term}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Select
                value={assignmentForm.class_id.toString()}
                onValueChange={(value) => {
                  const classId = parseInt(value);
                  setAssignmentForm(prev => ({ ...prev, class_id: classId }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select
                value={assignmentForm.subject_id.toString()}
                onValueChange={(value) => {
                  setAssignmentForm(prev => ({ ...prev, subject_id: parseInt(value) }));
                  // Load available teachers when subject changes
                  if (value && assignmentForm.class_id) {
                    loadAvailableTeachers(parseInt(value), assignmentForm.class_id);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select
                value={assignmentForm.teacher_id.toString()}
                onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, teacher_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubject} disabled={!assignmentForm.subject_id || !assignmentForm.class_id || !assignmentForm.teacher_id}>
              Assign Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
