/**
 * Admin Payments Module
 * Handles all payment management functionality in the Admin Dashboard
 * Enhanced with real-time Stripe data integration
 */

import { getAdminDb, getFirestoreModule, exportCsv, debounce, setButtonLoading } from '../../utils/admin.js';

async function voidStripeInvoice(invoiceId) {
  const response = await fetch('/.netlify/functions/void-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to void invoice');
  }
  return data;
}

async function getUi() {
  return await import('../../utils/ui.js');
}

function formatStripeAmountCents(cents) {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
}

function getInvoiceBadge(inv) {
  const status = inv?.status || 'unknown';
  if (status === 'paid' || inv?.paid) {
    return '<span class="px-2 py-1 bg-green-600 rounded text-white text-xs">Paid</span>';
  }
  if (status === 'open') {
    return '<span class="px-2 py-1 bg-yellow-600 rounded text-white text-xs">Open</span>';
  }
  if (status === 'draft') {
    return '<span class="px-2 py-1 bg-gray-600 rounded text-white text-xs">Draft</span>';
  }
  if (status === 'void') {
    return '<span class="px-2 py-1 bg-gray-600 rounded text-white text-xs">Voided</span>';
  }
  if (status === 'uncollectible') {
    return '<span class="px-2 py-1 bg-red-800 rounded text-white text-xs">Uncollectible</span>';
  }
  return `<span class="px-2 py-1 bg-gray-600 rounded text-white text-xs">${status}</span>`;
}

async function clearVendorInvoiceFieldsById(vendorId) {
  if (!vendorId) return false;

  const db = await getAdminDb();
  const fsm = await getFirestoreModule();
  const ref = fsm.doc(db, 'vendors', vendorId);

  // Avoid throwing "No document to update" when a vendor record was deleted.
  try {
    const snap = await fsm.getDoc(ref);
    if (!snap.exists()) return false;
  } catch (e) {
    // If we can't read it, fall back to attempting update and handling errors there.
  }
  const deleteField = typeof fsm.deleteField === 'function' ? fsm.deleteField() : null;

  const payload = { paymentStatus: 'pending' };
  if (deleteField) {
    payload.lastPaymentSent = deleteField;
    payload.stripeInvoiceId = deleteField;
    payload.stripeInvoiceUrl = deleteField;
    payload.invoiceAmount = deleteField;
    payload.stripeInvoiceStatus = deleteField;
  } else {
    payload.lastPaymentSent = null;
    payload.stripeInvoiceId = null;
    payload.stripeInvoiceUrl = null;
    payload.invoiceAmount = null;
    payload.stripeInvoiceStatus = null;
  }

  try {
    await fsm.updateDoc(ref, payload);
    return true;
  } catch (e) {
    const msg = String(e?.message || '');
    const code = String(e?.code || '');
    if (code === 'not-found' || msg.includes('No document to update')) {
      return false;
    }
    throw e;
  }
}

async function findVendorIdByContactEmail(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;

  if (vendorIdByEmail[key]) return vendorIdByEmail[key];

  const db = await getAdminDb();
  const fsm = await getFirestoreModule();
  const q = fsm.query(fsm.collection(db, 'vendors'), fsm.where('contactEmail', '==', key));
  const snap = await fsm.getDocs(q);
  if (snap.empty) return null;
  const id = snap.docs[0].id;
  vendorIdByEmail[key] = id;
  vendorById[id] = snap.docs[0].data();
  return id;
}

