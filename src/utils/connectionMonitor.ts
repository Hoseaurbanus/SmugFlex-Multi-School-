/**
 * Connection Monitoring Utility
 * Monitors API connection health and handles reconnection
 */

import { tokenManager } from './tokenManager';

export interface ConnectionMonitor {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isHealthy: () => boolean;
  forceReconnect: () => Promise<boolean>;
}

class ConnectionMonitorImpl implements ConnectionMonitor {
  private isMonitoring = false;
  private isConnectionHealthy = true;
  private lastHealthCheck = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly FAILURE_RESET_INTERVAL = 300000; // 5 minutes

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('ConnectionMonitor: Started monitoring');
    
    // Perform initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
    
    // Set up failure reset
    setInterval(() => {
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }, this.FAILURE_RESET_INTERVAL);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('ConnectionMonitor: Stopped monitoring');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  isHealthy(): boolean {
    return this.isConnectionHealthy && this.failureCount < this.MAX_FAILURES;
  }

  async forceReconnect(): Promise<boolean> {
    console.log('ConnectionMonitor: Attempting force reconnection...');
    
    try {
      // Clear token to force re-authentication
      tokenManager.clearToken();
      
      // Reset failure count
      this.failureCount = 0;
      
      // Perform health check
      await this.performHealthCheck();
      
      return this.isHealthy();
    } catch (error) {
      console.error('ConnectionMonitor: Force reconnection failed:', error);
      return false;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const now = Date.now();
      
      // Skip if too soon since last check
      if (now - this.lastHealthCheck < 30000) return;
      
      this.lastHealthCheck = now;
      
      // Check if token is valid
      const isTokenValid = tokenManager.isTokenValid();
      if (!isTokenValid) {
        console.warn('ConnectionMonitor: Token invalid');
        this.handleFailure();
        return;
      }
      
      // Perform a simple API call to check connectivity
      const response = await fetch(`${window.location.origin}/api/health.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });
      
      if (response.ok) {
        this.handleSuccess();
      } else {
        this.handleFailure();
      }
    } catch (error) {
      console.error('ConnectionMonitor: Health check failed:', error);
      this.handleFailure();
    }
  }

  private handleSuccess(): void {
    this.isConnectionHealthy = true;
    this.failureCount = 0;
  }

  private handleFailure(): void {
    this.failureCount++;
    this.isConnectionHealthy = false;
    
    console.warn(`ConnectionMonitor: Connection failure #${this.failureCount}`);
    
    if (this.failureCount >= this.MAX_FAILURES) {
      console.error('ConnectionMonitor: Connection lost - forcing reconnection');
      this.forceReconnect();
    }
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitorImpl();

// Export convenience functions
export const startConnectionMonitoring = () => connectionMonitor.startMonitoring();
export const stopConnectionMonitoring = () => connectionMonitor.stopMonitoring();
export const isConnectionHealthy = () => connectionMonitor.isHealthy();
export const forceConnectionReconnect = () => connectionMonitor.forceReconnect();
