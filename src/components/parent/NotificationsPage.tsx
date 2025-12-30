import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X, Search, Filter, Calendar, User, AlertCircle, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { useSchool, Notification } from "../../contexts/SchoolContext";

export function NotificationsPage() {
  const { 
    currentUser, 
    notifications, 
    markNotificationAsRead, 
    deleteNotification,
    loadNotificationsFromAPI
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load notifications on component mount
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        await loadNotificationsFromAPI();
      } catch (error) {
        console.error('Error loading notifications:', error);
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser?.id]);

  // Filter notifications for current user
  const userNotifications = notifications.filter(notification => {
    // Check if notification is for parents or all users
    const isTargetAudience = notification.targetAudience === 'parents' || 
                           notification.targetAudience === 'all';
    
    // Check if user has read this notification
    const isRead = notification.readBy.includes(currentUser?.id || 0);
    
    return isTargetAudience;
  });

  // Apply filters
  const filteredNotifications = userNotifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'read' && notification.readBy.includes(currentUser?.id || 0)) ||
                         (statusFilter === 'unread' && !notification.readBy.includes(currentUser?.id || 0));
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort notifications by date (newest first)
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // First sort by read status (unread first)
    const aIsRead = a.readBy.includes(currentUser?.id || 0);
    const bIsRead = b.readBy.includes(currentUser?.id || 0);
    if (aIsRead !== bIsRead) return aIsRead ? 1 : -1;
    
    // Then sort by date (newest first)
    return new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime();
  });

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = sortedNotifications.filter(n => !n.readBy.includes(currentUser?.id || 0));
      for (const notification of unreadNotifications) {
        await markNotificationAsRead(notification.id);
      }
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailDialogOpen(true);
    
    // Mark as read when viewing details
    if (!notification.readBy.includes(currentUser?.id || 0)) {
      handleMarkAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'fee_reminder':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'result_announcement':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Success</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Error</Badge>;
      case 'fee_reminder':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Fee Reminder</Badge>;
      case 'result_announcement':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Result</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Info</Badge>;
    }
  };

  const unreadCount = sortedNotifications.filter(n => !n.readBy.includes(currentUser?.id || 0)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with school announcements and important information</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark All as Read ({unreadCount})
            </Button>
          )}
          <Button onClick={() => loadNotificationsFromAPI()} variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="fee_reminder">Fee Reminder</SelectItem>
                <SelectItem value="result_announcement">Result Announcement</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {sortedNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'You have no notifications at this time'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedNotifications.map((notification) => {
            const isRead = notification.readBy.includes(currentUser?.id || 0);
            return (
              <Card 
                key={notification.id} 
                className={`transition-all hover:shadow-md ${
                  !isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-gray-900 ${!isRead ? 'text-blue-900' : ''}`}>
                              {notification.title}
                            </h3>
                            {!isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(notification.sentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getNotificationBadge(notification.type)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(notification)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View Details
                          </Button>
                          {!isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Notification Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getNotificationBadge(selectedNotification.type)}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sent: {new Date(selectedNotification.sentDate).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
