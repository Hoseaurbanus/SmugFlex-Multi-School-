// NotificationContext - Focused notification wrapper around SchoolContext
import { createContext, useContext, ReactNode } from 'react';
import { useSchool } from '../SchoolContext';
import { useActivityLogs } from './IndependentActivityLogContext';
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
  const { activityLogs, addActivityLog, getActivityLogs } = useActivityLogs();
  const value: NotificationDomain = {
    notifications: school.notifications,
    activityLogs,
    addNotification: school.addNotification,
    markNotificationAsRead: school.markNotificationAsRead,
    deleteNotification: school.deleteNotification,
    getUnreadNotifications: school.getUnreadNotifications,
    getAllNotifications: school.getAllNotifications,
    addActivityLog,
    getActivityLogs,
  };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationDomain {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
