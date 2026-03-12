/**
 * Logger utility for React Native
 * Provides consistent logging across the app with different log levels
 * Works with Metro bundler and React Native DevTools
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarn: boolean;
  enableError: boolean;
  showTimestamp: boolean;
  showLocation: boolean;
}

class Logger {
  private config: LogConfig = {
    enableDebug: __DEV__, // Only in development
    enableInfo: true,
    enableWarn: true,
    enableError: true,
    showTimestamp: true,
    showLocation: __DEV__, // Only in development
  };

  private getTimestamp(): string {
    if (!this.config.showTimestamp) return '';
    return new Date().toISOString().split('T')[1].slice(0, 8);
  }

  private getLocation(): string {
    if (!this.config.showLocation) return '';
    // Get stack trace to find caller location
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      // Usually the 4th line contains the caller info
      if (lines.length > 3) {
        const match = lines[3].match(/\((.*?)\)/);
        if (match) {
          const parts = match[1].split('/');
          return parts[parts.length - 1];
        }
      }
    }
    return '';
  }

  private formatMessage(level: LogLevel, message: string, location: string): string {
    const timestamp = this.getTimestamp();
    const levelEmoji = {
      debug: '🔍',
      info: '📱',
      warn: '⚠️',
      error: '❌',
    };

    let formatted = `${levelEmoji[level]} `;
    if (timestamp) formatted += `[${timestamp}] `;
    if (location) formatted += `(${location}) `;
    formatted += message;
    
    return formatted;
  }

  debug(message: string, ...args: any[]): void {
    if (!this.config.enableDebug) return;
    const location = this.getLocation();
    const formatted = this.formatMessage('debug', message, location);
    console.log(formatted, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (!this.config.enableInfo) return;
    const location = this.getLocation();
    const formatted = this.formatMessage('info', message, location);
    console.log(formatted, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.config.enableWarn) return;
    const location = this.getLocation();
    const formatted = this.formatMessage('warn', message, location);
    console.warn(formatted, ...args);
  }

  error(message: string, ...args: any[]): void {
    if (!this.config.enableError) return;
    const location = this.getLocation();
    const formatted = this.formatMessage('error', message, location);
    console.error(formatted, ...args);
  }

  // Log API requests
  api(method: string, url: string, data?: any): void {
    if (!this.config.enableDebug) return;
    const message = `API ${method.toUpperCase()} ${url}`;
    this.debug(message, data || '');
  }

  // Log API responses
  apiResponse(status: number, url: string, data?: any): void {
    if (!this.config.enableDebug) return;
    const emoji = status < 400 ? '✅' : '❌';
    const message = `${emoji} API Response ${status} ${url}`;
    if (status < 400) {
      this.debug(message, data || '');
    } else {
      this.error(message, data || '');
    }
  }

  // Log authentication events
  auth(event: string, details?: any): void {
    const message = `Auth: ${event}`;
    this.info(message, details || '');
  }

  // Log navigation events
  navigation(event: string, params?: any): void {
    if (!this.config.enableDebug) return;
    const message = `Navigation: ${event}`;
    this.debug(message, params || '');
  }

  // Configure logger
  configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Group console logs
  group(title: string): void {
    if (!__DEV__) return;
    console.group(`📦 ${title}`);
  }

  groupEnd(): void {
    if (!__DEV__) return;
    console.groupEnd();
  }

  // Table for structured data
  table(data: any): void {
    if (!__DEV__) return;
    console.table(data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for typing
export type { Logger, LogConfig };