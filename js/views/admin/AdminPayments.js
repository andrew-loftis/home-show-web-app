/**
 * Admin Payments Module
 * Handles all payment management functionality in the Admin Dashboard
 * Enhanced with real-time Stripe data integration
 */

import { getAdminDb, getFirestoreModule, exportCsv, debounce, setButtonLoading } from '../../utils/admin.js';

// Module state
let lastPayments = [];
let stripeInvoices = [];
let stripeBalance = null;
let lastStripeSync = null;

/**
 * Render the payments tab HTML template
 */
export function renderPaymentsTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">Payment Management</h2>
        <div class="flex items-center gap-4 flex-wrap">
          <div class="hidden md:flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Search:</label>
            <input id="paymentSearch" type="search" placeholder="Name or email..." class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm w-64" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Status:</label>
            <select id="paymentFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="payment_sent">Invoice Sent</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button class="bg-orange-600 px-4 py-2 rounded text-white hover:bg-orange-700" id="syncStripeBtn">
            <ion-icon name="sync-outline" class="mr-1"></ion-icon>Sync Stripe
          </button>
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshPayments">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
          </button>
          <button id="exportPayments" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
        </div>
      </div>
      
      <!-- Stripe Balance Card (shown after sync) -->
      <div id="stripeBalanceCard" class="hidden">
        <!-- Will be populated after Stripe sync -->
      </div>
      
      <!-- Stats Cards -->
      <div id="paymentStats">
        <!-- Stats will be populated dynamically -->
      </div>
      
      <!-- Stripe Sync Status -->
      <div id="stripeSyncStatus" class="hidden">
        <!-- Will show sync status -->
      </div>
      
      <!-- Payments List -->
      <div id="paymentsList">Loading payments...</div>
    </div>
  `;
}

/**
 * Load payments data and render the list
 * @param {HTMLElement} root - The root container element
 * @param {Object} options - Filter and search options
 * @param {Function} showPaymentModal - Callback to show payment modal
 */
export async function loadPayments(root, options = {}, showPaymentModal) {
  const { filterType = 'all', searchTerm = '' } = options;
  
  const paymentsList = root.querySelector('#paymentsList');
  const statsContainer = root.querySelector('#paymentStats');
  if (!paymentsList) return;

  try {
    console.log('[AdminPayments] Loading payments...');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
    let payments = [];
    vendorsSnap.forEach(doc => {
      const data = doc.data();
      if (data.approved && data.totalPrice) {
        payments.push({ id: doc.id, ...data });
      }
    });
    console.log('[AdminPayments] Payments loaded:', payments.length);

    // Calculate stats before filtering
    const totalRevenue = payments.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const paidTotal = payments.filter(p => p.paymentStatus === 'paid').reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const pendingTotal = payments.filter(p => p.paymentStatus !== 'paid').reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const paidCount = payments.filter(p => p.paymentStatus === 'paid').length;
    const sentCount = payments.filter(p => p.paymentStatus === 'payment_sent').length;
    const pendingCount = payments.filter(p => !p.paymentStatus || p.paymentStatus === 'pending').length;

    // Apply filter
    const filter = filterType || root.querySelector('#paymentFilter')?.value || 'all';
    if (filter !== 'all') {
      payments = payments.filter(p => {
        if (filter === 'paid') return p.paymentStatus === 'paid';
        if (filter === 'payment_sent') return p.paymentStatus === 'payment_sent';
        if (filter === 'pending') return !p.paymentStatus || p.paymentStatus === 'pending';
        return true;
      });
    }

    // Apply search
    const q = String(searchTerm || root.querySelector('#paymentSearch')?.value || '').trim().toLowerCase();
    if (q) {
      payments = payments.filter(p => {
        const fields = [p.name, p.contactEmail].map(x => String(x || '').toLowerCase());
        return fields.some(f => f.includes(q));
      });
    }

    // Store for export (include Stripe fields)
    lastPayments = payments.map(p => ({
      id: p.id,
      name: p.name || '',
      contactEmail: p.contactEmail || '',
      totalPrice: p.totalPrice || 0,
      paymentStatus: p.paymentStatus || 'pending',
      stripeInvoiceId: p.stripeInvoiceId || '',
      stripeInvoiceStatus: p.stripeInvoiceStatus || '',
      stripeInvoiceUrl: p.stripeInvoiceUrl || '',
      lastPaymentSent: p.lastPaymentSent || '',
      lastStripeSync: p.lastStripeSync || ''
    }));

    // Render stats
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-brand">$${totalRevenue.toLocaleString()}</div>
            <div class="text-sm text-glass-secondary">Total Expected</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-green-400">$${paidTotal.toLocaleString()}</div>
            <div class="text-sm text-glass-secondary">Collected (${paidCount})</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-yellow-400">${sentCount}</div>
            <div class="text-sm text-glass-secondary">Invoices Sent</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-red-400">$${pendingTotal.toLocaleString()}</div>
            <div class="text-sm text-glass-secondary">Outstanding (${pendingCount})</div>
          </div>
        </div>
      `;
    }

    // Render payments list
    paymentsList.innerHTML = `
      <div class="space-y-4">
        ${payments.length === 0 ? `
          <div class="glass-card p-8 text-center">
            <div class="text-glass-secondary">
              <ion-icon name="card-outline" class="text-2xl mb-2"></ion-icon>
              <p>No payments match the selected filter</p>
            </div>
          </div>
        ` : payments.map(payment => `
          <div class="glass-card p-4 ${payment.paymentStatus === 'paid' ? 'border-l-4 border-green-500' : payment.paymentStatus === 'payment_sent' ? 'border-l-4 border-yellow-500' : 'border-l-4 border-red-500'}">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3 flex-wrap">
                  <h3 class="text-lg font-semibold text-glass">${payment.name}</h3>
                  ${getEnhancedStatusBadge(payment)}
                </div>
                <p class="text-glass-secondary text-sm truncate">${payment.contactEmail}</p>
                ${payment.lastPaymentSent ? `<p class="text-xs text-glass-secondary mt-1">Invoice sent: ${new Date(payment.lastPaymentSent).toLocaleDateString()}</p>` : ''}
                ${payment.stripeInvoiceId ? `<p class="text-xs text-orange-400 mt-1">Stripe: ${payment.stripeInvoiceId}</p>` : ''}
                ${payment.lastStripeSync ? `<p class="text-xs text-glass-secondary">Last sync: ${new Date(payment.lastStripeSync).toLocaleString()}</p>` : ''}
              </div>
              <div class="text-right">
                <p class="text-lg font-bold ${payment.paymentStatus === 'paid' ? 'text-green-400' : 'text-glass'}">$${(payment.totalPrice || 0).toLocaleString()}</p>
                <div class="flex gap-2 mt-2 flex-wrap justify-end">
                  ${payment.stripeInvoiceUrl ? `<a href="${payment.stripeInvoiceUrl}" target="_blank" rel="noopener" class="px-3 py-1 bg-orange-600 rounded text-white text-sm hover:bg-orange-700">View Invoice</a>` : ''}
                  ${payment.paymentStatus !== 'paid' && payment.stripeInvoiceId ? `<button class="px-3 py-1 bg-gray-600 rounded text-white text-sm hover:bg-gray-700" data-action="check-stripe-status" data-vendor-email="${payment.contactEmail}">Check Status</button>` : ''}
                  ${payment.paymentStatus !== 'paid' ? `<button class="px-3 py-1 bg-brand rounded text-white text-sm hover:bg-brand/80" data-action="send-payment" data-vendor-id="${payment.id}" data-vendor-name="${payment.name}" data-vendor-email="${payment.contactEmail}">${payment.stripeInvoiceId ? 'Resend' : 'Send Invoice'}</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Setup event listeners
    setupPaymentListeners(root, showPaymentModal);

  } catch (error) {
    console.error('[AdminPayments] Failed to load payments:', error);
    paymentsList.innerHTML = '<div class="text-red-400">Failed to load payments</div>';
  }
}

/**
 * Setup all payment-related event listeners
 */
function setupPaymentListeners(root, showPaymentModal) {
  const paymentsList = root.querySelector('#paymentsList');
  if (!paymentsList) return;

  // Reload helper
  const reloadPayments = () => {
    const filter = root.querySelector('#paymentFilter')?.value || 'all';
    const search = root.querySelector('#paymentSearch')?.value || '';
    loadPayments(root, { filterType: filter, searchTerm: search }, showPaymentModal);
  };

  // Sync with Stripe button
  const syncBtn = root.querySelector('#syncStripeBtn');
  if (syncBtn && !syncBtn._listenerAdded) {
    syncBtn._listenerAdded = true;
    syncBtn.addEventListener('click', () => syncWithStripe(root, showPaymentModal));
  }

  // Export CSV
  const exportBtn = root.querySelector('#exportPayments');
  if (exportBtn && !exportBtn._listenerAdded) {
    exportBtn._listenerAdded = true;
    exportBtn.addEventListener('click', () => {
      exportCsv(`payments_${new Date().toISOString().slice(0, 10)}.csv`, lastPayments);
    });
  }

  // Refresh button
  const refreshBtn = root.querySelector('#refreshPayments');
  if (refreshBtn && !refreshBtn._listenerAdded) {
    refreshBtn._listenerAdded = true;
    refreshBtn.addEventListener('click', reloadPayments);
  }

  // Search input with debounce
  const searchEl = root.querySelector('#paymentSearch');
  if (searchEl && !searchEl._listenerAdded) {
    searchEl._listenerAdded = true;
    const debouncedSearch = debounce(reloadPayments, 300);
    searchEl.addEventListener('input', debouncedSearch);
  }

  // Filter
  const filterEl = root.querySelector('#paymentFilter');
  if (filterEl && !filterEl._listenerAdded) {
    filterEl._listenerAdded = true;
    filterEl.addEventListener('change', reloadPayments);
  }

  // Payment action listener with check invoice status support
  if (!paymentsList._listenerAdded) {
    paymentsList._listenerAdded = true;
    paymentsList.addEventListener('click', async (e) => {
      const sendBtn = e.target.closest('[data-action="send-payment"]');
      if (sendBtn) {
        const vendorId = sendBtn.getAttribute('data-vendor-id');
        const vendorName = sendBtn.getAttribute('data-vendor-name');
        const vendorEmail = sendBtn.getAttribute('data-vendor-email');
        showPaymentModal(vendorId, vendorName, vendorEmail);
        return;
      }
      
      // Check invoice status action
      const checkBtn = e.target.closest('[data-action="check-stripe-status"]');
      if (checkBtn) {
        const vendorEmail = checkBtn.getAttribute('data-vendor-email');
        setButtonLoading(checkBtn, true, 'Checking...');
        try {
          const invoice = await getVendorStripeStatus(vendorEmail);
          if (invoice) {
            alert(`Stripe Status: ${invoice.status}\nAmount: $${(invoice.amount_due / 100).toFixed(2)}\nPaid: ${invoice.paid ? 'Yes' : 'No'}`);
          } else {
            alert('No Stripe invoice found for this vendor.');
          }
        } catch (error) {
          alert('Failed to check Stripe status: ' + error.message);
        } finally {
          setButtonLoading(checkBtn, false);
        }
      }
    });
  }
}

/**
 * Get the last loaded payments for export
 */
export function getLastPayments() {
  return lastPayments;
}

/**
 * Fetch real-time Stripe data
 * @param {string} action - The Stripe action to perform
 * @param {Object} params - Additional parameters
 * @returns {Promise<Object>} Stripe response data
 */
async function fetchStripeData(action, params = {}) {
  try {
    const response = await fetch('/.netlify/functions/get-stripe-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch Stripe data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[AdminPayments] Stripe API error:', error);
    throw error;
  }
}

/**
 * Sync payments with Stripe to get real-time status
 * @param {HTMLElement} root - The root container element
 * @param {Function} showPaymentModal - Callback to show payment modal
 */
export async function syncWithStripe(root, showPaymentModal) {
  const syncBtn = root.querySelector('#syncStripeBtn');
  const balanceCard = root.querySelector('#stripeBalanceCard');
  const syncStatus = root.querySelector('#stripeSyncStatus');
  
  if (syncBtn) setButtonLoading(syncBtn, true, 'Syncing...');
  
  try {
    // Fetch Stripe balance and invoices in parallel
    const [balanceData, invoicesData] = await Promise.all([
      fetchStripeData('getBalance'),
      fetchStripeData('listAll', { limit: 100 })
    ]);
    
    stripeBalance = balanceData;
    stripeInvoices = invoicesData.invoices || [];
    lastStripeSync = new Date();
    
    console.log('[AdminPayments] Stripe sync complete:', {
      invoices: stripeInvoices.length,
      balance: stripeBalance
    });
    
    // Show balance card
    if (balanceCard && stripeBalance) {
      const availableTotal = stripeBalance.balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
      const pendingTotal = stripeBalance.balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;
      
      balanceCard.classList.remove('hidden');
      balanceCard.innerHTML = `
        <div class="glass-card p-4 border-l-4 border-orange-500">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <ion-icon name="logo-usd" class="text-3xl text-orange-400"></ion-icon>
              <div>
                <h3 class="text-lg font-semibold text-glass">Stripe Balance</h3>
                <p class="text-xs text-glass-secondary">Last synced: ${lastStripeSync.toLocaleTimeString()}</p>
              </div>
            </div>
            <div class="flex gap-6 text-right">
              <div>
                <div class="text-xl font-bold text-green-400">$${availableTotal.toLocaleString()}</div>
                <div class="text-xs text-glass-secondary">Available</div>
              </div>
              <div>
                <div class="text-xl font-bold text-yellow-400">$${pendingTotal.toLocaleString()}</div>
                <div class="text-xs text-glass-secondary">Pending</div>
              </div>
              <div>
                <div class="text-xl font-bold text-brand">${stripeInvoices.length}</div>
                <div class="text-xs text-glass-secondary">Invoices</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Update vendor payment statuses from Stripe
    await syncVendorStatuses(root);
    
    // Show sync status
    if (syncStatus) {
      syncStatus.classList.remove('hidden');
      syncStatus.innerHTML = `
        <div class="bg-green-900/30 border border-green-500/50 rounded p-3 flex items-center gap-2">
          <ion-icon name="checkmark-circle" class="text-green-400"></ion-icon>
          <span class="text-green-300 text-sm">Synced ${stripeInvoices.length} invoices from Stripe at ${lastStripeSync.toLocaleTimeString()}</span>
        </div>
      `;
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        syncStatus.classList.add('hidden');
      }, 5000);
    }
    
    // Reload payments to show updated data
    const filter = root.querySelector('#paymentFilter')?.value || 'all';
    const search = root.querySelector('#paymentSearch')?.value || '';
    await loadPayments(root, { filterType: filter, searchTerm: search }, showPaymentModal);
    
  } catch (error) {
    console.error('[AdminPayments] Stripe sync failed:', error);
    
    if (syncStatus) {
      syncStatus.classList.remove('hidden');
      syncStatus.innerHTML = `
        <div class="bg-red-900/30 border border-red-500/50 rounded p-3 flex items-center gap-2">
          <ion-icon name="alert-circle" class="text-red-400"></ion-icon>
          <span class="text-red-300 text-sm">Stripe sync failed: ${error.message}</span>
        </div>
      `;
    }
  } finally {
    if (syncBtn) setButtonLoading(syncBtn, false);
  }
}

