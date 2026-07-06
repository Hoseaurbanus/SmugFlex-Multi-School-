import { Calculator, GraduationCap, Users } from '@phosphor-icons/react';
import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function NotificationSystemPage() {
  const { notifications, addNotification, currentUser, users } = useSchool();
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    recipient: "",
    priority: "info" as 'info' | 'warning' | 'success' | 'error',
  });

  const [selectedRoles, setSelectedRoles] = useState({
    teachers: false,
    parents: false,
    accountants: false,
  });

  // Get recent notifications (last 10)
  const recentNotifications = notifications.slice(0, 10);

  // Calculate stats
  const sentThisWeek = notifications.filter(n => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(n.sentDate) >= weekAgo;
  }).length;

  const totalSent = notifications.length;
  const totalReadCount = notifications.reduce((sum, n) => sum + n.readBy.length, 0);
  const totalPossibleReads = notifications.reduce((sum, n) => {
    const audience = n.targetAudience;
    if (audience === 'all') return sum + users.length;
    if (audience === 'teachers') return sum + users.filter((u: any) => u.role === 'teacher').length;
    if (audience === 'parents') return sum + users.filter((u: any) => u.role === 'parent').length;
    if (audience === 'accountants') return sum + users.filter((u: any) => u.role === 'accountant').length;
    return sum;
  }, 0);

  const readRate = totalPossibleReads > 0 ? Math.round((totalReadCount / totalPossibleReads) * 100) : 0;
  const deliveryRate = 97; // Assume 97% delivery rate

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.message || !formData.recipient) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to send notifications");
      return;
    }

    let targetAudience: 'all' | 'teachers' | 'parents' | 'students' | 'accountants' = 'all';
    
    if (formData.recipient === 'custom') {
      // For custom, determine primary audience
      if (selectedRoles.teachers && !selectedRoles.parents && !selectedRoles.accountants) {
        targetAudience = 'teachers';
      } else if (selectedRoles.parents && !selectedRoles.teachers && !selectedRoles.accountants) {
        targetAudience = 'parents';
      } else if (selectedRoles.accountants && !selectedRoles.teachers && !selectedRoles.parents) {
        targetAudience = 'accountants';
      } else {
        targetAudience = 'all';
      }
    } else {
      targetAudience = formData.recipient as any;
    }

    addNotification({
      title: formData.title,
      message: formData.message,
      type: formData.priority,
      targetAudience,
      sentBy: currentUser.id,
      sentDate: new Date().toISOString(),
      isRead: false,
      readBy: [],
    });

    toast.success("Notification sent successfully!");
    
    // Reset form
    setFormData({
      title: "",
      message: "",
      recipient: "",
      priority: "info",
    });
    setSelectedRoles({
      teachers: false,
      parents: false,
      accountants: false,
    });
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-[#28A745]';
      case 'warning':
        return 'bg-[#FFC107]';
      case 'error':
        return 'bg-[#DC3545]';
      default:
        return 'bg-[#0A2540]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Notification System</h1>
          <p className="text-gray-600 mt-1">Send notifications and announcements to users</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100">
              <h3 className="text-gray-900 font-heading font-semibold">Create New Notification</h3>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-700">Notification Title *</Label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., School fees reminder"
                      className="h-11 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Recipients *</Label>
                    <Select
                      value={formData.recipient}
                      onValueChange={(value: string) => setFormData({ ...formData, recipient: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-[#0A2540]/20 focus:border-[#0A2540]">
                        <SelectValue placeholder="Select recipient group" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100">
                        <SelectItem value="all" className="text-gray-900">All Users</SelectItem>
                        <SelectItem value="teachers" className="text-gray-900">All Teachers</SelectItem>
                        <SelectItem value="parents" className="text-gray-900">All Parents</SelectItem>
                        <SelectItem value="accountants" className="text-gray-900">All Accountants</SelectItem>
                        <SelectItem value="custom" className="text-gray-900">Custom Selection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, priority: value as 'info' | 'warning' | 'success' | 'error' })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-[#0A2540]/20 focus:border-[#0A2540]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100">
                        <SelectItem value="info" className="text-gray-900">Info</SelectItem>
                        <SelectItem value="success" className="text-gray-900">Success</SelectItem>
                        <SelectItem value="warning" className="text-gray-900">Warning</SelectItem>
                        <SelectItem value="error" className="text-gray-900">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.recipient === 'custom' && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-700">Select User Roles</Label>
                      <span className="text-xs text-gray-500">Optional (defaults to All)</span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="teachers"
                          checked={selectedRoles.teachers}
                          onCheckedChange={(checked: boolean) =>
                            setSelectedRoles({ ...selectedRoles, teachers: checked })
                          }
                          className="border-gray-300"
                        />
                        <Label htmlFor="teachers" className="text-gray-800 cursor-pointer flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" weight="bold" />
                          Teachers
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="parents"
                          checked={selectedRoles.parents}
                          onCheckedChange={(checked: boolean) =>
                            setSelectedRoles({ ...selectedRoles, parents: checked })
                          }
                          className="border-gray-300"
                        />
                        <Label htmlFor="parents" className="text-gray-800 cursor-pointer flex items-center gap-2">
                          <Users className="w-4 h-4" weight="bold" />
                          Parents
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="accountants"
                          checked={selectedRoles.accountants}
                          onCheckedChange={(checked: boolean) =>
                            setSelectedRoles({ ...selectedRoles, accountants: checked })
                          }
                          className="border-gray-300"
                        />
                        <Label htmlFor="accountants" className="text-gray-800 cursor-pointer flex items-center gap-2">
                          <Calculator className="w-4 h-4" weight="bold" />
                          Accountants
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-700">Message *</Label>
                  <Textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write the message you want recipients to see"
                    className="min-h-36 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white h-11 rounded-xl sm:flex-1">
                    Send Notification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 text-gray-900 hover:bg-gray-50 h-11 rounded-xl sm:flex-1"
                    onClick={() => {
                      setFormData({ title: '', message: '', recipient: '', priority: 'info' });
                      setSelectedRoles({ teachers: false, parents: false, accountants: false });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100">
              <h3 className="text-gray-900 font-heading font-semibold">Notification Analytics</h3>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-gray-600 text-xs">Sent This Week</p>
                  <p className="text-gray-900 font-bold text-xl mt-1">{sentThisWeek}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-gray-600 text-xs">Total Sent</p>
                  <p className="text-gray-900 font-bold text-xl mt-1">{totalSent}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-gray-600 text-xs">Read Rate</p>
                  <p className="text-gray-900 font-bold text-xl mt-1">{readRate}%</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-gray-600 text-xs">Delivery Rate</p>
                  <p className="text-gray-900 font-bold text-xl mt-1">{deliveryRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100">
              <h3 className="text-gray-900 font-heading font-semibold">Recent Notifications</h3>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {recentNotifications.length === 0 ? (
                <p className="text-gray-600 text-sm">No notifications sent yet</p>
              ) : (
                recentNotifications.map((notification, index) => (
                  <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Badge className={`${getPriorityColor(notification.type)} text-white text-xs`}>
                        {String(notification.type || '').toUpperCase()}
                      </Badge>
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        {new Date(notification.sentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium text-sm truncate">{notification.title}</p>
                    <p className="text-gray-600 text-xs truncate">{notification.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
