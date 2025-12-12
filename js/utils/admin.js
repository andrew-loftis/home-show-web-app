/**
 * Admin Dashboard Utilities
 * Centralized helpers for the admin dashboard
 */

// Firebase module cache - import once, use everywhere
let _db = null;
let _fsm = null;

/**
 * Get cached Firestore database instance
 */
export async function getAdminDb() {
  if (!_db) {
    const { getDb } = await import("../firebase.js");
    _db = getDb();
  }
  return _db;
}

/**
 * Get cached Firestore module
 */
export async function getFirestoreModule() {
  if (!_fsm) {
    _fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
  }
  return _fsm;
}

/**
 * Debounce function - prevents rapid repeated calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Set button to loading state
 * @param {HTMLButtonElement} btn - Button element
 * @param {boolean} loading - Whether button is loading
 * @param {string} loadingText - Text to show while loading
 * @returns {string} Original button HTML for restoration
 */
export function setButtonLoading(btn, loading, loadingText = 'Processing...') {
  if (!btn) return '';
  
  if (loading) {
    btn._originalHTML = btn.innerHTML;
    btn._originalDisabled = btn.disabled;
    btn.disabled = true;
    btn.innerHTML = `<ion-icon name="hourglass-outline" class="animate-spin mr-1"></ion-icon>${loadingText}`;
    return btn._originalHTML;
  } else {
    btn.disabled = btn._originalDisabled || false;
    btn.innerHTML = btn._originalHTML || btn.innerHTML;
    return '';
  }
}

/**
 * Standard error handler for admin actions
 * @param {Error} error - The error object
 * @param {string} action - What action failed
 * @param {boolean} showAlert - Whether to show alert dialog
 */
export async function handleAdminError(error, action = 'Action', showAlert = true) {
  console.error(`[Admin] ${action} failed:`, error);
  
  if (showAlert) {
    const { AlertDialog } = await import('./ui.js');
    await AlertDialog(`${action} Failed`, error.message || 'An unexpected error occurred', { type: 'error' });
  }
}

/**
 * Standard success handler for admin actions
 * @param {string} message - Success message
 * @param {boolean} useToast - Use toast instead of alert
 */
export async function handleAdminSuccess(message, useToast = true) {
  if (useToast) {
    const { Toast } = await import('./ui.js');
    Toast(message);
  } else {
    const { AlertDialog } = await import('./ui.js');
    await AlertDialog('Success', message, { type: 'success' });
  }
}

/**
 * CSV Export helper
 * @param {string} filename - Name of the file to download
 * @param {Array<Object>} rows - Array of objects to export
 */
export function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    import('./ui.js').then(({ Toast }) => Toast('No data to export'));
    return;
  }
  
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
    .join('\n');
    
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Payment status info helper
 * @param {Object} vendor - Vendor object with paymentStatus and approved fields
 */
export function getPaymentStatusInfo(vendor) {
  if (vendor.paymentStatus === 'paid') {
    return {
      color: 'bg-green-500/10 border-green-500/30',
      status: '💰 Paid',
      statusColor: 'text-green-400',
      badge: 'bg-green-600',
      priority: 0
    };
  } else if (vendor.paymentStatus === 'payment_sent') {
    return {
      color: 'bg-yellow-500/10 border-yellow-500/30',
      status: '📧 Payment Sent',
      statusColor: 'text-yellow-400',
      badge: 'bg-yellow-600',
      priority: 1
    };
  } else if (vendor.approved) {
    return {
      color: 'bg-red-500/10 border-red-500/30',
      status: '⏳ Payment Pending',
      statusColor: 'text-red-400',
      badge: 'bg-red-600',
      priority: 2
    };
  } else {
    return {
      color: 'bg-glass-surface border-glass-border',
      status: '⏳ Awaiting Approval',
      statusColor: 'text-glass-secondary',
      badge: 'bg-gray-600',
      priority: 3
    };
  }
}

/**
 * Modal management - tracks active modals
 */
const activeModals = new Set();

/**
 * Create and show a modal
 * @param {string} id - Unique modal identifier
 * @param {string} content - Modal HTML content
 * @param {Object} options - Modal options
 * @returns {HTMLElement} The modal element
 */
export function showModal(id, content, options = {}) {
  // Prevent duplicate modals
  if (activeModals.has(id)) {
    console.log(`[Admin] Modal ${id} already open, skipping`);
    return null;
  }
  
  const modal = document.createElement('div');
  modal.className = `fixed inset-0 bg-black/50 flex items-center justify-center z-50 admin-modal-${id}`;
  modal.dataset.modalId = id;
  modal.innerHTML = content;
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal && options.closeOnBackdrop !== false) {
      closeModal(id);
    }
  });
  
  // Stop propagation on content
  const contentEl = modal.querySelector('.glass-container');
  if (contentEl) {
    contentEl.addEventListener('click', e => e.stopPropagation());
  }
  
  document.body.appendChild(modal);
  activeModals.add(id);
  
  return modal;
}

/**
 * Close a modal by ID
 * @param {string} id - Modal identifier to close
 */
export function closeModal(id) {
  const modal = document.querySelector(`.admin-modal-${id}`);
  if (modal && document.body.contains(modal)) {
    document.body.removeChild(modal);
  }
  activeModals.delete(id);
}

/**
 * Close all admin modals
 */
export function closeAllModals() {
  activeModals.forEach(id => closeModal(id));
}

/**
 * Format date for display
 * @param {Object|Date|string} date - Date to format
 */
export function formatDate(date) {
  if (!date) return 'N/A';
  
  let d;
  if (date.seconds) {
    d = new Date(date.seconds * 1000);
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }
  
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 */
export function formatCurrency(amount) {
  return '$' + (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
