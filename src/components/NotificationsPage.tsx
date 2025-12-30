import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSchool } from '../contexts/SchoolContext';
import { toast } from 'sonner';

export function NotificationsPage() {
  const { currentUser, getAllNotifications, getUnreadNotifications, markNotificationAsRead } =
    useSchool();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">You must be logged in to view notifications</p>
        </div>
      </div>
    );
  }

  const allNotifications = getAllNotifications();
  const unreadNotifications = getUnreadNotifications();

  const displayedNotifications = filter === 'unread' ? unreadNotifications : allNotifications;

  const handleMarkAsRead = (notificationId: number) => {
    markNotificationAsRead(notificationId);
    toast.success('Notification marked as read');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <span className="w-5 h-5 text-[#10B981]" />;
      case 'error':
        return <span className="w-5 h-5 text-[#EF4444]" />;
      case 'warning':
        return <span className="w-5 h-5 text-[#F59E0B]" />;
      case 'info':
      default:
        return <span className="w-5 h-5 text-[#3B82F6]" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">View and manage your notifications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Notifications</p>
              <span className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl text-gray-900">{allNotifications.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Unread</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-3xl text-gray-900">{unreadNotifications.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Read</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-3xl text-gray-900">
              {allNotifications.length - unreadNotifications.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg text-gray-900">All Notifications</h3>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all" className="text-gray-700">
                  All ({allNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-gray-700">
                  Unread ({unreadNotifications.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-900 mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-gray-500 text-sm">
                {filter === 'unread'
                  ? 'All notifications have been read'
                  : "You'll see notifications here when you receive them"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedNotifications.map((notification) => {
                const isUnread = !notification.readBy.includes(currentUser.id);

                return (
                  <div
                    key={notification.id}
                    className={`p-5 transition-colors ${
                      isUnread ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-gray-900 font-medium">
                                {notification.title}
                              </h4>
                              {isUnread && (
                                <Badge className="bg-[#3B82F6] text-white border-0 text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{notification.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {new Date(notification.sentDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <Badge
                              className={`${getNotificationBgColor(notification.type)} text-gray-700 border-0`}
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          {isUnread && (
                            <Button
                              onClick={() => handleMarkAsRead(notification.id)}
                              size="sm"
                              variant="ghost"
                              className="text-[#3B82F6] hover:bg-blue-50 text-xs h-7"
                            >
                              <span className="w-3 h-3 mr-1" />
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
