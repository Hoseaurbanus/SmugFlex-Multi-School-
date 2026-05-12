/**
 * Logger Utility
 * Provides structured logging for production and development environments
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: number;
  component?: string;
}

class Logger {
  private isProduction: boolean;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, component?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId: this.getCurrentUserId(),
      component
    };
  }

  private getCurrentUserId(): number | undefined {
    // Try to get current user from context or global state
    if (typeof window !== 'undefined' && (window as any).currentUser) {
      return (window as any).currentUser?.id;
    }
    return undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors and warnings
    if (this.isProduction) {
      return level === 'error' || level === 'warn';
    }
    // In development, log everything
    return true;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only recent logs to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send to external logging service in production
    if (this.isProduction && (entry.level === 'error' || entry.level === 'warn')) {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // This could send logs to:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - Custom logging endpoint
    try {
      // For now, just store in localStorage for debugging
      const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      existingLogs.push(entry);
      
      // Keep only last 100 logs in localStorage
      const recentLogs = existingLogs.slice(-100);
      localStorage.setItem('app_logs', JSON.stringify(recentLogs));
    } catch (error) {
      // Silent fail for security
    }
  }

  public info(message: string, data?: any, component?: string): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, data, component);
    this.addLog(entry);
    
    // Production: no console output
    // if (!this.isProduction) {
    //   console.log(`ℹ️ [INFO] ${component ? `[${component}] ` : ''}${message}`, data || '');
    // }
  }

  public warn(message: string, data?: any, component?: string): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, data, component);
    this.addLog(entry);
    
    // Production: no console output
    // console.warn(`⚠️ [WARN] ${component ? `[${component}] ` : ''}${message}`, data || '');
  }

  public error(message: string, error?: any, component?: string): void {
    if (!this.shouldLog('error')) return;
    
    const entry = this.createLogEntry('error', message, error, component);
    this.addLog(entry);
    
    // Production: no console output
    // console.error(`❌ [ERROR] ${component ? `[${component}] ` : ''}${message}`, error || '');
  }

  public debug(message: string, data?: any, component?: string): void {
    if (this.isProduction) return;
    
    const entry = this.createLogEntry('debug', message, data, component);
    this.addLog(entry);
    
    // Production: no console output
    // console.log(`🐛 [DEBUG] ${component ? `[${component}] ` : ''}${message}`, data || '');
  }

  // Get recent logs for debugging
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Export logs for debugging
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  public clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
