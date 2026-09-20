type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'idtoken',
  'id_token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'privatekey',
  'private_key',
  'apikey',
  'api_key',
  'cookie',
  'credential',
]);

function maskSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 4 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (data.startsWith('Bearer ') || data.startsWith('ey') || data.includes('-----BEGIN PRIVATE KEY-----')) {
      return '[REDACTED_SECRET]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes('secret') || lower.includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = maskSensitiveData(val, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

class Logger {
  private format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(meta ? (maskSensitiveData(meta) as Record<string, unknown>) : {}),
    };
    return JSON.stringify(entry);
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    console.error(this.format('error', message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();
