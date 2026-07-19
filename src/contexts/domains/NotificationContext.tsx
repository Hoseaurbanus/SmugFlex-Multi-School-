// NotificationContext - Focused notification wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { Notification, ActivityLog } from '../../types/school';

interface NotificationDomain {
  notifications: Notification[];
  activityLogs: ActivityLog[];
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<number>;
  markNotificationAsRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  getUnreadNotifications: () => Notification[];
  getAllNotifications: () => Notification[];
  addActivityLog: (log: ActivityLog) => Promise<number>;
  getActivityLogs: (userId?: number, action?: string) => ActivityLog[];
}

const NotificationContext = createContext<NotificationDomain | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const value: NotificationDomain = {
    notifications: school.notifications,
    activityLogs: school.activityLogs,
    addNotification: school.addNotification,
    markNotificationAsRead: school.markNotificationAsRead,
    deleteNotification: school.deleteNotification,
    getUnreadNotifications: school.getUnreadNotifications,
    getAllNotifications: school.getAllNotifications,
    addActivityLog: school.addActivityLog,
    getActivityLogs: school.getActivityLogs,
  };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationDomain {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
