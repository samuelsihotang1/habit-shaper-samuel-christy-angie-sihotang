/*
 * Pino's options for the app's logger. A log line never carries a credential:
 * the Authorization and Cookie headers, and any password, token, challenge or
 * secret field one level down, print as [REDACTED] (logging.md). Logs stay
 * JSON everywhere; nothing here branches on NODE_ENV.
 */
export function loggerOptions(level: string) {
  return {
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.password_confirmation',
        '*.current_password',
        '*.token',
        '*.device_token',
        '*.challenge',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
  };
}
