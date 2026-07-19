import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
interface NotificationEvent {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: string;
  sentDate: string;
}

interface NotificationServiceContextType {
  subscribe: (callback: (notification: NotificationEvent) => void) => () => void;
  broadcast: (notification: NotificationEvent) => void;
  pendingNotifications: NotificationEvent[];
}

const NotificationServiceContext = createContext<NotificationServiceContextType | null>(null);

export function NotificationServiceProvider({ children }: { children: ReactNode }) {
  const [subscribers, setSubscribers] = useState<((notification: NotificationEvent) => void)[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationEvent[]>([]);

  const subscribe = useCallback((callback: (notification: NotificationEvent) => void) => {
    setSubscribers((prev) => [...prev, callback]);
    
    // Return unsubscribe function
    return () => {
      setSubscribers((prev) => prev.filter((sub) => sub !== callback));
    };
  }, []);

  const broadcast = useCallback((notification: NotificationEvent) => {
    // Add to pending notifications
    setPendingNotifications((prev) => [...prev, notification]);
    
    // Notify all subscribers
    subscribers.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        }
    });
  }, [subscribers]);

  return (
    <NotificationServiceContext.Provider value={{ subscribe, broadcast, pendingNotifications }}>
      {children}
    </NotificationServiceContext.Provider>
  );
}

export function useNotificationService() {
  const context = useContext(NotificationServiceContext);
  if (!context) {
    throw new Error('useNotificationService must be used within NotificationServiceProvider');
  }
  return context;
}

// Hook to listen for notifications in dashboards
export function useNotificationListener(userRole: string | undefined, userId: number | undefined) {
  const { subscribe } = useNotificationService();

  useEffect(() => {
    if (!userRole || !userId) return;

    const unsubscribe = subscribe((notification) => {
      // Check if notification is relevant to this user
      const isRelevant = 
        notification.targetAudience === 'all' ||
        (userRole && notification.targetAudience === userRole.toLowerCase() + 's') ||
        (userRole === 'Teacher' && notification.targetAudience === 'teachers') ||
        (userRole === 'Parent' && notification.targetAudience === 'parents') ||
        (userRole === 'Accountant' && notification.targetAudience === 'accountants') ||
        (userRole === 'Admin' && notification.targetAudience === 'all');

      if (isRelevant) {
        // Show toast notification with appropriate icon
        const getNotificationIcon = () => {
          switch (notification.type) {
            case 'error':
              return <XCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
              return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'success':
              return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'info':
            default:
              return <Info className="w-5 h-5 text-blue-500" />;
          }
        };

        const toastType = notification.type === 'error' ? toast.error :
                         notification.type === 'warning' ? toast.warning :
                         notification.type === 'success' ? toast.success :
                         toast.info;

        toastType(notification.title, {
          description: notification.message,
          icon: getNotificationIcon(),
          duration: 5000,
          className: 'text-base font-medium',
        });

        // Play notification sound (optional)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPLTgjMGHm7A7+OZRQ4PVqzm7KRXEwxNpOPwwmkgBTGJ0fPPfS0GI3fJ8NyPPwoTYbnq7KdUFAtBmeHyu2shBSh9y/LSgzcGHWvA7+OYRg0PVq7m6qNXFAxNo+PvwmogBDCH0fLPfiwGInXH8N+PPQkSX7nr7KhUEwpBmN/yuWsgBSh8y/LTgjYGHGq/7+OZSQ4OVKzl66JXFAxOouHuwmwhBDKH0PHPfywFIHLH8N+PPQsRXbfr7KlXFQlAnN7wtmwfBS1+zPHSgjcGHGu97+OaShAOVK3l66FYFAtOoN/twm0hBDKF0PHPgC4GIHLHb9+RQAsRXbbq66pYFApAnN3vtWwfBSx9y/DSgzcFHGm87eOaSxENVK7j66FZFAxNnuDuwm4hBDKE0fHOgC8FHnGHb9+RQAwPXLbp66pZFQlBnNzvtWwfBSx9yvDRgzcGG2m77OKbSxINUqzj66JaFAxNnd/tw28gBDKD0fDNfzAGHXDHbd6RQQwPW7Xo66pZFAlAnNvutmwhBSt8ye/Rgz4FHGW7a96aTBAOU6rj66NbFAxMm93tzG8gBDGB0O/Nfy8FHHDHX96RPQsQWrTn66pbFQhBm9rutmwfBSp7yO/SgDwGGmi7bN+bTxEMUqjh6qRcEwtOmtzsznAgAy+Az+/MgC0GGm/AW96SPQ0OWbPm6qxcFQdBmtrutWsfBSl5xe7Tgj4GGWe4aN+dUBIMUKfh66RdEwpNmNvrz3IgAy19z+3LgS0FGW2/Vt2RPgwNWLHl6qxdFgZAltnpt2weByhxxe3TgT4FGGi4Vt+fURELT6Pf66VgFA1Oltfrz3AfAyp7yu7KgywFFW/AVd2QQQ4MV6/k6axdFgVBltjpt2wfBCh3w+3SgTwGGGq4XOGgURQKTqLe6qZgEw1Nldbrz3AfAyt7yu3Kgyy+FFu/B+rHCkE=');
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore errors if audio doesn't play
        } catch (error) {
          // Ignore audio errors
        }
      }
    });

    return unsubscribe;
  }, [userRole, userId, subscribe]);
}
