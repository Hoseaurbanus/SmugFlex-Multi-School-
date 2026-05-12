import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useSchool } from "../../contexts/SchoolContext";
import { useNotificationService } from "../../contexts/NotificationService";
import { toast } from "sonner";
import { MessageSquare, Send, Users, User, Search, Clock, CheckCircle, AlertCircle, Filter, RefreshCw, Mail, Phone, Camera, Upload, X, FileImage } from "lucide-react";

export function MessageParentsPage() {
  const { 
    students, 
    parents, 
    currentUser, 
    classes, 
    teachers, 
    getTeacherAssignments,
    parentStudentLinks,
    addNotification
  } = useSchool();
  
  const { broadcast } = useNotificationService();
  
  // Get current teacher's classes - both as class teacher and subject teacher
  const currentTeacher = teachers.find(t => t.id === currentUser?.linked_id);
  const teacherAssignments = currentTeacher ? getTeacherAssignments(typeof currentTeacher.id === 'number' ? currentTeacher.id : Number(currentTeacher.id)) : [];
  
  // Get classes where teacher is either class teacher or subject teacher
  const teacherClasses = [
    // Classes where teacher is class teacher
    ...classes.filter((c: any) => c && c.classTeacherId === currentTeacher?.id),
    // Classes where teacher has subject assignments
    ...teacherAssignments.map(a => classes.find((c: any) => c && c.id === a.class_id)).filter((c): c is any => Boolean(c))
  ];
  
  // Remove duplicates
  const uniqueTeacherClasses = Array.from(new Map(teacherClasses.filter(c => c).map(c => [c.id, c])).values());
  
  // Get students from all classes where teacher teaches
  const teacherStudents = students.filter(s => uniqueTeacherClasses.some((c: any) => c && c.id === s.class_id));
  
  // Enhanced validation - teacher must have some assignment (class or subject)
  if (uniqueTeacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Assignment</h3>
            <p className="text-xs text-gray-600 mb-4">
              You are not assigned as a class teacher or subject teacher for any class.
            </p>
            <p className="text-xs text-gray-500">
              Please contact the administrator to get assigned to a class.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const [messageData, setMessageData] = useState({
    recipientType: "single",
    studentId: "",
    classId: "",
    subject: "",
    message: "",
    priority: "normal"
  });

  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message templates
  const messageTemplates = [
    {
      id: "meeting",
      name: "Parent Meeting Request",
      subject: "Parent Meeting Request",
      message: "Dear Parent, I would like to schedule a meeting to discuss your child's progress. Please let me know your availability."
    },
    {
      id: "homework",
      name: "Homework Reminder",
      subject: "Homework Reminder",
      message: "Dear Parent, Please remind your child to complete and submit their homework on time. Thank you for your support."
    },
    {
      id: "behavior",
      name: "Behavior Update",
      subject: "Behavior Update",
      message: "Dear Parent, I wanted to update you on your child's recent behavior in class. Please contact me for more details."
    },
    {
      id: "absence",
      name: "Absence Notification",
      subject: "Absence Notification",
      message: "Dear Parent, Your child was absent from school today. Please provide a reason for the absence if applicable."
    }
  ];

  // Enhanced student data with parent information
  const studentsWithParents = teacherStudents.map(student => {
    const parentLink = parentStudentLinks.find(link => link.student_id === student.id);
    const parent = parentLink ? parents.find(p => p.id === parentLink.parent_id) : null;
    
    return {
      ...student,
      parent: parent ? {
        id: parent.id,
        name: `${parent.firstName} ${parent.lastName}`,
        email: parent.email,
        phone: parent.phone
      } : null,
      hasParentLinked: !!parent
    };
  }).filter(student => student.hasParentLinked); // Only show students with linked parents

  // Define type for recipient
  interface Recipient {
    id: number;
    name: string;
    email: string;
    phone: string;
  }

  // Filter students based on search
  const filteredStudents = studentsWithParents.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.parent?.name.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageData.subject.trim() || !messageData.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if there are any students with linked parents
    if (studentsWithParents.length === 0) {
      toast.error("No students with linked parents found. Cannot send messages.");
      return;
    }

    setIsLoading(true);
    
    try {
      // Get recipients based on type
      let recipients: Recipient[] = [];
      
      if (messageData.recipientType === "single") {
        const student = studentsWithParents.find(s => s.id === Number(messageData.studentId));
        if (student?.parent) {
          recipients = [student.parent];
        } else {
          toast.error("Selected student has no linked parent");
          return;
        }
      } else if (messageData.recipientType === "class") {
        const classStudents = studentsWithParents.filter(s => s.class_id === Number(messageData.classId));
        recipients = classStudents.map(s => s.parent).filter(Boolean) as Recipient[];
        
        if (recipients.length === 0) {
          toast.error("No parents linked to students in this class");
          return;
        }
      } else {
        recipients = studentsWithParents.map(s => s.parent).filter(Boolean) as Recipient[];
      }

      if (recipients.length === 0) {
        toast.error("No recipients found");
        return;
      }

      // Create a single notification targeted to specific parent user IDs
      const targetUserIds = recipients.map(r => Number(r.id)).filter(id => Number.isFinite(id));
      await addNotification({
        title: messageData.subject,
        message: messageData.message + (uploadedImages.length > 0 ? `\n\nAttachments: ${uploadedImages.length} photo(s)` : ""),
        type: messageData.priority === "urgent" ? "warning" : "info",
        targetAudience: "parents",
        sentBy: currentUser!.id,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: [],
        targetUsers: targetUserIds,
        deletedBy: []
      });

      // Enhanced broadcast
      broadcast({
        id: Date.now(),
        title: messageData.subject,
        message: messageData.message + (uploadedImages.length > 0 ? `\n\nAttachments: ${uploadedImages.length} photo(s)` : ""),
        type: messageData.priority === "urgent" ? "warning" : "info",
        targetAudience: "parents",
        sentDate: new Date().toISOString()
      });

      // Add to sent messages with attachment info
      const newMessage = {
        id: sentMessages.length + 1,
        subject: messageData.subject,
        message: messageData.message,
        recipientType: messageData.recipientType,
        recipientCount: recipients.length,
        timestamp: new Date().toISOString(),
        priority: messageData.priority,
        status: "Sent",
        hasAttachments: uploadedImages.length > 0,
        attachmentCount: uploadedImages.length,
        senderInfo: {
          name: `${currentTeacher?.firstName} ${currentTeacher?.lastName}`,
          role: "Class Teacher"
        }
      };

      setSentMessages([newMessage, ...sentMessages]);
      toast.success(`Message${uploadedImages.length > 0 ? ` with ${uploadedImages.length} photo(s)` : ""} sent to ${recipients.length} parent(s) successfully!`);
      
      // Reset form including images
      setMessageData({ 
        recipientType: "single", 
        studentId: "", 
        classId: "", 
        subject: "", 
        message: "",
        priority: "normal"
      });
      setSelectedTemplate("");
      clearAllImages();
      
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecipientCount = () => {
    if (messageData.recipientType === "single") {
      const student = studentsWithParents.find(s => s.id === Number(messageData.studentId));
      return student?.parent ? 1 : 0;
    } else if (messageData.recipientType === "class") {
      const classStudents = studentsWithParents.filter(s => s.class_id === Number(messageData.classId));
      return classStudents.filter(s => s.parent).length;
    }
    return studentsWithParents.filter(s => s.parent).length;
  };

  // Get class statistics showing only students with linked parents
  const getClassParentCount = (classId: number) => {
    return studentsWithParents.filter(s => s.class_id === classId && s.parent).length;
  };

  const applyTemplate = (template: any) => {
    setMessageData({
      ...messageData,
      subject: template.subject,
      message: template.message
    });
    setSelectedTemplate(template.id);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 text-xs">High Priority</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Normal</Badge>;
    }
  };

  // Photo upload functions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      toast.error("Please select valid image files");
      return;
    }

    if (uploadedImages.length + validFiles.length > 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    setUploadedImages(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${validFiles.length} image(s) uploaded`);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setUploadedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Message Parents
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Send messages and updates to parents/guardians
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {currentTeacher && `${currentTeacher.firstName} ${currentTeacher.lastName}`}
            </div>
            <div className="text-xs text-gray-500">
              {studentsWithParents.length} students with linked parents
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Templates */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {messageTemplates.map(template => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="text-xs h-8 justify-start"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compose Message */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4" />
                Compose Message
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {studentsWithParents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No Parents Linked</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    None of your students have parents linked to their accounts. Messages can only be sent to students with linked parents.
                  </p>
                  <p className="text-xs text-gray-500">
                    Please contact the administrator to link parents to student accounts.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                {/* Recipient Type */}
                <div>
                  <Label className="text-xs font-medium">Send To *</Label>
                  <Select
                    value={messageData.recipientType}
                    onValueChange={(value) => setMessageData({ ...messageData, recipientType: value as "single" | "class" | "all" })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Student Parent</SelectItem>
                      <SelectItem value="class">All Parents in Class</SelectItem>
                      <SelectItem value="all">All Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Single Student Selection */}
                {messageData.recipientType === "single" && (
                  <div>
                    <Label className="text-xs font-medium">Select Student *</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                    </div>
                    <Select
                      value={messageData.studentId}
                      onValueChange={(value) => setMessageData({ ...messageData, studentId: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Choose student" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudents.map((student) => {
                          const studentClass = classes.find(c => c.id === student.class_id);
                          return (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              <div className="flex flex-col">
                                <span>{student.firstName} {student.lastName}</span>
                                <span className="text-xs text-gray-500">
                                  {studentClass?.name || 'Unknown Class'} 
                                  {student.parent ? ` • ${student.parent.name}` : ' • No parent linked'}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Class Selection */}
                {messageData.recipientType === "class" && (
                  <div>
                    <Label className="text-xs font-medium">Select Class *</Label>
                    <Select
                      value={messageData.classId}
                      onValueChange={(value) => setMessageData({ ...messageData, classId: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Choose class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses
                          .filter((cls: any) => cls && getClassParentCount(cls.id) > 0) // Only show classes with linked parents
                          .map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name} ({getClassParentCount(cls.id)} parents)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {teacherClasses.filter((cls: any) => cls && getClassParentCount(cls.id) === 0).length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Some classes have no parents linked and are hidden
                      </p>
                    )}
                  </div>
                )}

                {/* Priority */}
                <div>
                  <Label className="text-xs font-medium">Priority</Label>
                  <Select
                    value={messageData.priority}
                    onValueChange={(value: string) => setMessageData({ ...messageData, priority: value })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div>
                  <Label className="text-xs font-medium">Subject *</Label>
                  <Input
                    value={messageData.subject}
                    onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                    placeholder="Message subject"
                    className="h-8 text-sm"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <Label className="text-xs font-medium">Message *</Label>
                  <Textarea
                    value={messageData.message}
                    onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="text-sm resize-none"
                    rows={4}
                    required
                  />
                </div>

                {/* Photo Upload Section */}
                <div>
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Camera className="w-3 h-3" />
                    Attach Photos (Optional - Max 3)
                  </Label>
                  <div className="mt-2 space-y-2">
                    {/* Upload Button */}
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadedImages.length >= 3}
                        className="h-7 text-xs"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Add Photos
                      </Button>
                      {uploadedImages.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearAllImages}
                          className="h-7 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear All
                        </Button>
                      )}
                      <span className="text-xs text-gray-500">
                        {uploadedImages.length}/3 photos
                      </span>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-gray-200"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {uploadedImages[index]?.name.slice(0, 10)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Send Button */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-600">
                      {getRecipientCount()} recipient(s)
                    </span>
                    {getPriorityBadge(messageData.priority)}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || getRecipientCount() === 0}
                    className="h-8 text-xs"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sent Messages */}
        <div>
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sent Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-[600px] overflow-y-auto">
                {sentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No messages sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentMessages.map((msg) => (
                      <div key={msg.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-xs text-gray-900 truncate">{msg.subject}</p>
                              {getPriorityBadge(msg.priority)}
                              {msg.hasAttachments && (
                                <Badge className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1">
                                  <FileImage className="w-2 h-2" />
                                  {msg.attachmentCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(msg.timestamp).toLocaleDateString()} • {msg.recipientCount} recipients
                            </p>
                            {msg.senderInfo && (
                              <p className="text-xs text-gray-400">
                                {msg.senderInfo.name} • {msg.senderInfo.role}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
