import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import sqlDatabase from '../../services/sqlDatabase';
import type { ActivityLog } from '../../types/school';

interface ActivityLogContextType {
  activityLogs: ActivityLog[];
  isLoading: boolean;
  loadActivityLogs: () => Promise<void>;
  addActivityLog: (log: ActivityLog) => Promise<number>;
  getActivityLogs: (userId?: number, action?: string) => ActivityLog[];
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivityLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await sqlDatabase.executeQuery(`
        SELECT 
          id,
          actor,
          actor_role as actorRole,
          action,
          target,
          ip_address as ipAddress,
          status,
          details,
          user_id as userId,
          created_at as timestamp
        FROM activity_logs 
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      if (result?.data) {
        setActivityLogs(result.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivityLogs();
  }, [loadActivityLogs]);

  const addActivityLog = useCallback(async (log: ActivityLog): Promise<number> => {
    try {
      const { id, timestamp, ...logData } = log;
      const result = await sqlDatabase.insertRecord('activity_logs', logData);
      if (result?.insertId) {
        await loadActivityLogs();
        return result.insertId;
      }
      return 0;
    } catch {
      const newId = activityLogs.length > 0 ? Math.max(...activityLogs.map(l => l.id)) + 1 : 1;
      const newLog: ActivityLog = {
        ...log,
        id: newId,
        timestamp: new Date().toISOString(),
      };
      setActivityLogs([newLog, ...activityLogs]);
      return newId;
    }
  }, [activityLogs, loadActivityLogs]);

  const getActivityLogs = useCallback((userId?: number, action?: string): ActivityLog[] => {
    let filtered = activityLogs;

    if (userId) {
      filtered = filtered.filter(log => log.user_id === userId);
    }

    if (action && action !== 'all') {
      filtered = filtered.filter(log => log.action === action);
    }

    return filtered;
  }, [activityLogs]);

  return (
    <ActivityLogContext.Provider value={{
      activityLogs,
      isLoading,
      loadActivityLogs,
      addActivityLog,
      getActivityLogs,
    }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLogs(): ActivityLogContextType {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLogs must be used within ActivityLogProvider');
  return ctx;
}
