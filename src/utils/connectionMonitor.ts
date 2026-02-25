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
  private readonly MAX_FAILURES = 5; // Increased for low networks
  private readonly HEALTH_CHECK_INTERVAL = 120000; // 2 minutes for low networks
  private readonly FAILURE_RESET_INTERVAL = 600000; // 10 minutes for low networks
  private readonly SLOW_NETWORK_THRESHOLD = 2000; // 2 seconds
  private adaptiveInterval = this.HEALTH_CHECK_INTERVAL;
  private isSlowNetwork = false;

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor network changes
    this.monitorNetworkChanges();
    
    // Perform initial health check
    this.performHealthCheck();
    
    // Set up adaptive periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.adaptiveInterval);
    
    // Set up failure reset
    setInterval(() => {
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
        this.adjustHealthCheckInterval();
      }
    }, this.FAILURE_RESET_INTERVAL);
  }

  private monitorNetworkChanges(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.isSlowNetwork = connection.effectiveType === 'slow-2g' || 
                            connection.effectiveType === '2g' || 
                            connection.downlink < 0.5;
        this.adjustHealthCheckInterval();
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
    }
  }

  private adjustHealthCheckInterval(): void {
    if (this.isSlowNetwork) {
      this.adaptiveInterval = this.HEALTH_CHECK_INTERVAL * 2; // Double for slow networks
    } else if (this.failureCount > 2) {
      this.adaptiveInterval = this.HEALTH_CHECK_INTERVAL * 1.5; // Increase for failures
    } else {
      this.adaptiveInterval = this.HEALTH_CHECK_INTERVAL; // Normal interval
    }
    
    // Reset interval with new timing
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, this.adaptiveInterval);
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  isHealthy(): boolean {
    return this.isConnectionHealthy && this.failureCount < this.MAX_FAILURES;
  }

  async forceReconnect(): Promise<boolean> {
    
    
    try {
      // Clear token to force re-authentication
      tokenManager.clearToken();
      
      // Reset failure count
      this.failureCount = 0;
      
      // Perform health check
      await this.performHealthCheck();
      
      return this.isHealthy();
    } catch (error) {
      
      return false;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const now = Date.now();
      
      // Skip if too soon since last check
      if (now - this.lastHealthCheck < 60000) return; // 1 minute minimum
      
      this.lastHealthCheck = now;
      
      // Check if browser is offline
      if (!navigator.onLine) {
        this.handleFailure();
        return;
      }
      
      // Check if token is valid
      const isTokenValid = tokenManager.isTokenValid();
      if (!isTokenValid) {
        this.handleFailure();
        return;
      }
      
      // Adaptive timeout based on network conditions
      const timeout = this.isSlowNetwork ? 10000 : 5000; // 10s for slow, 5s for normal
      
      // Perform health check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(`${window.location.origin}/api/health.php`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenManager.getToken()}`,
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.handleSuccess();
        } else {
          this.handleFailure();
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Don't treat abort as failure (timeout)
        if (fetchError.name === 'AbortError') {
          this.handleFailure(); // Timeout indicates poor connection
        } else {
          this.handleFailure();
        }
      }
    } catch (error) {
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
    
    
    
    if (this.failureCount >= this.MAX_FAILURES) {
      
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
