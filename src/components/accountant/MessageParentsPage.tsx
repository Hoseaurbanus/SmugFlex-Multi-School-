import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useAuth } from "../../contexts/domains/AuthContext";
import { useStudents } from "../../contexts/domains/StudentContext";
import { useNotifications } from "../../contexts/domains/NotificationContext";
import { toast } from "sonner";

export function MessageParentsPage() {
  const { currentUser } = useAuth();
  const { parents } = useStudents();
  const { notifications, addNotification, markNotificationAsRead } = useNotifications();
  const [messageData, setMessageData] = useState({
    recipientType: "all_parents", // all_parents, specific_parent
    parentId: "",
    subject: "",
    message: ""
  });

  // Reply functionality state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let targetAudience = "parents";
      let recipientText = "All Parents";
      
      if (messageData.recipientType === "specific_parent" && messageData.parentId) {
        const selectedParent = parents.find(p => p.id === parseInt(messageData.parentId));
        recipientText = `${selectedParent?.firstName} ${selectedParent?.lastName}`;
      }

      // Create notification for parents
      await addNotification({
        title: `Accountant Message: ${messageData.subject}`,
        message: `From: School Accountant\nTo: ${recipientText}\nSubject: ${messageData.subject}\n\n${messageData.message}`,
        type: 'info',
        targetAudience: targetAudience as any,
        targetUsers:
          messageData.recipientType === 'specific_parent' && messageData.parentId
            ? [Number(messageData.parentId)]
            : undefined,
        sentBy: currentUser?.id || 0,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: []
      });

      toast.success(`Message sent to ${recipientText} successfully!`);
      setMessageData({ recipientType: "all_parents", parentId: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    }
  };

  // Reply handler functions
  const handleReply = (notification: any) => {
    setReplyingTo(notification);
    setReplyMessage('');
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !replyingTo) return;

    try {
      // Extract parent info from the original message
      const originalMessage = replyingTo.originalNotification || replyingTo;
      const parentInfo = originalMessage.message.split('\n')[0]; // First line should contain parent info
      
      // Send reply notification to the specific parent
      await addNotification({
        title: `Re: ${replyingTo.title}`,
        message: `Accountant Reply:\n\n${replyMessage}\n\n---\nOriginal Message:\n${replyingTo.message}`,
        type: 'info',
        targetAudience: 'parents',
        targetUsers: replyingTo.sentBy ? [replyingTo.sentBy] : undefined,
        sentBy: currentUser?.id || 0,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: []
      });

      toast.success('Reply sent successfully!');
      setReplyDialogOpen(false);
      setReplyMessage('');
      setReplyingTo(null);
    } catch (error) {
      toast.error('Failed to send reply. Please try again.');
    }
  };

  // Mark notification as read when viewed
  const handleViewNotification = async (notification: any) => {
    // Mark as read if it's unread
    if (!notification.readBy.includes(currentUser?.id || 0)) {
      try {
        await markNotificationAsRead(notification.id);
        toast.success('Message marked as read');
      } catch (error) {
        // Silent fail for security
      }
    }
  };

  // Filter parent messages sent to accountants
  const parentMessages = notifications.filter(n => {
    const isParentMessage = n.type === 'info' && n.targetAudience === 'accountants';
    return isParentMessage;
  }).sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Message Parents</h1>
        <p className="text-[#6B7280]">Send messages to parents regarding fees and payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
            <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <h2 className="font-semibold text-[#1F2937]">Compose Message</h2>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="recipient">Send To *</Label>
                  <Select
                    value={messageData.recipientType}
                    onValueChange={(value: string) => setMessageData({ ...messageData, recipientType: value })}
                    required
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_parents">All Parents</SelectItem>
                      <SelectItem value="specific_parent">Specific Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {messageData.recipientType === "specific_parent" && (
                  <div>
                    <Label htmlFor="parent">Select Parent *</Label>
                    <Select
                      value={messageData.parentId}
                      onValueChange={(value: string) => setMessageData({ ...messageData, parentId: value })}
                      required
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Select parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id.toString()}>
                            {parent.firstName} {parent.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={messageData.subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageData({ ...messageData, subject: e.target.value })}
                    placeholder="Message subject (e.g., Fee Payment Reminder)"
                    className="rounded-lg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={messageData.message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageData({ ...messageData, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="rounded-lg min-h-[200px]"
                    required
                  />
                </div>

                <Button type="submit" className="w-full rounded-lg bg-[#007C91] hover:bg-[#005A6B] text-white">
                  <span className="w-4 h-4 mr-2" />
                  Send Message to Parents
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
            <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <h2 className="font-semibold text-[#1F2937]">Quick Tips</h2>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm text-[#6B7280]">
              <div className="flex gap-3">
                <span className="w-5 h-5 text-[#007C91] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#1F2937] mb-1">Fee Related Messages</p>
                  <p>Use this for fee reminders, payment confirmations, and financial notices.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 text-[#007C91] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#1F2937] mb-1">Targeted Communication</p>
                  <p>Send to all parents for general announcements or specific parents for individual matters.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 text-[#007C91] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#1F2937] mb-1">Clear Subject Line</p>
                  <p>Use descriptive subjects to help parents understand the message purpose quickly.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Parent Messages Section */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <CardTitle className="text-[#1F2937] flex items-center gap-2">
            <span className="w-5 h-5" />
            Parent Messages ({parentMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {parentMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No parent messages received</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parentMessages.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                          <span className="w-3 h-3 mr-1" />
                          Parent Message
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.sentDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[#1F2937] mb-1">{notification.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReply(notification)}
                      className="flex-shrink-0"
                    >
                      <span className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Reply to Parent Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {replyingTo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-[#1F2937] mb-2">Original Message:</h4>
                <p className="text-sm text-gray-600">{replyingTo.title}</p>
                <p className="text-sm text-gray-600 mt-2">{replyingTo.message}</p>
              </div>
            )}
            <div>
              <Label htmlFor="reply-message">Your Reply *</Label>
              <Textarea
                id="reply-message"
                value={replyMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyMessage(e.target.value)}
                placeholder="Type your reply here..."
                className="rounded-lg min-h-[150px]"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="bg-[#007C91] hover:bg-[#005A6B] text-white"
              >
                <span className="w-4 h-4 mr-2" />
                Send Reply
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReplyDialogOpen(false);
                  setReplyMessage('');
                  setReplyingTo(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
