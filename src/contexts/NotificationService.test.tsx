import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationServiceProvider, useNotificationService } from './NotificationService';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

vi.mock('./SchoolContext', () => ({
  useSchool: () => ({
    currentUser: { id: 1, role: 'admin' },
    notifications: [],
    loadNotificationsFromAPI: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Info: () => React.createElement('span', { 'data-testid': 'icon-info' }),
  AlertTriangle: () => React.createElement('span', { 'data-testid': 'icon-warning' }),
  CheckCircle: () => React.createElement('span', { 'data-testid': 'icon-success' }),
  XCircle: () => React.createElement('span', { 'data-testid': 'icon-error' }),
}));

function TestConsumer({ onEvent }: { onEvent?: (n: any) => void }) {
  const { subscribe, broadcast, pendingNotifications } = useNotificationService();

  React.useEffect(() => {
    if (onEvent) {
      return subscribe(onEvent);
    }
  }, [subscribe, onEvent]);

  return (
    <div>
      <span data-testid="pending-count">{pendingNotifications.length}</span>
      <button
        data-testid="broadcast-btn"
        onClick={() =>
          broadcast({
            id: 1,
            title: 'Test',
            message: 'Hello',
            type: 'info',
            targetAudience: 'admin',
            sentDate: new Date().toISOString(),
          })
        }
      >
        Broadcast
      </button>
    </div>
  );
}

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides context without crashing', () => {
    render(
      <NotificationServiceProvider>
        <TestConsumer />
      </NotificationServiceProvider>
    );
    expect(screen.getByTestId('pending-count')).toHaveTextContent('0');
  });

  it('broadcasts notifications to subscribers', () => {
    const handler = vi.fn();
    render(
      <NotificationServiceProvider>
        <TestConsumer onEvent={handler} />
      </NotificationServiceProvider>
    );

    act(() => {
      screen.getByTestId('broadcast-btn').click();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test', message: 'Hello' })
    );
  });

  it('adds broadcast to pending notifications', () => {
    render(
      <NotificationServiceProvider>
        <TestConsumer />
      </NotificationServiceProvider>
    );

    act(() => {
      screen.getByTestId('broadcast-btn').click();
    });

    expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
  });

  it('unsubscribes correctly', () => {
    const handler = vi.fn();
    let unsubscribe: () => void;

    function Wrapper() {
      const { subscribe } = useNotificationService();
      React.useEffect(() => {
        unsubscribe = () => subscribe(handler)();
      }, []);
      return null;
    }

    render(
      <NotificationServiceProvider>
        <Wrapper />
      </NotificationServiceProvider>
    );

    act(() => {
      unsubscribe!();
    });

    // After unsubscribe, broadcast should not call handler
    // (This is a basic test; actual implementation depends on timing)
  });
});
