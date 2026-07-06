import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSchool } from '../../contexts/SchoolContext';
import { toast } from 'sonner';
import { API_CONFIG, getAuthToken } from '../../config/api';

export function ViewNotificationsPage() {
  const { notifications, currentUser, markNotificationAsRead, deleteNotification, loadNotificationsFromAPI, getAllNotifications } = useSchool();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [whatsappGroups, setWhatsappGroups] = useState<any[]>([]);
  const [loadingWhatsappGroups, setLoadingWhatsappGroups] = useState(false);

  // Load notifications when component mounts
  useEffect(() => {
    loadNotificationsFromAPI();
  }, [loadNotificationsFromAPI]);

  // Load all class WhatsApp groups for admin (View Messages page)
  useEffect(() => {
    const loadWhatsappGroups = async () => {
      if (currentUser?.role !== 'admin') {
        setWhatsappGroups([]);
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setWhatsappGroups([]);
        return;
      }

      setLoadingWhatsappGroups(true);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/classes/whatsapp-groups`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          setWhatsappGroups([]);
          return;
        }

        const json = await res.json();
        setWhatsappGroups(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        setWhatsappGroups([]);
      } finally {
        setLoadingWhatsappGroups(false);
      }
    };

    loadWhatsappGroups();
  }, [currentUser?.role]);

  // Use context getter to filter notifications by audience, targetUsers, and deletedBy
  const userNotifications = getAllNotifications();

  // Sort by date (newest first)
  const sortedNotifications = userNotifications.sort((a, b) => 
    new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime()
  );

  // Check if notification is read by current user
  const isNotificationRead = (notification: any) => {
    return notification.readBy.includes(currentUser?.id || 0);
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      toast.success(currentUser?.role === 'admin' ? 'Notification deleted' : 'Notification dismissed');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  // Get notification type badge
  const getNotificationBadge = (type: string, targetAudience: string) => {
    // Check if it's a parent message
    if ((type as any) === 'message' && (targetAudience as any) === 'admin') {
        return <Badge className="bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/30"><span className="w-3 h-3 mr-1" />Parent Message</Badge>;
    }
    
    switch (type) {
      case 'info':
        return <Badge className="bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/30"><span className="w-3 h-3 mr-1" />Information</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><span className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300"><span className="w-3 h-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><span className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300"><span className="w-3 h-3 mr-1" />Notification</Badge>;
    }
  };

  // Get recipient text
  const getRecipientText = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all': return 'All Users';
      case 'admin': return 'Admin Only';
      case 'accountants': return 'Accountants';
      case 'teachers': return 'Teachers';
      case 'parents': return 'Parents';
      case 'students': return 'Students';
      default: return targetAudience;
    }
  };

  const unreadCount = userNotifications.filter(n => !isNotificationRead(n)).length;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-800 mb-2">Notifications</h1>
        <p className="text-gray-500">
          {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All notifications read'}
        </p>
      </div>

      {currentUser?.role === 'admin' && (
        <Card className="rounded-xl bg-white border border-gray-100 shadow-clinical">
          <CardHeader className="border-b border-gray-100 bg-[#F9FAFB] p-4">
            <CardTitle className="text-[#1F2937] flex items-center gap-2">
              <span className="w-5 h-5" />
              Class WhatsApp Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loadingWhatsappGroups ? (
              <div className="text-center py-6 text-gray-500">Loading WhatsApp groups...</div>
            ) : whatsappGroups.length === 0 ? (
              <div className="text-center py-6 text-gray-500">No WhatsApp groups found</div>
            ) : (
              <div className="space-y-3">
                {whatsappGroups.map((g: any) => (
                    <div key={`${g.class_id}-${g.whatsapp_group_link}`} className="p-4 rounded-lg border border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{g.class_name || `Class ${g.class_id}`}</p>
                        <p className="text-sm text-gray-600 truncate">{g.group_name || 'WhatsApp Group'}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const link = String(g.whatsapp_group_link || '').trim();
                          if (!link) {
                            toast.error('No WhatsApp link available');
                            return;
                          }
                          window.open(link, '_blank');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Join Group
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unread Notifications */}
      {unreadCount > 0 && (
        <Card className="rounded-xl bg-white border border-gray-100 shadow-clinical">
          <CardHeader className="border-b border-gray-100 bg-[#F9FAFB] p-4">
            <CardTitle className="text-[#1F2937] flex items-center gap-2">
              <span className="w-5 h-5" />
              Unread Notifications ({unreadCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {sortedNotifications.filter(n => !isNotificationRead(n)).map((notification) => (
              <div
                key={notification.id}
                className="p-4 bg-[#0A2540]/5 border border-[#0A2540]/20 rounded-lg hover:bg-[#0A2540]/10 transition-colors cursor-pointer"
                onClick={() => setSelectedNotification(notification)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getNotificationBadge(notification.type, notification.targetAudience)}
                      <span className="text-xs text-gray-500">
                        {new Date(notification.sentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 mb-1 text-lg">{notification.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{notification.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    className="flex-shrink-0"
                  >
                    <span className="w-4 h-4 mr-1" />
                    Mark Read
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    className="flex-shrink-0"
                  >
                    <span className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Notifications */}
      <Card className="rounded-xl bg-white border border-gray-100 shadow-clinical">
        <CardHeader className="border-b border-gray-100 bg-[#F9FAFB] p-4">
          <CardTitle className="text-[#1F2937] flex items-center gap-2">
            <span className="w-5 h-5" />
            All Notifications ({userNotifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {sortedNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No notifications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isNotificationRead(notification)
                      ? 'bg-white border-gray-100 hover:bg-gray-50'
                      : 'bg-[#0A2540]/5 border-[#0A2540]/20 hover:bg-[#0A2540]/10'
                  }`}
                  onClick={() => setSelectedNotification(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getNotificationBadge(notification.type, notification.targetAudience)}
                        <span className="text-xs text-gray-500">
                          {new Date(notification.sentDate).toLocaleDateString()}
                        </span>
                        {!isNotificationRead(notification) && (
                          <Badge className="bg-[#0A2540] text-white border-0">New</Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-[#1F2937] mb-1 text-base">{notification.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3" />
                          To: {getRecipientText(notification.targetAudience)}
                        </span>
                      </div>
                    </div>
                    {!isNotificationRead(notification) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <span className="w-4 h-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-xl">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1F2937]">{selectedNotification.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                >
                  <span className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {getNotificationBadge(selectedNotification.type, selectedNotification.targetAudience)}
                <span className="text-sm text-gray-500">
                  {new Date(selectedNotification.sentDate).toLocaleDateString()} at {new Date(selectedNotification.sentDate).toLocaleTimeString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#1F2937] mb-2">Message:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification.message}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Sent To:</p>
                    <p className="text-[#1F2937]">{getRecipientText(selectedNotification.targetAudience)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <p className="text-[#1F2937]">
                      {isNotificationRead(selectedNotification) ? 'Read' : 'Unread'}
                    </p>
                  </div>
                </div>
                {!isNotificationRead(selectedNotification) && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleMarkAsRead(selectedNotification.id)}
                      className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white"
                    >
                      <span className="w-4 h-4 mr-2" />
                      Mark as Read
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedNotification(null)}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