/**
 * Sync vendor payment statuses with Stripe invoice data
 * @param {HTMLElement} root - The root container element
 */
async function syncVendorStatuses(root) {
  if (stripeInvoices.length === 0) return;
  
  try {
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();
    
    // Get all vendors
    const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
    const vendors = [];
    vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));
    
    // Match vendors to Stripe invoices by email
    let updatedCount = 0;
    
    for (const vendor of vendors) {
      if (!vendor.contactEmail) continue;
      
      // Find matching Stripe invoice
      const matchingInvoice = stripeInvoices.find(inv => 
        inv.customer_email?.toLowerCase() === vendor.contactEmail.toLowerCase() ||
        inv.metadata?.vendorId === vendor.id
      );
      
      if (matchingInvoice) {
        // Map Stripe status to our status
        let newStatus = vendor.paymentStatus;
        if (matchingInvoice.status === 'paid' || matchingInvoice.paid) {
          newStatus = 'paid';
        } else if (matchingInvoice.status === 'open') {
          newStatus = 'payment_sent';
        } else if (matchingInvoice.status === 'void' || matchingInvoice.status === 'uncollectible') {
          newStatus = 'failed';
        }
        
        // Only update if status changed
        if (newStatus !== vendor.paymentStatus) {
          await fsm.updateDoc(fsm.doc(db, 'vendors', vendor.id), {
            paymentStatus: newStatus,
            stripeInvoiceStatus: matchingInvoice.status,
            stripeInvoiceId: matchingInvoice.id,
            stripeInvoiceUrl: matchingInvoice.hosted_invoice_url || null,
            lastStripeSync: new Date().toISOString()
          });
          updatedCount++;
          console.log(`[AdminPayments] Updated ${vendor.name} status to ${newStatus}`);
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`[AdminPayments] Updated ${updatedCount} vendor payment statuses from Stripe`);
    }
    
  } catch (error) {
    console.error('[AdminPayments] Failed to sync vendor statuses:', error);
  }
}

