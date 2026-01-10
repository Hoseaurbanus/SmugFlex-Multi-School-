import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function CreateAssignmentPage() {
  const { currentUser, teachers, getTeacherAssignments, classes } = useSchool();
  
  // Get current teacher
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherAssignments = currentTeacher ? getTeacherAssignments(Number(currentTeacher.id)) : [];
  
  // Only include classes where teacher is assigned as class_teacher
  const teacherClasses = classes.filter((c: any) => c.classTeacherId === currentTeacher?.id);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subjectAssignmentId: "",
    classId: "",
    dueDate: "",
    totalMarks: "20",
    submissionType: "written",
    attachments: [] as string[]
  });

  const [newAttachment, setNewAttachment] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttachment = () => {
    if (newAttachment.trim()) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));
      setNewAttachment("");
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.subjectAssignmentId || !formData.dueDate) {
      toast.error("Please fill all required fields");
      return;
    }

    // In production, this would save to database
    toast.success("Assignment created successfully!");
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      subjectAssignmentId: "",
      classId: "",
      dueDate: "",
      totalMarks: "20",
      submissionType: "written",
      attachments: []
    });
  };

  const selectedAssignment = teacherAssignments.find((a: any) => a.id === Number(formData.subjectAssignmentId));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <span className="w-8 h-8 text-[#3B82F6]" />
        <div>
          <h2 className="text-2xl text-[#0A2540]">Create Assignment</h2>
          <p className="text-sm text-[#6B7280]">
            Create and distribute assignments to your students
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-2 border-gray-200">
            <CardHeader className="bg-[#3B82F6] text-white rounded-t-2xl p-6">
              <h3 className="text-xl">Assignment Details</h3>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Class & Subject Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectAssignment" className="text-[#0A2540]">
                      Class & Subject <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formData.subjectAssignmentId} 
                      onValueChange={(value: string) => {
                        const assignment = teacherAssignments.find((a: any) => a.id === Number(value));
                        handleInputChange("subjectAssignmentId", value);
                        handleInputChange("classId", assignment?.class_id.toString() || "");
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-gray-300">
                        <SelectValue placeholder="Select class & subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherAssignments.map((assignment: any) => (
                          <SelectItem key={assignment.id} value={assignment.id.toString()}>
                            {assignment.class_name} - {assignment.subject_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-[#0A2540]">
                      Due Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange("dueDate", e.target.value)}
                      className="rounded-xl border-gray-300"
                      required
                    />
                  </div>
                </div>

                {/* Assignment Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#0A2540]">
                    Assignment Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Chapter 3 Exercises"
                    className="rounded-xl border-gray-300"
                    required
                  />
                </div>

                {/* Description/Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[#0A2540]">
                    Instructions <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Provide detailed instructions for the assignment..."
                    className="rounded-xl border-gray-300 min-h-[150px]"
                    required
                  />
                </div>

                {/* Submission Type & Marks */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="submissionType" className="text-[#0A2540]">
                      Submission Type
                    </Label>
                    <Select value={formData.submissionType} onValueChange={(value: string) => handleInputChange("submissionType", value)}>
                      <SelectTrigger className="rounded-xl border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="written">Written (Notebook)</SelectItem>
                        <SelectItem value="upload">File Upload</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalMarks" className="text-[#0A2540]">
                      Total Marks
                    </Label>
                    <Input
                      id="totalMarks"
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => handleInputChange("totalMarks", e.target.value)}
                      min="1"
                      max="100"
                      className="rounded-xl border-gray-300"
                    />
                  </div>
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <Label className="text-[#0A2540]">Attachments / Resources (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAttachment}
                      onChange={(e) => setNewAttachment(e.target.value)}
                      placeholder="Paste link to study material or resource"
                      className="rounded-xl border-gray-300"
                    />
                    <Button
                      type="button"
                      onClick={handleAddAttachment}
                      className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl px-4"
                    >
                      <span className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {formData.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 truncate flex-1">{attachment}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <span className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl py-6 flex items-center justify-center gap-2"
                  >
                    <span className="w-5 h-5" />
                    Create Assignment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl border-2 border-gray-200 sticky top-6">
            <CardHeader className="bg-[#F9FAFB] rounded-t-2xl p-4 border-b border-gray-200">
              <h3 className="text-lg text-[#0A2540]">Preview</h3>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {formData.title ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Title</p>
                    <p className="text-[#0A2540]">{formData.title}</p>
                  </div>

                  {selectedAssignment && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Class & Subject</p>
                      <p className="text-[#0A2540]">{selectedAssignment.class_name} - {selectedAssignment.subject_name}</p>
                    </div>
                  )}

                  {formData.dueDate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Due Date</p>
                      <p className="text-[#0A2540] flex items-center gap-2">
                        <span className="w-4 h-4 text-[#3B82F6]" />
                        {new Date(formData.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Marks</p>
                    <p className="text-[#0A2540]">{formData.totalMarks} marks</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Submission Type</p>
                    <p className="text-[#0A2540] capitalize">{formData.submissionType.replace("_", " ")}</p>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Attachments</p>
                      <p className="text-[#3B82F6]">{formData.attachments.length} file(s)</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <span className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Fill in the form to see preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="rounded-2xl border-2 border-[#3B82F6]/20 mt-4">
            <CardContent className="p-4">
              <h4 className="text-sm text-[#0A2540] mb-3 flex items-center gap-2">
                <span className="w-4 h-4 text-[#3B82F6]" />
                Quick Tips
              </h4>
              <ul className="text-xs text-gray-600 space-y-2">
                <li>• Be clear and specific in your instructions</li>
                <li>• Set realistic due dates</li>
                <li>• Attach reference materials when possible</li>
                <li>• Specify grading criteria</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
