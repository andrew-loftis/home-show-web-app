/**
 * Admin Vendors Module
 * Handles all vendor management functionality in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading, exportCsv, getPaymentStatusInfo, debounce } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';
import { SkeletonTableRows } from '../../utils/skeleton.js';
import { sendVendorApprovalEmail } from '../../utils/email.js';

// Module state
let lastVendors = [];
let allVendors = []; // Full filtered/sorted list
let currentPage = 1;
const PAGE_SIZE = 20; // Items per page

/**
 * Render the vendors tab HTML template
 */
export function renderVendorsTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">Vendor Management</h2>
        <div class="flex items-center gap-4 flex-wrap">
          <div class="hidden md:flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Search:</label>
            <input id="vendorSearch" type="search" placeholder="Name, email, category..." class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm w-64" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Filter:</label>
            <select id="vendorFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
              <option value="all">All Vendors</option>
              <option value="approved">Approved</option>
              <option value="pending">Awaiting Approval</option>
              <option value="paid">Paid</option>
              <option value="payment_sent">Payment Sent</option>
              <option value="payment_pending">Payment Pending</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-glass-secondary text-sm">Sort:</label>
            <select id="vendorSort" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
              <option value="default">Default</option>
              <option value="name_az">Name A–Z</option>
              <option value="total_desc">Total $ High→Low</option>
              <option value="status">Payment Status</option>
            </select>
          </div>
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshVendors">Refresh</button>
          <button id="exportVendors" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
        </div>
      </div>
      <div class="glass-card p-3 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <label class="inline-flex items-center gap-2 text-glass">
            <input id="vendorSelectAll" type="checkbox" class="accent-brand">
            <span class="text-sm">Select all</span>
          </label>
        </div>
        <div class="flex items-center gap-2">
          <button id="bulkApprove" class="px-3 py-2 bg-green-600 text-white text-sm rounded disabled:opacity-50" disabled>
            <ion-icon name="checkmark-done-outline" class="mr-1"></ion-icon>Approve Selected
          </button>
          <button id="bulkDelete" class="px-3 py-2 bg-red-600 text-white text-sm rounded disabled:opacity-50" disabled>
            <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete Selected
          </button>
        </div>
      </div>
      <div class="mb-4">
        <div class="flex items-center gap-6 text-sm flex-wrap">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500/20 border border-green-500/40 rounded"></div>
            <span class="text-glass-secondary">Paid</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-yellow-500/20 border border-yellow-500/40 rounded"></div>
            <span class="text-glass-secondary">Payment Sent</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-red-500/20 border border-red-500/40 rounded"></div>
            <span class="text-glass-secondary">Payment Pending</span>
          </div>
        </div>
      </div>
      <div id="vendorsList">Loading vendors...</div>
      <div id="vendorPagination" class="mt-4 flex items-center justify-between flex-wrap gap-3">
        <!-- Pagination controls will be inserted here -->
      </div>
    </div>
  `;
}

/**
 * Load vendors data and render the list
 * @param {HTMLElement} root - The root container element
 * @param {Object} options - Filter, search, sort options
 * @param {Function} showVendorModal - Callback to show vendor profile modal
 * @param {Function} showPaymentModal - Callback to show payment modal
 */
export async function loadVendors(root, options = {}, showVendorModal, showPaymentModal) {
  const { filterType = 'all', searchTerm = '', sortBy = 'default', resetPage = true } = options;
  
  const vendorsList = root.querySelector('#vendorsList');
  const paginationEl = root.querySelector('#vendorPagination');
  if (!vendorsList) return;
  
  // Reset page on filter/search/sort change
  if (resetPage) {
    currentPage = 1;
  }
  
  // Show skeleton while loading
  vendorsList.innerHTML = SkeletonTableRows(5);

  try {
    console.log('[AdminVendors] Loading vendors...');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
    console.log('[AdminVendors] Vendors loaded:', vendorsSnap.size);
    let vendors = [];
    vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));

    // Apply filter
    if (filterType !== 'all') {
      vendors = vendors.filter(vendor => {
        switch (filterType) {
          case 'approved': return vendor.approved === true;
          case 'pending': return vendor.approved !== true;
          case 'paid': return vendor.paymentStatus === 'paid';
          case 'payment_sent': return vendor.paymentStatus === 'payment_sent';
          case 'payment_pending': return vendor.approved === true && (!vendor.paymentStatus || vendor.paymentStatus === 'pending');
          default: return true;
        }
      });
    }

    // Apply search
    const q = String(searchTerm || root.querySelector('#vendorSearch')?.value || '').trim().toLowerCase();
    if (q) {
      vendors = vendors.filter(v => {
        const fields = [v.name, v.contactEmail, v.category, v.phone].map(x => String(x || '').toLowerCase());
        return fields.some(f => f.includes(q));
      });
    }

    // Apply sort
    const sortMode = sortBy || (root.querySelector('#vendorSort')?.value || 'default');
    const statusRank = (v) => {
      if (v.paymentStatus === 'paid') return 0;
      if (v.paymentStatus === 'payment_sent') return 1;
      if (v.approved) return 2;
      return 3;
    };
    
    if (sortMode === 'name_az') {
      vendors.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sortMode === 'total_desc') {
      vendors.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
    } else if (sortMode === 'status') {
      vendors.sort((a, b) => statusRank(a) - statusRank(b));
    }

    // Store full list for pagination and export
    allVendors = vendors;
    lastVendors = vendors.map(v => ({
      id: v.id,
      name: v.name || '',
      contactEmail: v.contactEmail || '',
      phone: v.phone || '',
      category: v.category || '',
      approved: !!v.approved,
      paymentStatus: v.paymentStatus || '',
      totalPrice: v.totalPrice || 0,
      booths: (v.booths || []).join(' '),
      stripeInvoiceId: v.stripeInvoiceId || '',
      stripeInvoiceUrl: v.stripeInvoiceUrl || '',
      lastPaymentSent: v.lastPaymentSent || ''
    }));

    // Calculate pagination
    const totalItems = vendors.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
    const paginatedVendors = vendors.slice(startIndex, endIndex);

    // Render vendor list
    vendorsList.innerHTML = `
      <div class="space-y-4">
        ${paginatedVendors.length === 0 ? `
          <div class="glass-card p-8 text-center">
            <div class="text-glass-secondary">
              <ion-icon name="search-outline" class="text-2xl mb-2"></ion-icon>
              <p>No vendors match the selected filter</p>
            </div>
          </div>
        ` : paginatedVendors.map(vendor => {
          const statusInfo = getPaymentStatusInfo(vendor);
          return `
          <div class="glass-card p-4 border ${statusInfo.color}">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                  <input type="checkbox" class="vendor-select accent-brand" data-vendor-id="${vendor.id}">
                  <h3 class="text-lg font-semibold text-glass">${vendor.name}</h3>
                </div>
                <p class="text-glass-secondary">${vendor.contactEmail}</p>
                <div class="flex items-center gap-4 mt-2 flex-wrap">
                  <p class="text-sm text-glass-secondary">Status: ${vendor.approved ? '✅ Approved' : '⏳ Pending'}</p>
                  <p class="text-sm ${statusInfo.statusColor}">${statusInfo.status}</p>
                </div>
                <p class="text-sm text-glass-secondary">Category: ${vendor.category || 'N/A'}</p>
                <p class="text-sm text-glass-secondary">Phone: ${vendor.phone || 'N/A'}</p>
                ${vendor.booths ? `<p class="text-sm text-glass-secondary">Booths: ${vendor.booths.join(', ')}</p>` : ''}
                ${vendor.totalPrice ? `<p class="text-sm text-green-400">Total: $${vendor.totalPrice.toLocaleString()}</p>` : ''}
              </div>
              <div class="flex flex-col gap-2">
                <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" data-action="view" data-vendor-id="${vendor.id}">
                  <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                </button>
                <button class="bg-purple-600 px-3 py-1 rounded text-white text-sm" data-action="edit" data-vendor-id="${vendor.id}">
                  <ion-icon name="create-outline" class="mr-1"></ion-icon>Edit
                </button>
                ${vendor.approved ? `<button class="bg-orange-600 px-3 py-1 rounded text-white text-sm" data-action="pay" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}">
                  <ion-icon name="card-outline" class="mr-1"></ion-icon>Payment
                </button>` : ''}
                ${vendor.stripeInvoiceUrl ? `<a href="${vendor.stripeInvoiceUrl}" target="_blank" rel="noopener" class="text-center px-3 py-1 bg-orange-700 rounded text-white text-sm">
                  <ion-icon name="open-outline" class="mr-1"></ion-icon>Invoice
                </a>` : ''}
                ${!vendor.approved ? `<button class="bg-green-600 px-3 py-1 rounded text-white text-sm" data-action="approve" data-vendor-id="${vendor.id}" data-vendor-email="${vendor.contactEmail}">
                  <ion-icon name="checkmark-outline" class="mr-1"></ion-icon>Approve
                </button>` : ''}
                <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" data-action="delete" data-vendor-id="${vendor.id}">
                  <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                </button>
              </div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;

    // Render pagination controls
    if (paginationEl) {
      paginationEl.innerHTML = renderPagination(totalItems, totalPages, currentPage, startIndex, endIndex);
      setupPaginationListeners(root, paginationEl, totalPages, showVendorModal, showPaymentModal);
    }

    // Setup event listeners
    setupVendorListeners(root, showVendorModal, showPaymentModal);

  } catch (error) {
    console.error('[AdminVendors] Failed to load vendors:', error);
    vendorsList.innerHTML = '<div class="text-red-400">Failed to load vendors</div>';
  }
}

/**
 * Render pagination controls
 */
function renderPagination(totalItems, totalPages, currentPage, startIndex, endIndex) {
  if (totalItems <= PAGE_SIZE) {
    // No pagination needed for small lists
    return `<div class="text-sm text-glass-secondary">Showing all ${totalItems} vendor${totalItems !== 1 ? 's' : ''}</div>`;
  }

  return `
    <div class="text-sm text-glass-secondary">
      Showing ${startIndex + 1}–${endIndex} of ${totalItems} vendors
    </div>
    <div class="flex items-center gap-2">
      <button id="vendorPrevPage" class="px-3 py-1 bg-glass-surface border border-glass-border rounded text-glass text-sm disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>
        <ion-icon name="chevron-back-outline"></ion-icon> Prev
      </button>
      <span class="text-glass text-sm px-2">Page ${currentPage} of ${totalPages}</span>
      <button id="vendorNextPage" class="px-3 py-1 bg-glass-surface border border-glass-border rounded text-glass text-sm disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>
        Next <ion-icon name="chevron-forward-outline"></ion-icon>
      </button>
    </div>
  `;
}

/**
 * Setup pagination button listeners
 */
function setupPaginationListeners(root, paginationEl, totalPages, showVendorModal, showPaymentModal) {
  const prevBtn = paginationEl.querySelector('#vendorPrevPage');
  const nextBtn = paginationEl.querySelector('#vendorNextPage');

  if (prevBtn && !prevBtn._listenerAdded) {
    prevBtn._listenerAdded = true;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadVendors(root, { resetPage: false }, showVendorModal, showPaymentModal);
      }
    });
  }

  if (nextBtn && !nextBtn._listenerAdded) {
    nextBtn._listenerAdded = true;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadVendors(root, { resetPage: false }, showVendorModal, showPaymentModal);
      }
    });
  }
}

/**
 * Setup all vendor-related event listeners
 */
function setupVendorListeners(root, showVendorModal, showPaymentModal) {
  const vendorsList = root.querySelector('#vendorsList');
  if (!vendorsList) return;

  // Reload helper
  const reloadVendors = () => {
    const filter = root.querySelector('#vendorFilter')?.value || 'all';
    const search = root.querySelector('#vendorSearch')?.value || '';
    const sort = root.querySelector('#vendorSort')?.value || 'default';
    loadVendors(root, { filterType: filter, searchTerm: search, sortBy: sort }, showVendorModal, showPaymentModal);
  };

  // Export CSV
  const exportBtn = root.querySelector('#exportVendors');
  if (exportBtn && !exportBtn._listenerAdded) {
    exportBtn._listenerAdded = true;
    exportBtn.addEventListener('click', () => {
      exportCsv(`vendors_${new Date().toISOString().slice(0, 10)}.csv`, lastVendors);
    });
  }

  // Refresh button
  const refreshBtn = root.querySelector('#refreshVendors');
  if (refreshBtn && !refreshBtn._listenerAdded) {
    refreshBtn._listenerAdded = true;
    refreshBtn.addEventListener('click', reloadVendors);
  }

  // Bulk state update
  const updateBulkState = () => {
    const anyChecked = root.querySelectorAll('.vendor-select:checked').length > 0;
    const bulkApproveBtn = root.querySelector('#bulkApprove');
    const bulkDeleteBtn = root.querySelector('#bulkDelete');
    if (bulkApproveBtn) bulkApproveBtn.disabled = !anyChecked;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = !anyChecked;
  };

  // Checkbox change listener
  if (!vendorsList._checkboxListenerAdded) {
    vendorsList._checkboxListenerAdded = true;
    vendorsList.addEventListener('change', (e) => {
      if (e.target?.classList?.contains('vendor-select')) {
        updateBulkState();
      }
    });
  }

  // Select all
  const selectAll = root.querySelector('#vendorSelectAll');
  if (selectAll && !selectAll._listenerAdded) {
    selectAll._listenerAdded = true;
    selectAll.addEventListener('change', () => {
      vendorsList.querySelectorAll('.vendor-select').forEach(cb => {
        cb.checked = selectAll.checked;
      });
      updateBulkState();
    });
  }

  // Bulk actions
  const performBulk = async (action) => {
    const checked = Array.from(vendorsList.querySelectorAll('.vendor-select:checked'));
    if (checked.length === 0) return;
    
    const ids = checked.map(cb => cb.getAttribute('data-vendor-id'));
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();
    
    if (action === 'approve') {
      const confirmed = await ConfirmDialog('Approve Vendors', `Approve ${ids.length} vendor(s)?`, { confirmText: 'Approve' });
      if (!confirmed) return;
      
      for (const id of ids) {
        try {
          await fsm.updateDoc(fsm.doc(db, 'vendors', id), { approved: true });
        } catch {}
      }
      await AlertDialog('Vendors Approved', `Successfully approved ${ids.length} vendor(s).`, { type: 'success' });
    } else if (action === 'delete') {
      const confirmed = await ConfirmDialog('Delete Vendors', `Delete ${ids.length} vendor(s)? This cannot be undone.`, { danger: true, confirmText: 'Delete' });
      if (!confirmed) return;
      
      for (const id of ids) {
        try {
          await fsm.deleteDoc(fsm.doc(db, 'vendors', id));
        } catch {}
      }
      await AlertDialog('Vendors Deleted', `Successfully deleted ${ids.length} vendor(s).`, { type: 'success' });
    }
    reloadVendors();
  };

  // Bulk buttons
  const bulkApproveBtn = root.querySelector('#bulkApprove');
  const bulkDeleteBtn = root.querySelector('#bulkDelete');
  if (bulkApproveBtn && !bulkApproveBtn._listenerAdded) {
    bulkApproveBtn._listenerAdded = true;
    bulkApproveBtn.addEventListener('click', () => performBulk('approve'));
  }
  if (bulkDeleteBtn && !bulkDeleteBtn._listenerAdded) {
    bulkDeleteBtn._listenerAdded = true;
    bulkDeleteBtn.addEventListener('click', () => performBulk('delete'));
  }

  // Filter listener
  const vendorFilter = root.querySelector('#vendorFilter');
  if (vendorFilter && !vendorFilter._listenerAdded) {
    vendorFilter._listenerAdded = true;
    vendorFilter.addEventListener('change', reloadVendors);
  }

  // Search input listener with debounce
  const searchInput = root.querySelector('#vendorSearch');
  if (searchInput && !searchInput._listenerAdded) {
    searchInput._listenerAdded = true;
    const debouncedSearch = debounce(reloadVendors, 200);
    searchInput.addEventListener('input', debouncedSearch);
  }

  // Sort listener
  const sortSelect = root.querySelector('#vendorSort');
  if (sortSelect && !sortSelect._listenerAdded) {
    sortSelect._listenerAdded = true;
    sortSelect.addEventListener('change', reloadVendors);
  }

  // Event delegation for vendor row actions
  if (vendorsList._actionListenerAdded) {
    console.log('[AdminVendors] Action listener already attached, skipping');
    return;
  }
  vendorsList._actionListenerAdded = true;
  console.log('[AdminVendors] Attaching click listener for vendor actions');
  
  vendorsList.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    
    const action = el.getAttribute('data-action');
    const vendorId = el.getAttribute('data-vendor-id');
    const vendorName = el.getAttribute('data-vendor-name') || '';
    const vendorEmail = el.getAttribute('data-vendor-email') || '';
    
    setButtonLoading(el, true, action === 'approve' ? 'Approving...' : action === 'delete' ? 'Deleting...' : 'Loading...');
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      
      if (action === 'view' || action === 'edit') {
        setButtonLoading(el, false);
        const snap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
        if (snap.exists()) {
          showVendorModal(vendorId, snap.data(), action === 'edit');
        }
      } else if (action === 'approve') {
        const vendorSnap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
        const vendorData = vendorSnap.exists() ? vendorSnap.data() : {};
        
        await fsm.updateDoc(fsm.doc(db, 'vendors', vendorId), { approved: true });
        
        // Best-effort role update
        if (vendorEmail) {
          const q = fsm.query(fsm.collection(db, 'attendees'), fsm.where('email', '==', vendorEmail));
          const asnap = await fsm.getDocs(q);
          if (!asnap.empty) {
            await fsm.updateDoc(asnap.docs[0].ref, { role: 'vendor' }).catch(() => {});
          }
          
          // Send approval email (non-blocking)
          sendVendorApprovalEmail(vendorEmail, {
            businessName: vendorData.companyName || vendorName,
            boothNumber: vendorData.boothNumber,
            category: vendorData.category
          }).catch(err => console.warn('Email send failed:', err));
        }
        
        Toast('Vendor approved successfully!');
        reloadVendors();
      } else if (action === 'pay') {
        setButtonLoading(el, false);
        showPaymentModal(vendorId, vendorName, vendorEmail);
      } else if (action === 'delete') {
        setButtonLoading(el, false);
        const confirmed = await ConfirmDialog('Delete Vendor', 'Are you sure you want to delete this vendor? This action cannot be undone.', { danger: true, confirmText: 'Delete' });
        if (!confirmed) return;
        
        setButtonLoading(el, true, 'Deleting...');
        await fsm.deleteDoc(fsm.doc(db, 'vendors', vendorId));
        Toast('Vendor deleted successfully');
        reloadVendors();
      }
    } catch (err) {
      console.error('[AdminVendors] Vendor action failed:', err);
      setButtonLoading(el, false);
      await AlertDialog('Action Failed', 'Something went wrong. Check console for details.', { type: 'error' });
    }
  });
}

/**
 * Get the last loaded vendors for export
 */
export function getLastVendors() {
  return lastVendors;
}