/**
 * Get Stripe invoice status for a specific vendor
 * @param {string} vendorEmail - The vendor's email address
 * @returns {Promise<Object|null>} Invoice data or null
 */
export async function getVendorStripeStatus(vendorEmail) {
  try {
    const data = await fetchStripeData('getCustomerInvoices', { vendorEmail });
    return data.invoices && data.invoices.length > 0 ? data.invoices[0] : null;
  } catch (error) {
    console.error('[AdminPayments] Failed to get vendor Stripe status:', error);
    return null;
  }
}

/**
 * Get stripe invoice status badge with more granularity
 * @param {Object} payment - Payment object with stripeInvoiceStatus
 * @returns {string} HTML badge
 */
function getEnhancedStatusBadge(payment) {
  const stripeStatus = payment.stripeInvoiceStatus;
  const localStatus = payment.paymentStatus;
  
  // If we have Stripe status, show more detail
  if (stripeStatus) {
    switch (stripeStatus) {
      case 'paid':
        return '<span class="px-2 py-1 bg-green-600 rounded text-white text-xs flex items-center gap-1"><ion-icon name="checkmark-circle-outline"></ion-icon>Paid</span>';
      case 'open':
        return '<span class="px-2 py-1 bg-yellow-600 rounded text-white text-xs flex items-center gap-1"><ion-icon name="time-outline"></ion-icon>Invoice Open</span>';
      case 'draft':
        return '<span class="px-2 py-1 bg-gray-600 rounded text-white text-xs flex items-center gap-1"><ion-icon name="document-outline"></ion-icon>Draft</span>';
      case 'void':
        return '<span class="px-2 py-1 bg-gray-600 rounded text-white text-xs flex items-center gap-1"><ion-icon name="close-circle-outline"></ion-icon>Voided</span>';
      case 'uncollectible':
        return '<span class="px-2 py-1 bg-red-800 rounded text-white text-xs flex items-center gap-1"><ion-icon name="warning-outline"></ion-icon>Uncollectible</span>';
      default:
        // Fall through to local status
        break;
    }
  }
  
  // Fallback to local status
  if (localStatus === 'paid') return '<span class="px-2 py-1 bg-green-600 rounded text-white text-xs">Paid</span>';
  if (localStatus === 'payment_sent') return '<span class="px-2 py-1 bg-yellow-600 rounded text-white text-xs">Invoice Sent</span>';
  if (localStatus === 'failed') return '<span class="px-2 py-1 bg-red-600 rounded text-white text-xs">Failed</span>';
  return '<span class="px-2 py-1 bg-red-600 rounded text-white text-xs">Pending</span>';
}

// Export for use in main AdminDashboard
export { getEnhancedStatusBadge };
