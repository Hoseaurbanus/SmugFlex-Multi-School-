/**
 * Biometric Auth Helper — Centralized abstraction for fingerprint/face authentication
 * Works in both web browser and native Capacitor WebView
 */

import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from './secureStorage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export interface BiometricCapability {
  available: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
  reason: string;
}

export class BiometricHelper {
  /**
   * Check if biometric authentication is available on this device
   */
  static async checkCapability(): Promise<BiometricCapability> {
    if (!Capacitor.isNativePlatform()) {
      return {
        available: false,
        biometryType: 'none',
        reason: 'Biometric authentication is only available on native devices',
      };
    }

    try {
      const result = await BiometricAuth.checkBiometry();
      let biometryType: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';

      if (result.biometryType === BiometryType.fingerprintAuthentication) {
        biometryType = 'fingerprint';
      } else if (result.biometryType === BiometryType.faceAuthentication || result.biometryType === BiometryType.faceId) {
        biometryType = 'face';
      } else if (result.biometryType === BiometryType.irisAuthentication) {
        biometryType = 'iris';
      }

      return {
        available: result.isAvailable,
        biometryType,
        reason: result.reason || '',
      };
    } catch (error) {
      return {
        available: false,
        biometryType: 'none',
        reason: 'Unable to check biometric capability',
      };
    }
  }

  /**
   * Check if user has enabled biometric login
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable biometric login for the user
   */
  static async enable(): Promise<boolean> {
    const capability = await this.checkCapability();
    if (!capability.available) return false;

    try {
      await SecureStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disable biometric login
   */
  static async disable(): Promise<void> {
    try {
      await SecureStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await SecureStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    } catch {
      // Silent fail
    }
  }

  /**
   * Save credentials for biometric login
   */
  static async saveCredentials(identity: string, password: string): Promise<boolean> {
    try {
      const credentials = JSON.stringify({ identity, password });
      await SecureStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, credentials);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve saved credentials via biometric authentication
   * Returns null if biometric fails or credentials not saved
   */
  static async getCredentials(): Promise<{ identity: string; password: string } | null> {
    try {
      const enabled = await this.isEnabled();
      if (!enabled) return null;

      const capability = await this.checkCapability();
      if (!capability.available) return null;

      // Prompt biometric authentication
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate to log in',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
      });

      // Retrieve saved credentials
      const credentialsStr = await SecureStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsStr) return null;

      return JSON.parse(credentialsStr);
    } catch (error) {
      console.error('Biometric credential retrieval failed:', error);
      return null;
    }
  }

  /**
   * Authenticate with biometrics (generic check, no credential retrieval)
   * Used for sensitive operations like viewing grades, payment approval
   */
  static async authenticate(reason?: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const capability = await this.checkCapability();
      if (!capability.available) return true;

      const result = await BiometricAuth.authenticate({
        reason: reason || 'Verify your identity',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
      });

      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Get biometry type label for UI display
   */
  static getBiometryLabel(type: 'fingerprint' | 'face' | 'iris' | 'none'): string {
    switch (type) {
      case 'fingerprint': return 'Fingerprint';
      case 'face': return 'Face ID';
      case 'iris': return 'Iris';
      default: return 'Biometric';
    }
  }

  /**
   * Web fallback: show a simple confirm dialog for sensitive actions
   */
  static async webFallback(reason?: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) return true;
    return window.confirm(reason || 'Confirm this action');
  }
}
