/**
 * Error Boundary Utilities
 * 
 * Provides graceful error handling throughout the app.
 * Catches errors in views, async operations, and global unhandled errors.
 */

// Track errors for debugging (limit to last 10)
const errorLog = [];
const MAX_ERROR_LOG = 10;

/**
 * Log an error with context
 */
function logError(error, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    message: error.message || String(error),
    stack: error.stack,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  errorLog.unshift(entry);
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.pop();
  }
  
  // Log to console in development
  console.error('[ErrorBoundary]', entry);
  
  return entry;
}

/**
 * Get recent errors for debugging
 */
export function getRecentErrors() {
  return [...errorLog];
}

/**
 * Clear error log
 */
export function clearErrorLog() {
  errorLog.length = 0;
}

/**
 * Render a user-friendly error UI
 */
export function renderErrorUI(container, { 
  title = "Something went wrong", 
  message = "We're sorry, but something unexpected happened.",
  error = null,
  showDetails = false,
  retryAction = null,
  homeAction = true
} = {}) {
  const errorDetails = error ? `
    <details class="mt-4 text-left">
      <summary class="text-xs text-glass-secondary cursor-pointer hover:text-glass">
        Technical details
      </summary>
      <pre class="mt-2 p-3 bg-black/20 rounded-lg text-xs text-red-300 overflow-auto max-h-32">${
        error.stack || error.message || String(error)
      }</pre>
    </details>
  ` : '';

  container.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-4">
          <ion-icon name="alert-circle-outline" class="text-4xl text-red-400"></ion-icon>
        </div>
        <h2 class="text-xl font-bold text-glass mb-2">${title}</h2>
        <p class="text-sm text-glass-secondary max-w-sm mb-6">${message}</p>
        
        <div class="flex flex-col sm:flex-row gap-3">
          ${retryAction ? `
            <button id="error-retry" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
              <ion-icon name="refresh-outline" class="mr-2"></ion-icon>
              Try Again
            </button>
          ` : ''}
          ${homeAction ? `
            <button onclick="window.location.hash='/home'" class="glass-button px-6 py-3 rounded-xl font-semibold text-sm touch-target">
              <ion-icon name="home-outline" class="mr-2"></ion-icon>
              Go Home
            </button>
          ` : ''}
        </div>
        
        ${showDetails ? errorDetails : ''}
      </div>
    </div>
  `;

  // Wire retry button if provided
  if (retryAction) {
    const retryBtn = container.querySelector('#error-retry');
    if (retryBtn) {
      retryBtn.onclick = retryAction;
    }
  }
}

/**
 * Render a network error UI
 */
export function renderNetworkError(container, retryAction = null) {
  renderErrorUI(container, {
    title: "Connection Problem",
    message: "Please check your internet connection and try again.",
    retryAction,
    homeAction: true
  });
  
  // Replace icon with wifi-off
  const iconEl = container.querySelector('ion-icon[name="alert-circle-outline"]');
  if (iconEl) {
    iconEl.setAttribute('name', 'wifi-outline');
  }
}

/**
 * Render a "not found" error UI
 */
export function renderNotFoundError(container, itemType = "page") {
  container.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-500/20 to-gray-500/20 flex items-center justify-center mb-4">
          <ion-icon name="search-outline" class="text-4xl text-slate-400"></ion-icon>
        </div>
        <h2 class="text-xl font-bold text-glass mb-2">Not Found</h2>
        <p class="text-sm text-glass-secondary max-w-sm mb-6">
          The ${itemType} you're looking for doesn't exist or has been removed.
        </p>
        <button onclick="window.location.hash='/home'" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
          <ion-icon name="home-outline" class="mr-2"></ion-icon>
          Go Home
        </button>
      </div>
    </div>
  `;
}

/**
 * Render an access denied error UI
 */
export function renderAccessDenied(container, requiredRole = null) {
  container.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
          <ion-icon name="lock-closed-outline" class="text-4xl text-amber-400"></ion-icon>
        </div>
        <h2 class="text-xl font-bold text-glass mb-2">Access Denied</h2>
        <p class="text-sm text-glass-secondary max-w-sm mb-6">
          ${requiredRole 
            ? `You need ${requiredRole} access to view this page.` 
            : 'You don\'t have permission to access this page.'}
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <button onclick="window.location.hash='/home'" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
            <ion-icon name="home-outline" class="mr-2"></ion-icon>
            Go Home
          </button>
          <button onclick="window.location.hash='/more'" class="glass-button px-6 py-3 rounded-xl font-semibold text-sm touch-target">
            <ion-icon name="person-outline" class="mr-2"></ion-icon>
            Sign In
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorBoundary(fn, container, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { 
        function: fn.name || 'anonymous',
        args: args.map(a => typeof a === 'object' ? '[object]' : String(a))
      });
      
      // Check for network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        renderNetworkError(container, () => fn(...args));
      } else {
        renderErrorUI(container, {
          ...options,
          error,
          showDetails: localStorage.getItem('debug') === 'true',
          retryAction: () => fn(...args)
        });
      }
    }
  };
}

/**
 * Wrap a view function with error boundary
 */
export function safeView(viewFn) {
  return async (container, params) => {
    try {
      await viewFn(container, params);
    } catch (error) {
      logError(error, { 
        view: viewFn.name || 'anonymous',
        params 
      });
      
      // Check error type
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        renderNotFoundError(container);
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        renderAccessDenied(container);
      } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        renderNetworkError(container, () => viewFn(container, params));
      } else {
        renderErrorUI(container, {
          error,
          showDetails: localStorage.getItem('debug') === 'true',
          retryAction: () => viewFn(container, params)
        });
      }
    }
  };
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason || new Error('Unhandled Promise rejection'), {
      type: 'unhandledrejection'
    });
    
    // Prevent default handling (browser console error)
    event.preventDefault();
    
    // Show toast notification
    showErrorToast('Something went wrong. Please try again.');
  });

  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      type: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    // Show toast notification for non-fatal errors
    if (!event.error?.fatal) {
      showErrorToast('An error occurred. Some features may not work correctly.');
    }
  });
}

/**
 * Show an error toast notification
 */
function showErrorToast(message) {
  // Check if Toast is available
  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) return;
  
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-slide-up';
  toast.innerHTML = `
    <ion-icon name="alert-circle-outline" class="text-xl flex-shrink-0"></ion-icon>
    <span class="text-sm flex-1">${message}</span>
    <button class="p-1 hover:bg-white/20 rounded" onclick="this.parentElement.remove()">
      <ion-icon name="close-outline"></ion-icon>
    </button>
  `;
  
  toastRoot.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Try-catch wrapper for inline operations
 */
export function tryCatch(fn, fallback = null, context = {}) {
  try {
    return fn();
  } catch (error) {
    logError(error, context);
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

/**
 * Async try-catch wrapper
 */
export async function tryCatchAsync(fn, fallback = null, context = {}) {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

export default {
  logError,
  getRecentErrors,
  clearErrorLog,
  renderErrorUI,
  renderNetworkError,
  renderNotFoundError,
  renderAccessDenied,
  withErrorBoundary,
  safeView,
  setupGlobalErrorHandlers,
  tryCatch,
  tryCatchAsync
};