function renderStripeInvoicesSection(root, showId = currentShowId) {
  const section = root.querySelector('#stripeInvoicesSection');
  if (!section) return;

  if (!stripeInvoices || stripeInvoices.length === 0) {
    section.classList.add('hidden');
    section.innerHTML = '';
    return;
  }

  const matchesShow = (inv) => {
    if (!showId) return true;

    const invShowId = inv?.metadata?.showId;
    if (invShowId && invShowId === showId) return true;

    const emailKey = String(inv?.customer_email || '').trim().toLowerCase();
    const vendorId = inv?.metadata?.vendorId || vendorIdByEmail[emailKey] || '';
    if (!vendorId) return false;

    const vendor = vendorById[vendorId];
    const vendorShowId = vendor?.showId;
    return vendorShowId === showId || !vendorShowId;
  };

  const showFiltered = [...stripeInvoices].filter(matchesShow);

  const clientEmails = [...new Set(
    showFiltered
      .map(inv => normalizeEmail(inv?.customer_email))
      .filter(Boolean)
  )].sort();

  // If the currently selected client doesn't exist anymore, reset to All.
  if (selectedStripeClientEmail && !clientEmails.includes(selectedStripeClientEmail)) {
    selectedStripeClientEmail = '';
  }

  const matchesClient = (inv) => {
    if (!selectedStripeClientEmail) return true;
    return normalizeEmail(inv?.customer_email) === selectedStripeClientEmail;
  };

  // Once an invoice is voided/uncollectible, remove it from the actionable UI list.
  // (Stripe keeps historical records; voided invoices are just no longer payable.)
  const isVisible = (inv) => {
    const status = String(inv?.status || '').toLowerCase();
    return status !== 'void' && status !== 'uncollectible';
  };

  const sorted = showFiltered
    .filter(matchesClient)
    .filter(isVisible)
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .slice(0, 50);

  if (sorted.length === 0) {
    section.classList.add('hidden');
    section.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');
  section.innerHTML = `
    <div class="glass-card p-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="text-lg font-semibold text-glass">Stripe Invoices</h3>
        <div class="text-sm text-glass-secondary">${showId ? `Showing: ${sorted.length} • For show: ${showFiltered.length} • Loaded: ${stripeInvoices.length}` : `Showing: ${sorted.length} • Loaded: ${stripeInvoices.length}`}</div>
      </div>
      <div class="mt-3 flex items-center gap-2 flex-wrap">
        <label class="text-glass-secondary text-sm">Client:</label>
        <select id="stripeClientFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm min-w-[220px]">
          <option value="">All</option>
          ${clientEmails.map(email => `<option value="${email}" ${email === selectedStripeClientEmail ? 'selected' : ''}>${email}</option>`).join('')}
        </select>
      </div>
      <div class="mt-3 space-y-3">
        ${sorted.map(inv => {
          const created = inv.created ? new Date(inv.created * 1000).toLocaleDateString() : '—';
          const due = inv.due_date ? new Date(inv.due_date * 1000).toLocaleDateString() : '—';
          const customerEmail = inv.customer_email || '';
          const vendorId = inv.metadata?.vendorId || '';
          const canRemove = !(inv.status === 'paid' || inv.paid || inv.status === 'void' || inv.status === 'uncollectible');
          return `
            <div class="p-3 rounded-lg bg-white/5 border border-white/10">
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="font-semibold text-glass">${inv.id}</div>
                    ${getInvoiceBadge(inv)}
                    <div class="text-glass-secondary text-sm">${formatStripeAmountCents(inv.amount_due)}</div>
                  </div>
                  <div class="text-sm text-glass-secondary truncate">${customerEmail}</div>
                  <div class="text-xs text-glass-secondary mt-1">Created: ${created} • Due: ${due}</div>
                  ${inv.description ? `<div class="text-xs text-glass-secondary mt-1 truncate">${inv.description}</div>` : ''}
                </div>
                <div class="flex gap-2 flex-wrap justify-end">
                  ${inv.hosted_invoice_url ? `<a href="${inv.hosted_invoice_url}" target="_blank" rel="noopener" class="px-3 py-1 bg-orange-600 rounded text-white text-sm hover:bg-orange-700">View</a>` : ''}
                  ${canRemove ? `<button class="px-3 py-1 bg-red-600 rounded text-white text-sm hover:bg-red-700" data-action="remove-stripe-invoice" data-invoice-id="${inv.id}" data-customer-email="${customerEmail}" data-vendor-id="${vendorId}">Delete</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Module state
let lastPayments = [];
let stripeInvoices = [];
let stripeBalance = null;
let lastStripeSync = null;
let vendorById = {};
let vendorIdByEmail = {};
let currentShowId = null;
let stripeAutoSyncInFlight = false;
let selectedStripeClientEmail = '';
let selectedPaymentClientEmail = '';

const STRIPE_AUTO_SYNC_TTL_MS = 5 * 60 * 1000;

function normalizeEmail(email) {
  const key = String(email || '').trim().toLowerCase();
  return key || '';
}

async function maybeAutoSyncStripe(root, showPaymentModal) {
  // Prevent repeated sync calls triggered by filter/search re-renders.
  if (stripeAutoSyncInFlight) return;

  const last = lastStripeSync ? lastStripeSync.getTime() : 0;
  if (last && (Date.now() - last) < STRIPE_AUTO_SYNC_TTL_MS) return;

  stripeAutoSyncInFlight = true;
  try {
    await syncWithStripe(root, showPaymentModal);
  } finally {
    stripeAutoSyncInFlight = false;
  }
}

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
          <div class="flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Client:</label>
            <select id="paymentClientFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm min-w-[220px]">
              <option value="">All</option>
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

      <!-- Stripe Invoices (shown after sync) -->
      <div id="stripeInvoicesSection" class="hidden"></div>
      
      <!-- Payments List -->
      <div id="paymentsList">Loading payments...</div>
    </div>
  `;
}

/**
 * Load payments data and render the list
 * @param {HTMLElement} root - The root container element
 * @param {Object} options - Filter and search options (includes showId for show filtering)
 * @param {Function} showPaymentModal - Callback to show payment modal
 */
export async function loadPayments(root, options = {}, showPaymentModal) {
  const { filterType = 'all', searchTerm = '', showId = null } = options;
  
  const paymentsList = root.querySelector('#paymentsList');
  const statsContainer = root.querySelector('#paymentStats');
  if (!paymentsList) return;

  currentShowId = showId || null;
  // If Stripe invoices have already been loaded in this session, show them.
  renderStripeInvoicesSection(root, currentShowId);

  try {
    console.log('[AdminPayments] Loading payments...', showId ? `for show: ${showId}` : '(all shows)');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
    let payments = [];
    vendorById = {};
    vendorIdByEmail = {};
    vendorsSnap.forEach(doc => {
      const data = doc.data();
      vendorById[doc.id] = data;
      if (data?.contactEmail) {
        vendorIdByEmail[String(data.contactEmail).trim().toLowerCase()] = doc.id;
      }
      // Filter by show if specified
      const matchesShow = !showId || data.showId === showId || !data.showId;
      if (data.approved && data.totalPrice && matchesShow) {
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

    // Populate and remember the payment client filter (by email)
    const paymentClientEl = root.querySelector('#paymentClientFilter');
    if (paymentClientEl) {
      const current = normalizeEmail(paymentClientEl.value || selectedPaymentClientEmail);
      selectedPaymentClientEmail = current;
      const emails = [...new Set(
        payments
          .map(p => normalizeEmail(p.contactEmail))
          .filter(Boolean)
      )].sort();
      paymentClientEl.innerHTML = `<option value="">All</option>${emails.map(e => `<option value="${e}">${e}</option>`).join('')}`;
      paymentClientEl.value = selectedPaymentClientEmail;
    }

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

    // Apply client filter (exact email match)
    const selectedClient = normalizeEmail(root.querySelector('#paymentClientFilter')?.value || selectedPaymentClientEmail);
    selectedPaymentClientEmail = selectedClient;
    if (selectedClient) {
      payments = payments.filter(p => normalizeEmail(p.contactEmail) === selectedClient);
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
                  ${payment.paymentStatus !== 'paid' && payment.stripeInvoiceId ? `<button class="px-3 py-1 bg-gray-600 rounded text-white text-sm hover:bg-gray-700" data-action="check-stripe-status" data-vendor-email="${payment.contactEmail}" data-vendor-name="${payment.name}">Check Status</button>` : ''}
                  ${payment.paymentStatus !== 'paid' ? `<button class="px-3 py-1 bg-brand rounded text-white text-sm hover:bg-brand/80" data-action="send-payment" data-vendor-id="${payment.id}" data-vendor-name="${payment.name}" data-vendor-email="${payment.contactEmail}">${payment.stripeInvoiceId ? 'Resend' : 'Send Invoice'}</button>` : ''}
                  ${payment.paymentStatus !== 'paid' && payment.stripeInvoiceId ? `<button class="px-3 py-1 bg-red-600 rounded text-white text-sm hover:bg-red-700" data-action="remove-invoice" data-vendor-id="${payment.id}" data-invoice-id="${payment.stripeInvoiceId}" data-vendor-name="${payment.name}">Delete Invoice</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Setup event listeners
    setupPaymentListeners(root, showPaymentModal);

    // Auto-sync Stripe on initial load (guarded by TTL + in-flight flag)
    void maybeAutoSyncStripe(root, showPaymentModal);

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

  const stripeInvoicesSection = root.querySelector('#stripeInvoicesSection');

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

  // Client filter
  const clientEl = root.querySelector('#paymentClientFilter');
  if (clientEl && !clientEl._listenerAdded) {
    clientEl._listenerAdded = true;
    clientEl.addEventListener('change', () => {
      selectedPaymentClientEmail = normalizeEmail(clientEl.value);
      reloadPayments();
    });
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

      const removeBtn = e.target.closest('[data-action="remove-invoice"]');
      if (removeBtn) {
        const vendorId = removeBtn.getAttribute('data-vendor-id');
        const invoiceId = removeBtn.getAttribute('data-invoice-id');
        const vendorName = removeBtn.getAttribute('data-vendor-name') || 'this vendor';

        const { ConfirmDialog, AlertDialog, Toast } = await getUi();
        const confirmed = await ConfirmDialog(
          'Delete Invoice',
          `This will delete draft invoices in Stripe when possible, otherwise it will void them. It will also clear the vendor's invoice fields. Continue for ${vendorName}?`,
          { danger: true, confirmText: 'Delete' }
        );
        if (!confirmed) return;

        const typed = (window.prompt(`Type DELETE to remove invoice ${invoiceId} for ${vendorName}:`) || '').trim();
        if (typed !== 'DELETE') {
          Toast('Cancelled');
          return;
        }

        setButtonLoading(removeBtn, true, 'Deleting...');
        try {
          // 1) Void invoice in Stripe so it won't be payable/active for the vendor.
          await voidStripeInvoice(invoiceId);

          // 2) Clear vendor-side invoice fields so profile/dashboard doesn't keep showing it as sent.
          const cleared = await clearVendorInvoiceFieldsById(vendorId);

          Toast(cleared ? 'Invoice deleted/voided and vendor updated' : 'Invoice deleted/voided (vendor record not found)');
          reloadPayments();
        } catch (error) {
          console.error('[AdminPayments] Failed to remove invoice:', error);
          await AlertDialog('Remove Failed', error.message || 'Failed to remove invoice', { type: 'error' });
          setButtonLoading(removeBtn, false);
        }
        return;
      }

      const removeStripeBtn = e.target.closest('[data-action="remove-stripe-invoice"]');
      if (removeStripeBtn) {
        const { ConfirmDialog, AlertDialog, Toast } = await getUi();
        const invoiceId = removeStripeBtn.getAttribute('data-invoice-id');
        const customerEmail = removeStripeBtn.getAttribute('data-customer-email') || '';
        let vendorId = removeStripeBtn.getAttribute('data-vendor-id') || '';

        const confirmed = await ConfirmDialog(
          'Remove Invoice',
          `This will void the Stripe invoice and clear the vendor's invoice fields. Continue?`,
          { danger: true, confirmText: 'Remove' }
        );
        if (!confirmed) return;

        const typed = (window.prompt(`Type DELETE to remove Stripe invoice ${invoiceId}:`) || '').trim();
        if (typed !== 'DELETE') {
          Toast('Cancelled');
          return;
        }

        setButtonLoading(removeStripeBtn, true, 'Removing...');
        try {
          await voidStripeInvoice(invoiceId);

          if (!vendorId && customerEmail) {
            vendorId = await findVendorIdByContactEmail(customerEmail);
          }

          if (vendorId) {
            await clearVendorInvoiceFieldsById(vendorId);
          }

          // Update local cache so the list reflects the change immediately.
          const idx = stripeInvoices.findIndex(i => i.id === invoiceId);
          if (idx >= 0) stripeInvoices[idx] = { ...stripeInvoices[idx], status: 'void' };
          renderStripeInvoicesSection(root);

          Toast(vendorId ? 'Invoice removed' : 'Invoice removed (vendor not found)');
          reloadPayments();
        } catch (error) {
          console.error('[AdminPayments] Failed to remove Stripe invoice:', error);
          await AlertDialog('Remove Failed', error.message || 'Failed to remove invoice', { type: 'error' });
          setButtonLoading(removeStripeBtn, false);
        }
        return;
      }
      
      // Check invoice status action
      const checkBtn = e.target.closest('[data-action="check-stripe-status"]');
      if (checkBtn) {
        const vendorEmail = checkBtn.getAttribute('data-vendor-email');
        const vendorName = checkBtn.getAttribute('data-vendor-name') || vendorEmail;
        setButtonLoading(checkBtn, true, 'Checking...');
        try {
          const invoice = await getVendorStripeStatus(vendorEmail);
          showStripeStatusModal(invoice, vendorName, vendorEmail);
        } catch (error) {
          showStripeStatusModal(null, vendorName, vendorEmail, error.message);
        } finally {
          setButtonLoading(checkBtn, false);
        }
      }
    });
  }

  // Stripe invoices list is rendered outside #paymentsList, so it needs its own delegated listener.
  if (stripeInvoicesSection && !stripeInvoicesSection._listenerAdded) {
    stripeInvoicesSection._listenerAdded = true;
    stripeInvoicesSection.addEventListener('click', async (e) => {
      const removeStripeBtn = e.target.closest('[data-action="remove-stripe-invoice"]');
      if (!removeStripeBtn) return;

      const { ConfirmDialog, AlertDialog, Toast } = await getUi();
      const invoiceId = removeStripeBtn.getAttribute('data-invoice-id');
      const customerEmail = removeStripeBtn.getAttribute('data-customer-email') || '';
      let vendorId = removeStripeBtn.getAttribute('data-vendor-id') || '';

      const confirmed = await ConfirmDialog(
        'Delete Invoice',
        `This will delete draft invoices in Stripe when possible, otherwise it will void them. It will also clear the vendor's invoice fields. Continue?`,
        { danger: true, confirmText: 'Delete' }
      );
      if (!confirmed) return;

      const typed = (window.prompt(`Type DELETE to delete Stripe invoice ${invoiceId}:`) || '').trim();
      if (typed !== 'DELETE') {
        Toast('Cancelled');
        return;
      }

      setButtonLoading(removeStripeBtn, true, 'Deleting...');
      try {
        await voidStripeInvoice(invoiceId);

        if (!vendorId && customerEmail) {
          vendorId = await findVendorIdByContactEmail(customerEmail);
        }

        if (vendorId) {
          await clearVendorInvoiceFieldsById(vendorId);
        }

        const idx = stripeInvoices.findIndex(i => i.id === invoiceId);
        if (idx >= 0) stripeInvoices[idx] = { ...stripeInvoices[idx], status: 'void' };
        renderStripeInvoicesSection(root, currentShowId);

        Toast(vendorId ? 'Invoice deleted/voided' : 'Invoice deleted/voided (vendor not found)');
        reloadPayments();
      } catch (error) {
        console.error('[AdminPayments] Failed to delete Stripe invoice:', error);
        await AlertDialog('Delete Failed', error.message || 'Failed to delete invoice', { type: 'error' });
        setButtonLoading(removeStripeBtn, false);
      }
    });
  }

  // Stripe client dropdown is re-rendered often; use delegated change listener once.
  if (stripeInvoicesSection && !stripeInvoicesSection._changeListenerAdded) {
    stripeInvoicesSection._changeListenerAdded = true;
    stripeInvoicesSection.addEventListener('change', (e) => {
      const el = e.target;
      if (!el || el.id !== 'stripeClientFilter') return;
      selectedStripeClientEmail = normalizeEmail(el.value);
      renderStripeInvoicesSection(root, currentShowId);
    });
  }
}

/**
 * Show a themed modal with Stripe invoice status
 * @param {Object|null} invoice - Stripe invoice data
 * @param {string} vendorName - Vendor name
 * @param {string} vendorEmail - Vendor email
 * @param {string|null} errorMessage - Error message if failed
 */
function showStripeStatusModal(invoice, vendorName, vendorEmail, errorMessage = null) {
  // Remove any existing modal
  document.querySelectorAll('.stripe-status-modal').forEach(m => m.remove());
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 stripe-status-modal';
  
  let content = '';
  
  if (errorMessage) {
    content = `
      <div class="flex items-center gap-3 text-red-400 mb-4">
        <ion-icon name="alert-circle" class="text-3xl"></ion-icon>
        <div>
          <div class="font-semibold">Error</div>
          <div class="text-sm text-glass-secondary">${errorMessage}</div>
        </div>
      </div>
    `;
  } else if (!invoice) {
    content = `
      <div class="flex items-center gap-3 text-yellow-400 mb-4">
        <ion-icon name="document-outline" class="text-3xl"></ion-icon>
        <div>
          <div class="font-semibold">No Invoice Found</div>
          <div class="text-sm text-glass-secondary">No Stripe invoice exists for this vendor yet.</div>
        </div>
      </div>
      <p class="text-sm text-glass-secondary">Send an invoice to create one in Stripe.</p>
    `;
  } else {
    const statusConfig = {
      paid: { color: 'text-green-400', bg: 'bg-green-500/20', icon: 'checkmark-circle', label: 'Paid' },
      open: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: 'time-outline', label: 'Open' },
      draft: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: 'document-outline', label: 'Draft' },
      void: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: 'close-circle-outline', label: 'Voided' },
      uncollectible: { color: 'text-red-400', bg: 'bg-red-500/20', icon: 'warning-outline', label: 'Uncollectible' }
    };
    const status = statusConfig[invoice.status] || { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: 'help-circle-outline', label: invoice.status };
    
    const amountDue = (invoice.amount_due / 100).toFixed(2);
    const amountPaid = (invoice.amount_paid / 100).toFixed(2);
    const amountRemaining = (invoice.amount_remaining / 100).toFixed(2);
    const createdDate = invoice.created ? new Date(invoice.created * 1000).toLocaleDateString() : 'N/A';
    const dueDate = invoice.due_date ? new Date(invoice.due_date * 1000).toLocaleDateString() : 'N/A';
    
    content = `
      <!-- Status Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-full ${status.bg} flex items-center justify-center">
          <ion-icon name="${status.icon}" class="text-2xl ${status.color}"></ion-icon>
        </div>
        <div>
          <div class="text-lg font-semibold ${status.color}">${status.label}</div>
          <div class="text-xs text-glass-secondary">Invoice ${invoice.id}</div>
        </div>
      </div>
      
      <!-- Amount Cards -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <div class="text-lg font-bold text-glass">$${amountDue}</div>
          <div class="text-xs text-glass-secondary">Total Due</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <div class="text-lg font-bold text-green-400">$${amountPaid}</div>
          <div class="text-xs text-glass-secondary">Paid</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <div class="text-lg font-bold ${parseFloat(amountRemaining) > 0 ? 'text-red-400' : 'text-green-400'}">$${amountRemaining}</div>
          <div class="text-xs text-glass-secondary">Remaining</div>
        </div>
      </div>
      
      <!-- Details -->
      <div class="space-y-2 text-sm mb-6">
        <div class="flex justify-between py-2 border-b border-white/10">
          <span class="text-glass-secondary">Created</span>
          <span class="text-glass">${createdDate}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-white/10">
          <span class="text-glass-secondary">Due Date</span>
          <span class="text-glass">${dueDate}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-white/10">
          <span class="text-glass-secondary">Customer</span>
          <span class="text-glass">${invoice.customer_email || vendorEmail}</span>
        </div>
        ${invoice.description ? `
          <div class="flex justify-between py-2 border-b border-white/10">
            <span class="text-glass-secondary">Description</span>
            <span class="text-glass text-right max-w-[200px] truncate">${invoice.description}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Action Buttons -->
      ${invoice.hosted_invoice_url ? `
        <div class="flex gap-2">
          <a href="${invoice.hosted_invoice_url}" target="_blank" rel="noopener" 
             class="flex-1 text-center px-4 py-2 bg-orange-600 rounded text-white hover:bg-orange-700 transition-colors">
            <ion-icon name="open-outline" class="mr-1"></ion-icon>View in Stripe
          </a>
        </div>
      ` : ''}
    `;
  }
  
  modal.innerHTML = `
    <div class="glass-container max-w-md w-full mx-4 modal-content">
      <div class="p-6 border-b border-glass-border">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-glass">Stripe Invoice Status</h2>
            <p class="text-sm text-glass-secondary">${vendorName}</p>
          </div>
          <button class="text-glass-secondary hover:text-glass p-2 modal-close-btn">
            <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        ${content}
      </div>
      
      <div class="p-4 border-t border-glass-border flex justify-end">
        <button class="modal-close-btn px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass hover:bg-white/5 transition-colors">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close handlers
  const closeModal = () => modal.remove();
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  modal.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
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

    renderStripeInvoicesSection(root, currentShowId);
    
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
