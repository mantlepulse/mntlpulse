/**
 * Simple logger utility
 */

import { config } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const colors = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m',   // Gray
  reset: '\x1b[0m',
};

class Logger {
  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const reset = colors.reset;

    const logMessage = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;

    console.log(logMessage);
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: any) {
    if (config.server.isDevelopment) {
      this.log('debug', message, meta);
    }
  }
}

export const logger = new Logger();
