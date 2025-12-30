import { Calculator, GraduationCap, Users } from 'lucide-react';
import { useState } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
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

    // Map priority to type
    const typeMap = {
      normal: 'info' as const,
      low: 'info' as const,
      high: 'warning' as const,
      urgent: 'error' as const,
    };

    addNotification({
      title: formData.title,
      message: formData.message,
      type: typeMap[formData.priority as keyof typeof typeMap] || 'info',
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
        return 'bg-[#1E90FF]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Notification System</h1>
        <p className="text-[#C0C8D3]">Send notifications and announcements to users</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Create Notification Form */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white flex items-center gap-2">
                <span className="w-5 h-5" />
                Create New Notification
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">Notification Title *</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter notification title"
                    className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Message *</Label>
                  <Textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your message here..."
                    className="min-h-32 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Recipients *</Label>
                  <Select value={formData.recipient} onValueChange={(value: string) => setFormData({ ...formData, recipient: value })}>
                    <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                      <SelectValue placeholder="Select recipient group" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F243E] border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Users</SelectItem>
                      <SelectItem value="teachers" className="text-white hover:bg-[#1E90FF]">All Teachers</SelectItem>
                      <SelectItem value="parents" className="text-white hover:bg-[#1E90FF]">All Parents</SelectItem>
                      <SelectItem value="accountants" className="text-white hover:bg-[#1E90FF]">All Accountants</SelectItem>
                      <SelectItem value="custom" className="text-white hover:bg-[#1E90FF]">Custom Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipient === "custom" && (
                  <div className="p-4 bg-[#0F243E] rounded-xl border border-white/10 space-y-3">
                    <Label className="text-white">Select User Roles:</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="teachers"
                          checked={selectedRoles.teachers}
                          onCheckedChange={(checked: boolean) => setSelectedRoles({ ...selectedRoles, teachers: checked })}
                          className="border-white/20"
                        />
                        <Label htmlFor="teachers" className="text-white cursor-pointer flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Teachers
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="parents"
                          checked={selectedRoles.parents}
                          onCheckedChange={(checked: boolean) => setSelectedRoles({ ...selectedRoles, parents: checked })}
                          className="border-white/20"
                        />
                        <Label htmlFor="parents" className="text-white cursor-pointer flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Parents
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="accountants"
                          checked={selectedRoles.accountants}
                          onCheckedChange={(checked: boolean) => setSelectedRoles({ ...selectedRoles, accountants: checked })}
                          className="border-white/20"
                        />
                        <Label htmlFor="accountants" className="text-white cursor-pointer flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Accountants
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-white">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value: string) => setFormData({ ...formData, priority: value as 'info' | 'warning' | 'success' | 'error' })}>
                    <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F243E] border-white/10">
                      <SelectItem value="info" className="text-white hover:bg-[#1E90FF]">Info</SelectItem>
                      <SelectItem value="warning" className="text-white hover:bg-[#1E90FF]">Warning</SelectItem>
                      <SelectItem value="success" className="text-white hover:bg-[#1E90FF]">Success</SelectItem>
                      <SelectItem value="error" className="text-white hover:bg-[#1E90FF]">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all"
                  >
                    <span className="w-5 h-5 mr-2" />
                    Send Notification
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications & Statistics */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white flex items-center gap-2">
                <span className="w-5 h-5" />
                Recent Notifications
              </h3>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {recentNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <span className="w-12 h-12 mx-auto mb-3 text-[#C0C8D3]" />
                  <p className="text-white mb-1">No notifications yet</p>
                  <p className="text-sm text-[#C0C8D3]">Send your first notification above</p>
                </div>
              ) : (
                recentNotifications.map((notification) => (
                  <div key={notification.id} className="p-3 bg-[#0F243E] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-sm">{notification.title}</p>
                      <Badge className={`${getPriorityColor(notification.type)} text-white border-0 text-xs`}>
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#C0C8D3] mb-2 line-clamp-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#C0C8D3]">{notification.targetAudience}</span>
                      <span className="text-xs text-[#C0C8D3]">{new Date(notification.sentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white text-sm">Statistics</h3>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-[#C0C8D3]">Sent This Week</span>
                <span className="text-white">{sentThisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C0C8D3]">Total Sent</span>
                <span className="text-white">{totalSent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C0C8D3]">Delivered</span>
                <span className="text-[#28A745]">{deliveryRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C0C8D3]">Read Rate</span>
                <span className="text-[#1E90FF]">{readRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
