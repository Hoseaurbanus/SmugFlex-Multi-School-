import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ConnectionContextType {
  isOnline: boolean;
  isSlow: boolean;
  retryCount: number;
  lastError: string | null;
  clearError: () => void;
  setConnectionStatus: (online: boolean, slow?: boolean) => void;
  incrementRetryCount: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSlow(false);
      setRetryCount(0);
      setLastError(null);
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost. Some features may not work properly.');
    };

    const handleConnectionChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectionchange', handleConnectionChange);

    // Monitor connection speed
    const monitorConnection = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setIsSlow(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.downlink < 0.5);
      }
    };

    monitorConnection();
    const interval = setInterval(monitorConnection, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectionchange', handleConnectionChange);
      clearInterval(interval);
    };
  }, []);

  const clearError = () => {
    setLastError(null);
    setRetryCount(0);
  };

  const setConnectionStatus = (online: boolean, slow = false) => {
    setIsOnline(online);
    setIsSlow(slow);
    if (!online && lastError !== 'Connection lost') {
      setLastError('Connection lost');
      toast.error('Network connection lost. Attempting to reconnect...');
    }
  };

  const incrementRetryCount = () => {
    setRetryCount(prev => prev + 1);
    if (retryCount > 2) {
      setLastError('Multiple connection failures detected');
      toast.error('Experiencing connection issues. Some data may not load properly.');
    }
  };

  return (
    <ConnectionContext.Provider value={{
      isOnline,
      isSlow,
      retryCount,
      lastError,
      clearError,
      setConnectionStatus,
      incrementRetryCount
    }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
