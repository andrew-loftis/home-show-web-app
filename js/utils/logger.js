/**
 * Production-safe Logger
 * Logs are only shown in development (localhost or when DEBUG flag is set)
 */

const isDev = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.DEBUG === true;
};

/**
 * Log debug messages (only in development)
 */
export function log(...args) {
  if (isDev()) {
    console.log('[App]', ...args);
  }
}

/**
 * Log warnings (always shown)
 */
export function warn(...args) {
  console.warn('[App]', ...args);
}

/**
 * Log errors (always shown)
 */
export function error(...args) {
  console.error('[App]', ...args);
}

/**
 * Log with a specific tag (only in development)
 */
export function logTagged(tag, ...args) {
  if (isDev()) {
    console.log(`[${tag}]`, ...args);
  }
}

export default { log, warn, error, logTagged };
