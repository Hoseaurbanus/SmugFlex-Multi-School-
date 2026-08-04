/**
 * Push Notification Helper — Centralized abstraction for push notification registration and handling
 * Works in both web browser and native Capacitor WebView
 */

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { API_CONFIG } from '../config/api';
import { getAuthToken } from '../config/api';

export interface NotificationRegistration {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

export type NotificationReceivedHandler = (notification: PushNotificationSchema) => void;
export type NotificationActionHandler = (action: string, notification: PushNotificationSchema) => void;

export class PushNotificationHelper {
  private static registrationToken: string | null = null;
  private static onReceivedHandler: NotificationReceivedHandler | null = null;
  private static onActionHandler: NotificationActionHandler | null = null;
  private static receivedListenerHandle: any = null;
  private static actionListenerHandle: any = null;

  /**
   * Check if push notifications are available
   */
  static isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if running in native platform
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Request permission and register for push notifications
   */
  static async register(): Promise<NotificationRegistration | null> {
    if (!this.isNative()) {
      return null;
    }

    try {
      // Request permission
      let permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Wait for registration
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(null);
        }, 10000);

        PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout);
          this.registrationToken = token.value;
          const platform = Capacitor.getPlatform() as 'android' | 'ios';
          resolve({
            token: token.value,
            platform,
          });
        });

        PushNotifications.addListener('registrationError', (error) => {
          clearTimeout(timeout);
          console.error('Push registration error:', error);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Push notification registration failed:', error);
      return null;
    }
  }

  /**
   * Register token with backend server
   */
  static async registerWithBackend(token: string): Promise<boolean> {
    try {
      const authToken = await getAuthToken();
      if (!authToken) return false;

      const platform = Capacitor.getPlatform();
      const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          platform,
          device_type: platform === 'android' ? 'android' : 'ios',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Backend registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister from push notifications
   */
  static async unregister(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await PushNotifications.unregister();
      this.registrationToken = null;
    } catch (error) {
      console.error('Push notification unregistration failed:', error);
    }
  }

  /**
   * Remove device token from backend
   */
  static async unregisterFromBackend(): Promise<boolean> {
    if (!this.registrationToken) return false;

    try {
      const authToken = await getAuthToken();
      if (!authToken) return false;

      const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/unregister-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: this.registrationToken,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Backend unregistration failed:', error);
      return false;
    }
  }

  /**
   * Set handler for received notifications (when app is in foreground)
   */
  static onReceived(handler: NotificationReceivedHandler): void {
    this.onReceivedHandler = handler;

    if (!this.isNative()) return;

    // Remove previous listener to prevent duplicates
    if (this.receivedListenerHandle) {
      this.receivedListenerHandle.remove();
    }

    this.receivedListenerHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      handler(notification);
    });
  }

  /**
   * Set handler for notification actions (tap, buttons)
   */
  static onNotificationAction(handler: NotificationActionHandler): void {
    this.onActionHandler = handler;

    if (!this.isNative()) return;

    // Remove previous listener to prevent duplicates
    if (this.actionListenerHandle) {
      this.actionListenerHandle.remove();
    }

    this.actionListenerHandle = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      handler(action.actionId, action.notification);
    });
  }

  /**
   * Remove all notification listeners (call on logout)
   */
  static removeAllListeners(): void {
    if (this.receivedListenerHandle) {
      this.receivedListenerHandle.remove();
      this.receivedListenerHandle = null;
    }
    if (this.actionListenerHandle) {
      this.actionListenerHandle.remove();
      this.actionListenerHandle = null;
    }
  }

  /**
   * Schedule a local notification (for reminders, alerts)
   */
  static async scheduleLocal(options: {
    title: string;
    body: string;
    id?: number;
    schedule?: { at: Date };
  }): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return false;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: options.title,
            body: options.body,
            id: options.id || Math.floor(Math.random() * 100000),
            schedule: options.schedule,
          },
        ],
      });

      return true;
    } catch (error) {
      console.error('Local notification scheduling failed:', error);
      return false;
    }
  }

  /**
   * Clear all delivered notifications
   */
  static async clearAll(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch {
      // Silent fail
    }
  }

  /**
   * Get the current registration token
   */
  static getToken(): string | null {
    return this.registrationToken;
  }

  /**
   * Set a token manually (e.g., from saved state)
   */
  static setToken(token: string): void {
    this.registrationToken = token;
  }
}
