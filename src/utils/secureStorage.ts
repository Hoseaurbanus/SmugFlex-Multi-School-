/**
 * Secure Storage Abstraction for SMugFlex 2.0
 * Uses @capacitor/secure-storage on native, localStorage on web
 */

import { Capacitor } from '@capacitor/core';

// Dynamic import for secure storage plugin
let SecureStoragePlugin: any = null;

async function getSecureStorage() {
  if (!SecureStoragePlugin) {
    try {
      const module = await import('capacitor-secure-storage-plugin');
      SecureStoragePlugin = module.SecureStoragePlugin;
    } catch {
      // Plugin not available
    }
  }
  return SecureStoragePlugin;
}

const isNative = () => Capacitor.isNativePlatform();

export class SecureStorage {
  /**
   * Get item from secure storage
   */
  static async getItem(key: string): Promise<string | null> {
    if (!isNative()) {
      return localStorage.getItem(key);
    }

    try {
      const plugin = await getSecureStorage();
      if (!plugin) return localStorage.getItem(key);
      
      const result = await plugin.get({ key });
      return result.value;
    } catch {
      return null;
    }
  }

  /**
   * Set item in secure storage
   */
  static async setItem(key: string, value: string): Promise<void> {
    if (!isNative()) {
      localStorage.setItem(key, value);
      return;
    }

    try {
      const plugin = await getSecureStorage();
      if (!plugin) {
        localStorage.setItem(key, value);
        return;
      }
      
      await plugin.set({ key, value });
    } catch {
      // Fallback to localStorage on error
      localStorage.setItem(key, value);
    }
  }

  /**
   * Remove item from secure storage
   */
  static async removeItem(key: string): Promise<void> {
    if (!isNative()) {
      localStorage.removeItem(key);
      return;
    }

    try {
      const plugin = await getSecureStorage();
      if (!plugin) {
        localStorage.removeItem(key);
        return;
      }
      
      await plugin.remove({ key });
    } catch {
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all auth-related items
   */
  static async clearAuth(): Promise<void> {
    const keys = ['jwt_token', 'refresh_token', 'current_user', 'currentUser'];
    
    for (const key of keys) {
      await this.removeItem(key);
    }
  }
}

export default SecureStorage;
