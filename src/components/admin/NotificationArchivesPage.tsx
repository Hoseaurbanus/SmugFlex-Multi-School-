import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useSchool } from '../../contexts/SchoolContext';
import { toast } from 'sonner';

export function NotificationArchivesPage() {
  const { notifications, addNotification, currentUser, markNotificationAsRead } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Transform real notifications for display
  const notificationsData = notifications.map(n => {
    // Calculate read count based on readBy array
    const readCount = n.readBy.length;
    
    // Check if this is a parent message (sent to admin with type 'message')
    const isParentMessage = (n.type as any) === 'message' && (n.targetAudience as any) === 'admin';
    
    // Estimate recipient count based on target audience
    let recipientCount = 0;
    let recipientText = '';
    if (n.targetAudience === 'all') {
      recipientText = 'All Users';
      recipientCount = 500; // Estimated
    } else if (n.targetAudience === 'teachers') {
      recipientText = 'All Teachers';
      recipientCount = 50; // Estimated
    } else if (n.targetAudience === 'parents') {
      recipientText = 'All Parents';
      recipientCount = 300; // Estimated
    } else if (n.targetAudience === 'students') {
      recipientText = 'All Students';
      recipientCount = 400; // Estimated
    } else if (n.targetAudience === 'accountants') {
      recipientText = 'Accountants';
      recipientCount = 5; // Estimated
    } else if ((n.targetAudience as any) === 'admin') {
      recipientText = isParentMessage ? 'Parent Message' : 'Admin Only';
      recipientCount = 1;
    }

    return {
      id: n.id.toString(),
      title: n.title,
      message: n.message,
      type: isParentMessage ? 'parent_message' : (n.type === 'info' ? 'announcement' : n.type === 'warning' ? 'alert' : n.type === 'success' ? 'update' : 'reminder'),
      recipient: recipientText,
      recipientCount,
      sentBy: isParentMessage ? 'Parent' : 'Admin Office',
      sentDate: new Date(n.sentDate).toLocaleDateString(),
      status: 'sent', // All notifications in archive are sent
      readCount,
      isParentMessage,
      originalNotification: n // Store original for reply functionality
    };
  });

  const filteredNotifications = notificationsData.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'parent_message':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300"><span className="w-3 h-3 mr-1" />Parent Message</Badge>;
      case 'announcement':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><span className="w-3 h-3 mr-1" />Announcement</Badge>;
      case 'alert':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><span className="w-3 h-3 mr-1" />Alert</Badge>;
      case 'reminder':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><span className="w-3 h-3 mr-1" />Reminder</Badge>;
      case 'update':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><span className="w-3 h-3 mr-1" />Update</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300"><span className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => parseInt(n.id)));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} notification(s)?`)) {
      setSelectedIds([]);
      // In a real app, this would delete the notifications
    }
  };

  const handleReply = (notification: any) => {
    setReplyingTo(notification);
    setReplyMessage('');
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !replyingTo || !currentUser) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      // Extract parent info from the original message
      const originalMessage = replyingTo.originalNotification;
      const parentInfo = originalMessage.message.split('\n')[0]; // First line should contain parent info
      
      // Send reply notification to the specific parent
      await addNotification({
        title: `Re: ${replyingTo.title}`,
        message: `Admin Reply:\n\n${replyMessage}\n\n---\nOriginal Message:\n${replyingTo.message}`,
        type: 'info' as any, // Using 'info' type for reply messages
        targetAudience: 'parents', // Send to all parents (in a real app, you'd send to specific parent)
        sentBy: currentUser.id,
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
    setSelectedNotification(notification);
    
    // Mark as read if it's unread
    if (notification.readCount === 0 && currentUser) {
      try {
        await markNotificationAsRead(notification.originalNotification.id);
        toast.success('Notification marked as read');
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Notification Archives</h1>
          <p className="text-gray-600">View and manage all sent notifications</p>
        </div>
        {selectedIds.length > 0 && (
          <Button 
            onClick={handleBulkDelete}
            variant="destructive"
            className="rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Delete {selectedIds.length} Selected
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Sent</p>
                <p className="text-[#0A2540]">{notificationsData.filter(n => n.status === 'sent').length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Announcements</p>
                <p className="text-[#0A2540]">{notificationsData.filter(n => n.type === 'announcement').length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Alerts</p>
                <p className="text-[#0A2540]">{notificationsData.filter(n => n.type === 'alert').length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Recipients</p>
                <p className="text-[#0A2540]">{notificationsData.reduce((sum, n) => sum + n.recipientCount, 0)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <span className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="parent_message">Parent Message</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
          <CardTitle className="text-[#0A2540]">Archived Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A2540]/5">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-[#0A2540]">Title</TableHead>
                  <TableHead className="text-[#0A2540]">Type</TableHead>
                  <TableHead className="text-[#0A2540]">Recipient</TableHead>
                  <TableHead className="text-[#0A2540]">Sent By</TableHead>
                  <TableHead className="text-[#0A2540]">Date</TableHead>
                  <TableHead className="text-[#0A2540]">Read Rate</TableHead>
                  <TableHead className="text-[#0A2540]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No notifications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id} className="hover:bg-[#0A2540]/5">
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(parseInt(notification.id))}
                          onCheckedChange={() => toggleSelection(parseInt(notification.id))}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{notification.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{notification.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(notification.type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{notification.recipient}</p>
                          <p className="text-sm text-gray-500">{notification.recipientCount} recipients</p>
                        </div>
                      </TableCell>
                      <TableCell>{notification.sentBy}</TableCell>
                      <TableCell>{notification.sentDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#FFD700] h-2 rounded-full" 
                              style={{ width: `${(notification.readCount / notification.recipientCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round((notification.readCount / notification.recipientCount) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewNotification(notification)}
                            className="text-[#0A2540] hover:text-[#FFD700] hover:bg-[#FFD700]/10 rounded-xl"
                          >
                            <span className="w-4 h-4" />
                          </Button>
                          {notification.isParentMessage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReply(notification)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-xl"
                              title="Reply to parent"
                            >
                              <span className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Notification Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">{selectedNotification?.title}</DialogTitle>
            <DialogDescription>
              Sent to {selectedNotification?.recipient} on {selectedNotification && new Date(selectedNotification.sentDate).toLocaleDateString('en-GB')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              {selectedNotification && getTypeBadge(selectedNotification.type)}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification?.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Sent By:</p>
                <p className="text-[#0A2540]">{selectedNotification?.sentBy}</p>
              </div>
              <div>
                <p className="text-gray-600">Recipients:</p>
                <p className="text-[#0A2540]">{selectedNotification?.recipientCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Read Count:</p>
                <p className="text-[#0A2540]">{selectedNotification?.readCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Read Rate:</p>
                <p className="text-[#0A2540]">
                  {selectedNotification && Math.round((selectedNotification.readCount / selectedNotification.recipientCount) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Reply to Parent Message</DialogTitle>
            <DialogDescription>
              Replying to: {replyingTo?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Original Message:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{replyingTo?.message}</p>
            </div>
            <div>
              <Label htmlFor="reply" className="text-[#0A2540]">Your Reply *</Label>
              <Textarea
                id="reply"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply here..."
                className="min-32 rounded-xl border-[#0A2540]/20 focus:border-[#FFD700]"
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setReplyDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReply}
                className="bg-[#FFD700] hover:bg-[#FFC700] text-[#0A2540] rounded-xl"
              >
                <span className="w-4 h-4 mr-2" />
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}