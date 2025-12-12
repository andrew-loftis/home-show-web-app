import { getState } from "../store.js";
import { SkeletonStats, SkeletonTableRows, EmptyAdminSection } from "../utils/skeleton.js";
import { renderAnalyticsDashboard, initAnalyticsCharts } from "../utils/analytics.js";
import { sendVendorApprovalEmail, sendVendorRejectionEmail } from "../utils/email.js";
import { ConfirmDialog, AlertDialog, Toast } from "../utils/ui.js";

export default function AdminDashboard(root) {
  const state = getState();
  
  if (!state.isAdmin) {
    root.innerHTML = `
      <div class="glass-container p-8 text-center">
        <div class="text-red-400 mb-4">
          <ion-icon name="warning-outline" class="text-4xl"></ion-icon>
        </div>
        <h2 class="text-2xl font-bold text-glass mb-4">Access Denied</h2>
        <p class="text-glass-secondary">Admin access required.</p>
      </div>
    `;
    return;
  }

  let activeTab = 'overview';
  // Keep last displayed datasets for CSV export
  let lastVendors = [];
  let lastUsers = [];
  let lastPayments = [];

  function exportCsv(filename, rows) {
    if (!rows || rows.length === 0) {
      Toast('No data to export');
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

  function render() {
    root.innerHTML = `
      <div class="glass-container">
        <!-- Header -->
        <div class="p-4 md:p-6 border-b border-glass-border">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold text-glass flex items-center gap-3">
                <ion-icon name="settings-outline" class="text-brand"></ion-icon>
                Admin Dashboard
              </h1>
              <p class="text-glass-secondary mt-1 text-sm">Complete system management</p>
            </div>
            <div class="text-xs text-glass-secondary bg-glass-surface/30 px-3 py-2 rounded-lg">
              <span class="text-brand">${state.user?.email}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs - Scrollable on mobile -->
        <div class="admin-tabs border-b border-glass-border bg-glass-surface/20">
          <button class="tab-btn ${activeTab === 'overview' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="overview">
            <ion-icon name="stats-chart-outline"></ion-icon>
            <span>Overview</span>
          </button>
          <button class="tab-btn ${activeTab === 'analytics' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="analytics">
            <ion-icon name="bar-chart-outline"></ion-icon>
            <span>Analytics</span>
          </button>
          <button class="tab-btn ${activeTab === 'vendors' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="vendors">
            <ion-icon name="storefront-outline"></ion-icon>
            <span>Vendors</span>
          </button>
          <button class="tab-btn ${activeTab === 'users' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="users">
            <ion-icon name="people-outline"></ion-icon>
            <span>Users</span>
          </button>
          <button class="tab-btn ${activeTab === 'booths' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="booths">
            <ion-icon name="grid-outline"></ion-icon>
            <span>Booths</span>
          </button>
          <button class="tab-btn ${activeTab === 'payments' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="payments">
            <ion-icon name="card-outline"></ion-icon>
            <span>Payments</span>
          </button>
          <button class="tab-btn ${activeTab === 'admins' ? 'bg-brand/20 text-brand border border-brand/30' : 'text-glass-secondary hover:text-glass hover:bg-white/5'}" data-tab="admins">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <span>Admins</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-4 md:p-6">
          <div id="tabContent">
            ${renderTabContent()}
          </div>
        </div>
      </div>
    `;

    // Wire up tab navigation
    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        render();
        initializeTab();
      };
    });

    initializeTab();
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return `
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-glass">System Overview</h2>
            <div id="statsContainer">
              ${SkeletonStats()}
            </div>
          </div>
        `;
      case 'analytics':
        return renderAnalyticsDashboard();
      case 'vendors':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">Vendor Management</h2>
              <div class="flex items-center gap-4">
                <div class="hidden md:flex items-center gap-2">
                  <label class="text-glass-secondary text-sm">Search:</label>
                  <input id="vendorSearch" type="search" placeholder="Name, email, category..." class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm w-64" />
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-glass-secondary text-sm">Filter:</label>
                  <select id="vendorFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm" onchange="filterVendors()">
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
                <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadVendors()">Refresh</button>
                <button id="exportVendors" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
              </div>
            </div>
            <div class="glass-card p-3 flex items-center justify-between gap-3">
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
              <div class="flex items-center gap-6 text-sm">
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
          </div>
        `;
      case 'users':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">User Management</h2>
              <div class="flex items-center gap-3">
                <div class="hidden md:flex items-center gap-2">
                  <label class="text-glass-secondary text-sm">Search:</label>
                  <input id="userSearch" type="search" placeholder="Name or email..." class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm w-64" />
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-glass-secondary text-sm">Role:</label>
                  <select id="userRoleFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
                    <option value="all">All</option>
                    <option value="attendee">Attendee</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin (flag)</option>
                  </select>
                </div>
                <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadUsers()">Refresh</button>
                <button id="exportUsers" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
              </div>
            </div>
            <div id="usersList">Loading users...</div>
          </div>
        `;
      case 'booths':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">Booth Management</h2>
              <div class="flex gap-2">
                <button class="bg-blue-600 px-4 py-2 rounded text-white" id="generateStockBtn">Generate Stock</button>
                <button class="bg-red-600 px-4 py-2 rounded text-white" id="deleteAllBoothsBtn">Delete All</button>
                <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadBooths()">Refresh</button>
              </div>
            </div>
            <div id="boothsList">Loading booths...</div>
          </div>
        `;
      case 'payments':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">Payment Management</h2>
              <div class="flex gap-2">
                <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadPayments()">Refresh</button>
                <button id="exportPayments" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
              </div>
            </div>
            <div id="paymentsList">Loading payments...</div>
          </div>
        `;
      case 'admins':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">Admin Access</h2>
              <button class="bg-brand px-4 py-2 rounded text-white" id="refreshAdminsBtn">Refresh</button>
            </div>
            <div class="glass-card p-4">
              <form id="addAdminForm" class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div class="flex-1 w-full">
                  <label class="block text-glass-secondary text-sm mb-1">Admin email</label>
                  <input type="email" id="newAdminEmail" required placeholder="name@example.com"
                         class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" />
                </div>
                <button type="submit" class="px-4 py-2 bg-green-600 rounded text-white whitespace-nowrap">
                  <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Add admin
                </button>
              </form>
            </div>
            <div id="adminsList" class="space-y-3">Loading admins...</div>
            <p class="text-xs text-glass-secondary">Admins are resolved by email. A document in <code>adminEmails/{email}</code> grants admin privileges.</p>
          </div>
        `;
      default:
        return '<div class="text-center text-glass-secondary">Select a tab</div>';
    }
  }

  async function initializeTab() {
    switch (activeTab) {
      case 'overview':
        await loadOverview();
        break;
      case 'analytics':
        await loadAnalytics();
        break;
      case 'vendors':
        await loadVendors();
        break;
      case 'users':
        await loadUsers();
        break;
      case 'booths':
        await loadBooths();
        setupBoothButtons();
        break;
      case 'payments':
        await loadPayments();
        break;
      case 'admins':
        await loadAdmins();
        break;
    }
  }

  async function loadAnalytics() {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      // Fetch all data needed for analytics
      const [vendorsSnap, attendeesSnap, leadsSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'attendees')),
        getDocs(collection(db, 'leads'))
      ]);

      const vendors = [];
      vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));
      
      const attendees = [];
      attendeesSnap.forEach(doc => attendees.push({ id: doc.id, ...doc.data() }));
      
      const leads = [];
      leadsSnap.forEach(doc => leads.push({ id: doc.id, ...doc.data() }));

      // Initialize charts with data
      await initAnalyticsCharts({
        vendors,
        attendees,
        leads,
        payments: vendors // Use vendors for payment data
      });

      // Wire up refresh button
      const refreshBtn = root.querySelector('#refreshAnalytics');
      if (refreshBtn) {
        refreshBtn.onclick = () => loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  async function loadAdmins() {
    const listEl = root.querySelector('#adminsList');
    const refreshBtn = root.querySelector('#refreshAdminsBtn');
    const form = root.querySelector('#addAdminForm');
    if (!listEl) return;

    // Wire up refresh
    if (refreshBtn) refreshBtn.onclick = () => loadAdmins();

    // Wire up add form
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = root.querySelector('#newAdminEmail');
        const email = String(emailInput?.value || '').trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          Toast('Please enter a valid email address');
          return;
        }
        try {
          const { addAdminEmail } = await import('../firebase.js');
          const ok = await addAdminEmail(email, state.user?.uid || null);
          if (ok) {
            emailInput.value = '';
            await loadAdmins();
            Toast(`Added admin: ${email}`);
          } else {
            await AlertDialog('Failed', 'Failed to add admin', { type: 'error' });
          }
        } catch (err) {
          console.error('Add admin failed', err);
          await AlertDialog('Failed', 'Failed to add admin', { type: 'error' });
        }
      };
    }

    try {
      const { listAdminEmails, removeAdminEmail } = await import('../firebase.js');
      const rows = await listAdminEmails();
      if (!rows || rows.length === 0) {
        listEl.innerHTML = `
          <div class="glass-card p-6 text-center text-glass-secondary">
            <ion-icon name="information-circle-outline" class="text-2xl mb-2"></ion-icon>
            <p>No admin emails found yet. Add your first admin above.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = rows.map(r => `
        <div class="glass-card p-4 flex items-center justify-between">
          <div>
            <div class="text-glass font-medium">${r.id}</div>
            ${r.addedAt ? `<div class="text-xs text-glass-secondary">Added: ${new Date(r.addedAt.seconds*1000).toLocaleString()}</div>` : ''}
          </div>
          <button class="px-3 py-1 bg-red-600 rounded text-white text-sm remove-admin-btn" data-email="${r.id}">
            <ion-icon name="trash-outline" class="mr-1"></ion-icon>Remove
          </button>
        </div>
      `).join('');

      // Attach remove listeners
      listEl.querySelectorAll('.remove-admin-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const email = btn.getAttribute('data-email');
          const confirmed = await ConfirmDialog('Remove Admin', `Remove admin access for: ${email}?`, { danger: true, confirmText: 'Remove' });
          if (!confirmed) return;
          try {
            const ok = await removeAdminEmail(email);
            if (ok) {
              await loadAdmins();
              Toast(`Removed admin: ${email}`);
            } else {
              await AlertDialog('Failed', 'Failed to remove admin', { type: 'error' });
            }
          } catch (err) {
            console.error('Remove admin failed', err);
            await AlertDialog('Failed', 'Failed to remove admin', { type: 'error' });
          }
        });
      });
    } catch (err) {
      console.error('Load admins failed', err);
      listEl.innerHTML = '<div class="text-red-400">Failed to load admin list</div>';
    }
  }

  async function loadOverview() {
    const statsContainer = root.querySelector('#statsContainer');
    
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      // Load all collections
      const [vendorsSnap, attendeesSnap, boothsSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'attendees')),
        getDocs(collection(db, 'boothLayout'))
      ]);

      const totalVendors = vendorsSnap.size;
      const totalUsers = attendeesSnap.size + vendorsSnap.size;
      const totalBooths = boothsSnap.size;
      
      let totalRevenue = 0;
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        if (data.totalPrice) totalRevenue += data.totalPrice;
      });

      // Render actual stats (replacing skeleton)
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="glass-card p-6 text-center">
              <div class="text-3xl text-brand mb-2">
                <ion-icon name="people-outline"></ion-icon>
              </div>
              <div class="text-2xl font-bold text-glass">${totalUsers}</div>
              <div class="text-glass-secondary">Total Users</div>
            </div>
            <div class="glass-card p-6 text-center">
              <div class="text-3xl text-green-400 mb-2">
                <ion-icon name="storefront-outline"></ion-icon>
              </div>
              <div class="text-2xl font-bold text-glass">${totalVendors}</div>
              <div class="text-glass-secondary">Vendors</div>
            </div>
            <div class="glass-card p-6 text-center">
              <div class="text-3xl text-blue-400 mb-2">
                <ion-icon name="grid-outline"></ion-icon>
              </div>
              <div class="text-2xl font-bold text-glass">${totalBooths}</div>
              <div class="text-glass-secondary">Booths</div>
            </div>
            <div class="glass-card p-6 text-center">
              <div class="text-3xl text-yellow-400 mb-2">
                <ion-icon name="card-outline"></ion-icon>
              </div>
              <div class="text-2xl font-bold text-glass">$${totalRevenue.toLocaleString()}</div>
              <div class="text-glass-secondary">Revenue</div>
            </div>
          </div>
        `;
      }

    } catch (error) {
      console.error('Failed to load overview:', error);
      if (statsContainer) {
        statsContainer.innerHTML = '<div class="text-red-400 text-center p-4">Failed to load stats</div>';
      }
    }
  }

  async function loadVendors(filterType = 'all', searchTerm = '', sortBy = 'default') {
    const vendorsList = root.querySelector('#vendorsList');
    if (!vendorsList) return;
    
    // Show skeleton while loading
    vendorsList.innerHTML = SkeletonTableRows(5);

    try {
      console.log('[Admin] Loading vendors...');
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      console.log('[Admin] Vendors loaded:', vendorsSnap.size);
      let vendors = [];
      vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));

      // Apply filter
      if (filterType !== 'all') {
        vendors = vendors.filter(vendor => {
          switch (filterType) {
            case 'approved':
              return vendor.approved === true;
            case 'pending':
              return vendor.approved !== true;
            case 'paid':
              return vendor.paymentStatus === 'paid';
            case 'payment_sent':
              return vendor.paymentStatus === 'payment_sent';
            case 'payment_pending':
              return vendor.approved === true && (!vendor.paymentStatus || vendor.paymentStatus === 'pending');
            default:
              return true;
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
        if (v.approved) return 2; // pending payment
        return 3; // awaiting approval
      };
      if (sortMode === 'name_az') {
        vendors.sort((a,b) => String(a.name||'').localeCompare(String(b.name||'')));
      } else if (sortMode === 'total_desc') {
        vendors.sort((a,b) => (b.totalPrice||0) - (a.totalPrice||0));
      } else if (sortMode === 'status') {
        vendors.sort((a,b) => statusRank(a) - statusRank(b));
      }

      // Function to get payment status display and styling
      const getPaymentStatusInfo = (vendor) => {
        if (vendor.paymentStatus === 'paid') {
          return {
            color: 'bg-green-500/10 border-green-500/30',
            status: '💰 Paid',
            statusColor: 'text-green-400'
          };
        } else if (vendor.paymentStatus === 'payment_sent') {
          return {
            color: 'bg-yellow-500/10 border-yellow-500/30',
            status: '📧 Payment Sent',
            statusColor: 'text-yellow-400'
          };
        } else if (vendor.approved) {
          return {
            color: 'bg-red-500/10 border-red-500/30',
            status: '⏳ Payment Pending',
            statusColor: 'text-red-400'
          };
        } else {
          return {
            color: 'bg-glass-surface border-glass-border',
            status: '⏳ Awaiting Approval',
            statusColor: 'text-glass-secondary'
          };
        }
      };

      // Store for export
      lastVendors = vendors.map(v => ({
        id: v.id,
        name: v.name || '',
        contactEmail: v.contactEmail || '',
        phone: v.phone || '',
        category: v.category || '',
        approved: !!v.approved,
        paymentStatus: v.paymentStatus || '',
        totalPrice: v.totalPrice || 0,
        booths: (v.booths||[]).join(' '),
        stripeInvoiceId: v.stripeInvoiceId || '',
        stripeInvoiceUrl: v.stripeInvoiceUrl || '',
        lastPaymentSent: v.lastPaymentSent || ''
      }));

      vendorsList.innerHTML = `
        <div class="space-y-4">
          ${vendors.length === 0 ? `
            <div class="glass-card p-8 text-center">
              <div class="text-glass-secondary">
                <ion-icon name="search-outline" class="text-2xl mb-2"></ion-icon>
                <p>No vendors match the selected filter</p>
              </div>
            </div>
          ` : vendors.map(vendor => {
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
                  <div class="flex items-center gap-4 mt-2">
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
                    <ion-icon name="eye-outline" class="mr-1"></ion-icon>View Profile
                  </button>
                  <button class="bg-purple-600 px-3 py-1 rounded text-white text-sm" data-action="edit" data-vendor-id="${vendor.id}">
                    <ion-icon name="create-outline" class="mr-1"></ion-icon>Edit
                  </button>
                  ${vendor.approved ? `<button class="bg-orange-600 px-3 py-1 rounded text-white text-sm" data-action="pay" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}">
                    <ion-icon name="card-outline" class="mr-1"></ion-icon>Send Payment
                  </button>` : ''}
                  ${vendor.stripeInvoiceUrl ? `<a href="${vendor.stripeInvoiceUrl}" target="_blank" rel="noopener" class="text-center px-3 py-1 bg-orange-700 rounded text-white text-sm">
                    <ion-icon name="open-outline" class="mr-1"></ion-icon>Open Invoice
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

  // Export CSV button
  const exportBtn = root.querySelector('#exportVendors');
  if (exportBtn) exportBtn.onclick = () => exportCsv(`vendors_${new Date().toISOString().slice(0,10)}.csv`, lastVendors);

      // Enable/disable bulk buttons based on selection
      const updateBulkState = () => {
        const anyChecked = root.querySelectorAll('.vendor-select:checked').length > 0;
        const bulkApproveBtn = root.querySelector('#bulkApprove');
        const bulkDeleteBtn = root.querySelector('#bulkDelete');
        if (bulkApproveBtn) bulkApproveBtn.disabled = !anyChecked;
        if (bulkDeleteBtn) bulkDeleteBtn.disabled = !anyChecked;
      };
      vendorsList.addEventListener('change', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('vendor-select')) {
          updateBulkState();
        }
      });

      // Select all
      const selectAll = root.querySelector('#vendorSelectAll');
      if (selectAll) {
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
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        if (action === 'approve') {
          const confirmed = await ConfirmDialog('Approve Vendors', `Approve ${ids.length} vendor(s)?`, { confirmText: 'Approve' });
          if (!confirmed) return;
          for (const id of ids) {
            try {
              await fsm.updateDoc(fsm.doc(db, 'vendors', id), { approved: true });
            } catch {}
          }
          // Optional: attempt role update for attendees by email (best-effort)
          try {
            const snap = await fsm.getDocs(fsm.collection(db, 'vendors'));
            const emailById = {};
            snap.forEach(d => { if (ids.includes(d.id)) emailById[d.id] = (d.data().contactEmail||''); });
            for (const id of ids) {
              const email = String(emailById[id]||'').trim();
              if (!email) continue;
              const q = fsm.query(fsm.collection(db, 'attendees'), fsm.where('email','==', email));
              const asnap = await fsm.getDocs(q);
              if (!asnap.empty) {
                await fsm.updateDoc(asnap.docs[0].ref, { role: 'vendor' }).catch(()=>{});
              }
            }
          } catch {}
          await AlertDialog('Vendors Approved', `Successfully approved ${ids.length} vendor(s).`, { type: 'success' });
        } else if (action === 'delete') {
          const confirmed = await ConfirmDialog('Delete Vendors', `Delete ${ids.length} vendor(s)? This cannot be undone.`, { danger: true, confirmText: 'Delete' });
          if (!confirmed) return;
          for (const id of ids) {
            try { await fsm.deleteDoc(fsm.doc(db, 'vendors', id)); } catch {}
          }
          await AlertDialog('Vendors Deleted', `Successfully deleted ${ids.length} vendor(s).`, { type: 'success' });
        }
        await loadVendors();
      };
      const bulkApproveBtn = root.querySelector('#bulkApprove');
      const bulkDeleteBtn = root.querySelector('#bulkDelete');
      if (bulkApproveBtn) bulkApproveBtn.addEventListener('click', () => performBulk('approve'));
      if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', () => performBulk('delete'));

      // Set up the filter event listener
      const vendorFilter = root.querySelector('#vendorFilter');
      if (vendorFilter) {
        vendorFilter.addEventListener('change', (e) => {
          const search = root.querySelector('#vendorSearch')?.value || '';
          const sort = root.querySelector('#vendorSort')?.value || 'default';
          loadVendors(e.target.value, search, sort);
        });
      }

      // Search input listener with simple debounce
      const searchInput = root.querySelector('#vendorSearch');
      if (searchInput) {
        let t;
        searchInput.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => {
            const currentFilter = root.querySelector('#vendorFilter')?.value || 'all';
            const sort = root.querySelector('#vendorSort')?.value || 'default';
            loadVendors(currentFilter, searchInput.value, sort);
          }, 200);
        });
      }

      // Sort listener - only add once
      const sortSelect = root.querySelector('#vendorSort');
      if (sortSelect && !sortSelect._listenerAdded) {
        sortSelect._listenerAdded = true;
        sortSelect.addEventListener('change', () => {
          const currentFilter = root.querySelector('#vendorFilter')?.value || 'all';
          const search = root.querySelector('#vendorSearch')?.value || '';
          loadVendors(currentFilter, search, sortSelect.value);
        });
      }

      // Event delegation for vendor row actions - only add once
      if (vendorsList._listenerAdded) {
        console.log('[Admin] Click listener already attached, skipping');
        return; // Exit early since listener is already set up
      }
      vendorsList._listenerAdded = true;
      console.log('[Admin] Attaching click listener for vendor actions');
      vendorsList.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.getAttribute('data-action');
        const vendorId = el.getAttribute('data-vendor-id');
        const vendorName = el.getAttribute('data-vendor-name') || '';
        const vendorEmail = el.getAttribute('data-vendor-email') || '';
        try {
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          if (action === 'view' || action === 'edit') {
            const snap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
            if (snap.exists()) {
              showVendorProfileModal(vendorId, snap.data(), action === 'edit');
            }
          } else if (action === 'approve') {
            // Get vendor data first for email
            const vendorSnap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
            const vendorData = vendorSnap.exists() ? vendorSnap.data() : {};
            
            await fsm.updateDoc(fsm.doc(db, 'vendors', vendorId), { approved: true });
            // best-effort role update
            if (vendorEmail) {
              const q = fsm.query(fsm.collection(db, 'attendees'), fsm.where('email','==', vendorEmail));
              const asnap = await fsm.getDocs(q);
              if (!asnap.empty) { await fsm.updateDoc(asnap.docs[0].ref, { role: 'vendor' }).catch(()=>{}); }
              
              // Send approval email (non-blocking)
              sendVendorApprovalEmail(vendorEmail, {
                businessName: vendorData.companyName || vendorName,
                boothNumber: vendorData.boothNumber,
                category: vendorData.category
              }).catch(err => console.warn('Email send failed:', err));
            }
            Toast('Vendor approved successfully!');
            await loadVendors();
          } else if (action === 'pay') {
            await showStripePaymentModal(vendorId, vendorName, vendorEmail);
          } else if (action === 'delete') {
            const confirmed = await ConfirmDialog('Delete Vendor', 'Are you sure you want to delete this vendor? This action cannot be undone.', { danger: true, confirmText: 'Delete' });
            if (!confirmed) return;
            await fsm.deleteDoc(fsm.doc(db, 'vendors', vendorId));
            Toast('Vendor deleted successfully');
            await loadVendors();
          }
        } catch (err) {
          console.error('Vendor action failed', err);
          await AlertDialog('Action Failed', 'Something went wrong. Check console for details.', { type: 'error' });
        }
      });

    } catch (error) {
      console.error('Failed to load vendors:', error);
      vendorsList.innerHTML = '<div class="text-red-400">Failed to load vendors</div>';
    }
  }

  async function loadUsers() {
    const usersList = root.querySelector('#usersList');
    if (!usersList) return;

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const [attendeesSnap, adminsSnap] = await Promise.all([
        fsm.getDocs(fsm.collection(db, 'attendees')),
        fsm.getDocs(fsm.collection(db, 'adminEmails'))
      ]);
      const adminSet = new Set();
      adminsSnap.forEach(d => adminSet.add(String(d.id).toLowerCase()));

      let users = [];
      attendeesSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

      // Apply filters
      const q = String(root.querySelector('#userSearch')?.value || '').trim().toLowerCase();
      const roleFilter = root.querySelector('#userRoleFilter')?.value || 'all';
      if (q) {
        users = users.filter(u => [u.name, u.email].some(x => String(x||'').toLowerCase().includes(q)));
      }
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin') {
          users = users.filter(u => adminSet.has(String(u.email||'').toLowerCase()))
        } else {
          users = users.filter(u => (u.role || 'attendee') === roleFilter);
        }
      }

      // Store for export
      lastUsers = users.map(u => ({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'attendee',
        isAdmin: adminSet.has(String(u.email||'').toLowerCase()),
        ownerUid: u.ownerUid || '',
        createdAt: u.createdAt && u.createdAt.seconds ? new Date(u.createdAt.seconds*1000).toISOString() : '',
        updatedAt: u.updatedAt && u.updatedAt.seconds ? new Date(u.updatedAt.seconds*1000).toISOString() : ''
      }));

      usersList.innerHTML = `
        <div class="space-y-4">
          ${users.map(user => `
            <div class="glass-card p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-glass">${user.name || 'Unnamed User'}</h3>
                  <p class="text-glass-secondary">${user.email}</p>
                  <div class="flex items-center gap-3 mt-2">
                    <span class="text-sm text-glass-secondary">Role:</span>
                    <select class="bg-glass-surface border border-glass-border rounded px-2 py-1 text-glass text-sm user-role-select" 
                            data-user-id="${user.id}">
                      <option value="attendee" ${(!user.role || user.role === 'attendee') ? 'selected' : ''}>Attendee</option>
                      <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>Vendor</option>
                      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <span class="inline-flex items-center gap-2 text-xs ${adminSet.has(String(user.email||'').toLowerCase()) ? 'text-green-400' : 'text-glass-secondary'}">
                      <ion-icon name="shield-checkmark-outline"></ion-icon>
                      ${adminSet.has(String(user.email||'').toLowerCase()) ? 'Admin access' : 'Not admin'}
                    </span>
                  </div>
                  ${user.ownerUid ? `<p class="text-xs text-glass-secondary mt-1">UID: ${user.ownerUid}</p>` : ''}
                </div>
                <div class="flex flex-col gap-2">
                  <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" data-action="user-view" data-user-id="${user.id}">
                    <ion-icon name="eye-outline" class="mr-1"></ion-icon>View Profile
                  </button>
                  <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" data-action="user-delete" data-user-id="${user.id}">
                    <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                  </button>
                  ${user.email ? `
                    ${adminSet.has(String(user.email).toLowerCase())
                      ? `<button class="px-3 py-1 bg-orange-700 rounded text-white text-sm" data-action="admin-revoke" data-admin-email="${String(user.email).toLowerCase()}">
                          <ion-icon name="remove-circle-outline" class="mr-1"></ion-icon>Revoke Admin
                        </button>`
                      : `<button class="px-3 py-1 bg-green-700 rounded text-white text-sm" data-action="admin-grant" data-admin-email="${String(user.email).toLowerCase()}">
                          <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Grant Admin
                        </button>`}
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

  // Export CSV button
  const exportBtn = root.querySelector('#exportUsers');
  if (exportBtn) exportBtn.onclick = () => exportCsv(`users_${new Date().toISOString().slice(0,10)}.csv`, lastUsers);

      // Delegated events for users list - only add once
      if (usersList._listenerAdded) {
        console.log('[Admin] Users list listener already attached, skipping');
        return;
      }
      usersList._listenerAdded = true;
      console.log('[Admin] Attaching listeners for users list');
      usersList.addEventListener('change', async (e) => {
        const sel = e.target.closest('.user-role-select');
        if (!sel) return;
        const userId = sel.getAttribute('data-user-id');
        const newRole = sel.value;
        try {
          const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          await fsm.updateDoc(fsm.doc(db, 'attendees', userId), { role: newRole });
          const originalBg = sel.style.backgroundColor;
          sel.style.backgroundColor = '#10b981';
          setTimeout(() => { sel.style.backgroundColor = originalBg; }, 600);
        } catch (error) {
          console.error('Failed to update user role:', error);
          Toast('Failed to update user role');
          await loadUsers();
        }
      });

      usersList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        try {
          const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          if (action === 'user-view') {
            const userId = btn.getAttribute('data-user-id');
            const userDoc = await fsm.getDoc(fsm.doc(db, 'attendees', userId));
            if (userDoc.exists()) showUserProfileModal(userId, userDoc.data());
          } else if (action === 'user-delete') {
            const userId = btn.getAttribute('data-user-id');
            const confirmed = await ConfirmDialog('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', { danger: true, confirmText: 'Delete' });
            if (!confirmed) return;
            await fsm.deleteDoc(fsm.doc(db, 'attendees', userId));
            Toast('User deleted successfully');
            await loadUsers();
          } else if (action === 'admin-grant' || action === 'admin-revoke') {
            const email = btn.getAttribute('data-admin-email');
            const { addAdminEmail, removeAdminEmail } = await import('../firebase.js');
            const ok = action === 'admin-grant' ? await addAdminEmail(email, state.user?.uid||null) : await removeAdminEmail(email);
            if (ok) {
              Toast(action === 'admin-grant' ? 'Admin access granted' : 'Admin access revoked');
              await loadUsers();
            } else {
              await AlertDialog('Failed', 'Failed to update admin access', { type: 'error' });
            }
          }
        } catch (err) {
          console.error('User action failed', err);
          await AlertDialog('Action Failed', 'Something went wrong. Check console for details.', { type: 'error' });
        }
      });

      // Hook up search/filter controls
      const searchEl = root.querySelector('#userSearch');
      if (searchEl) {
        let t;
        searchEl.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(loadUsers, 200);
        });
      }
      const roleFilterEl = root.querySelector('#userRoleFilter');
      if (roleFilterEl) roleFilterEl.addEventListener('change', () => loadUsers());

    } catch (error) {
      console.error('Failed to load users:', error);
      usersList.innerHTML = '<div class="text-red-400">Failed to load users</div>';
    }
  }

  async function loadBooths() {
    const boothsList = root.querySelector('#boothsList');
    if (!boothsList) return;

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const boothsSnap = await getDocs(collection(db, 'boothLayout'));
      const booths = [];
      boothsSnap.forEach(doc => booths.push({ id: doc.id, ...doc.data() }));

      booths.sort((a, b) => a.displayNumber - b.displayNumber);

      boothsList.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${booths.map(booth => `
            <div class="glass-card p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-glass">Booth #${booth.displayNumber}</h3>
                  <p class="text-glass-secondary">${booth.type} - ${booth.size}</p>
                  <p class="text-sm text-glass-secondary">$${booth.price}</p>
                </div>
                <div class="text-right">
                  <div class="w-3 h-3 rounded-full ${booth.available ? 'bg-green-400' : 'bg-red-400'}"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

    } catch (error) {
      console.error('Failed to load booths:', error);
      boothsList.innerHTML = '<div class="text-red-400">Failed to load booths</div>';
    }
  }

  function setupBoothButtons() {
    const generateStockBtn = root.querySelector('#generateStockBtn');
    const deleteAllBoothsBtn = root.querySelector('#deleteAllBoothsBtn');

    if (generateStockBtn) {
      generateStockBtn.onclick = async () => {
        const confirmed = await ConfirmDialog('Generate Booths', 'Generate booth stock? This will create 66 indoor + 31 outdoor booths.', { confirmText: 'Generate' });
        if (!confirmed) return;

        try {
          const original = generateStockBtn.innerHTML; generateStockBtn.disabled = true; generateStockBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Generating...';
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, doc, writeBatch, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const batch = writeBatch(db);

          // Clear existing booths
          const existingBooths = await getDocs(collection(db, 'boothLayout'));
          existingBooths.forEach(d => batch.delete(d.ref));

          // Generate 66 indoor booths
          for (let i = 1; i <= 66; i++) {
            const docRef = doc(collection(db, 'boothLayout'));
            batch.set(docRef, {
              displayNumber: i,
              type: 'indoor',
              size: '8ft x 8ft',
              price: 250,
              available: true
            });
          }

          // Generate 31 outdoor booths
          for (let i = 1; i <= 31; i++) {
            const docRef = doc(collection(db, 'boothLayout'));
            batch.set(docRef, {
              displayNumber: i + 100,
              type: 'outdoor',
              size: '10ft x 10ft',
              price: 200,
              available: true
            });
          }

          await batch.commit();
          await AlertDialog('Success', 'Booth stock generated successfully!', { type: 'success' });
          await loadBooths();

        } catch (error) {
          console.error('Failed to generate booths:', error);
          await AlertDialog('Failed', 'Failed to generate booth stock', { type: 'error' });
        } finally {
          generateStockBtn.disabled = false; generateStockBtn.innerHTML = 'Generate Stock';
        }
      };
    }

    if (deleteAllBoothsBtn) {
      deleteAllBoothsBtn.onclick = async () => {
        const confirmed = await ConfirmDialog('Delete All Booths', 'Delete ALL booths? This action cannot be undone!', { danger: true, confirmText: 'Delete All' });
        if (!confirmed) return;

        try {
          const original = deleteAllBoothsBtn.innerHTML; deleteAllBoothsBtn.disabled = true; deleteAllBoothsBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Deleting...';
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const batch = writeBatch(db);
          const boothsSnap = await getDocs(collection(db, 'boothLayout'));
          boothsSnap.forEach(doc => batch.delete(doc.ref));
          
          await batch.commit();
          await AlertDialog('Success', 'All booths deleted successfully!', { type: 'success' });
          await loadBooths();

        } catch (error) {
          console.error('Failed to delete booths:', error);
          await AlertDialog('Failed', 'Failed to delete booths', { type: 'error' });
        } finally {
          deleteAllBoothsBtn.disabled = false; deleteAllBoothsBtn.innerHTML = 'Delete All';
        }
      };
    }
  }

  async function loadPayments() {
    const paymentsList = root.querySelector('#paymentsList');
    if (!paymentsList) return;

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      const payments = [];
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        if (data.approved && data.totalPrice) {
          payments.push({ id: doc.id, ...data });
        }
      });

      const totalRevenue = payments.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

      // Store for export
      lastPayments = payments.map(p => ({
        id: p.id,
        name: p.name || '',
        contactEmail: p.contactEmail || '',
        totalPrice: p.totalPrice || 0,
        paymentStatus: p.paymentStatus || '',
        stripeInvoiceId: p.stripeInvoiceId || '',
        stripeInvoiceUrl: p.stripeInvoiceUrl || '',
        lastPaymentSent: p.lastPaymentSent || ''
      }));

      paymentsList.innerHTML = `
        <div class="space-y-4">
          <div class="glass-card p-4 text-center">
            <h3 class="text-2xl font-bold text-glass">Total Revenue</h3>
            <p class="text-3xl text-brand font-bold">$${totalRevenue.toLocaleString()}</p>
          </div>
            ${payments.map(payment => `
            <div class="glass-card p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-glass">${payment.name}</h3>
                  <p class="text-glass-secondary">${payment.contactEmail}</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-green-400">$${(payment.totalPrice || 0).toLocaleString()}</p>
                  <p class="text-sm text-glass-secondary">Approved Vendor</p>
                    ${payment.stripeInvoiceUrl ? `<a href="${payment.stripeInvoiceUrl}" target="_blank" rel="noopener" class="inline-block mt-2 px-3 py-1 bg-orange-600 rounded text-white text-sm">Open Invoice</a>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

  // Export CSV button
  const exportBtn = root.querySelector('#exportPayments');
  if (exportBtn) exportBtn.onclick = () => exportCsv(`payments_${new Date().toISOString().slice(0,10)}.csv`, lastPayments);

    } catch (error) {
      console.error('Failed to load payments:', error);
      paymentsList.innerHTML = '<div class="text-red-400">Failed to load payments</div>';
    }
  }

  function showVendorProfileModal(vendorId, vendor, isEditMode) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-container max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">
              ${isEditMode ? 'Edit' : 'View'} Vendor Profile
            </h2>
            <button class="text-glass-secondary hover:text-glass p-2" onclick="closeVendorModal()">
              <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
            </button>
          </div>
        </div>
        
        <form class="p-6" ${isEditMode ? 'onsubmit="saveVendorProfile(event)"' : ''}>
          <input type="hidden" id="vendorId" value="${vendorId}">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Basic Info -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-glass">Basic Information</h3>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Business Name</label>
                <input type="text" id="name" value="${vendor.name || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Contact Email</label>
                <input type="email" id="contactEmail" value="${vendor.contactEmail || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Phone</label>
                <input type="tel" id="phone" value="${vendor.phone || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Category</label>
                <input type="text" id="category" value="${vendor.category || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Website</label>
                <input type="url" id="website" value="${vendor.website || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
            </div>
            
            <!-- Additional Info -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-glass">Additional Information</h3>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Description</label>
                <textarea id="description" rows="4" 
                          class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                          ${!isEditMode ? 'readonly' : ''}>${vendor.description || ''}</textarea>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Products/Services</label>
                <textarea id="products" rows="3" 
                          class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                          ${!isEditMode ? 'readonly' : ''}>${vendor.products || ''}</textarea>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Logo URL</label>
                <input type="url" id="logoUrl" value="${vendor.logoUrl || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Status</label>
                <div class="p-2 bg-glass-surface border border-glass-border rounded">
                  <span class="px-2 py-1 rounded text-sm ${vendor.approved ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}">
                    ${vendor.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>
              
              ${vendor.booths ? `
                <div>
                  <label class="block text-glass-secondary text-sm mb-1">Assigned Booths</label>
                  <div class="p-2 bg-glass-surface border border-glass-border rounded text-glass">
                    ${vendor.booths.join(', ')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${isEditMode ? `
            <div class="flex justify-end gap-4 mt-6 pt-6 border-t border-glass-border">
              <button type="button" onclick="closeVendorModal()" 
                      class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
                Cancel
              </button>
              <button type="submit" 
                      class="px-4 py-2 bg-brand rounded text-white hover:bg-brand/80">
                Save Changes
              </button>
            </div>
          ` : `
            <div class="flex justify-end mt-6 pt-6 border-t border-glass-border">
              <button type="button" onclick="closeVendorModal()" 
                      class="px-4 py-2 bg-brand rounded text-white">
                Close
              </button>
            </div>
          `}
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) window.closeVendorModal();
    };
    
    window.closeVendorModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      delete window.closeVendorModal;
      delete window.saveVendorProfile;
    };
    
    if (isEditMode) {
      window.saveVendorProfile = async (event) => {
        event.preventDefault();
        
        try {
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          
          const updatedData = {
            name: document.getElementById('name').value,
            contactEmail: document.getElementById('contactEmail').value,
            phone: document.getElementById('phone').value,
            category: document.getElementById('category').value,
            website: document.getElementById('website').value,
            description: document.getElementById('description').value,
            products: document.getElementById('products').value,
            logoUrl: document.getElementById('logoUrl').value
          };
          
          await updateDoc(doc(db, 'vendors', vendorId), updatedData);
          closeVendorModal();
          Toast('Vendor profile updated successfully!');
          await loadVendors(); // Refresh the vendor list
          
        } catch (error) {
          console.error('Failed to update vendor:', error);
          await AlertDialog('Update Failed', 'Failed to update vendor profile', { type: 'error' });
        }
      };
    }
  }

  function showUserProfileModal(userId, user) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-container max-w-lg w-full mx-4" onclick="event.stopPropagation()">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">User Profile</h2>
            <button class="text-glass-secondary hover:text-glass p-2" onclick="closeUserModal()">
              <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
            </button>
          </div>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="text-glass-secondary text-sm">Name</label>
            <div class="text-glass font-medium">${user.name || 'Not provided'}</div>
          </div>
          
          <div>
            <label class="text-glass-secondary text-sm">Email</label>
            <div class="text-glass font-medium">${user.email}</div>
          </div>
          
          <div>
            <label class="text-glass-secondary text-sm">Role</label>
            <div class="text-glass font-medium capitalize">${user.role || 'attendee'}</div>
          </div>
          
          <div>
            <label class="text-glass-secondary text-sm">User ID</label>
            <div class="text-glass font-mono text-sm">${userId}</div>
          </div>
          
          ${user.ownerUid ? `
            <div>
              <label class="text-glass-secondary text-sm">Owner UID</label>
              <div class="text-glass font-mono text-sm">${user.ownerUid}</div>
            </div>
          ` : ''}
          
          ${user.createdAt ? `
            <div>
              <label class="text-glass-secondary text-sm">Created</label>
              <div class="text-glass text-sm">${new Date(user.createdAt.seconds * 1000).toLocaleDateString()}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="flex justify-end p-6 border-t border-glass-border">
          <button onclick="closeUserModal()" class="px-4 py-2 bg-brand rounded text-white">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) window.closeUserModal();
    };
    
    window.closeUserModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      delete window.closeUserModal;
    };
  }

  async function showStripePaymentModal(vendorId, vendorName, vendorEmail) {
    // Prevent double-opening
    if (document.querySelector('.stripe-payment-modal')) {
      console.log('Payment modal already open, skipping');
      return;
    }
    
    // Fetch vendor data for auto-filling
    let vendorData = null;
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
      if (vendorDoc.exists()) {
        vendorData = vendorDoc.data();
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    }

    // Calculate auto-fill values
    const defaultAmount = vendorData?.totalPrice || 0;
    const boothCount = vendorData?.booths?.length || vendorData?.boothCount || 0;
    const boothList = vendorData?.booths?.join(', ') || 'TBD';
    
    let defaultDescription = '';
    if (vendorData) {
      defaultDescription = `Booth rental payment for ${vendorName}`;
      if (boothCount > 0) {
        defaultDescription += ` - ${boothCount} booth${boothCount > 1 ? 's' : ''}`;
        if (vendorData.booths && vendorData.booths.length > 0) {
          defaultDescription += ` (${boothList})`;
        }
      }
      if (vendorData.category) {
        defaultDescription += ` - ${vendorData.category}`;
      }
    } else {
      defaultDescription = `Payment for booth rental and services - ${vendorName}`;
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 stripe-payment-modal';
    modal.innerHTML = `
      <div class="glass-container max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">Send Stripe Payment</h2>
            <button class="text-glass-secondary hover:text-glass p-2" onclick="closePaymentModal()">
              <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
            </button>
          </div>
        </div>
        
        <form class="p-6" onsubmit="processStripePayment(event)">
          <input type="hidden" id="paymentVendorId" value="${vendorId}">
          <input type="hidden" id="paymentVendorEmail" value="${vendorEmail}">
          <input type="hidden" id="paymentVendorName" value="${vendorName}">
          
          <div class="space-y-4">
            <div>
              <label class="text-glass-secondary text-sm">Vendor</label>
              <div class="text-glass font-medium">${vendorName}</div>
              <div class="text-glass-secondary text-sm">${vendorEmail}</div>
              ${vendorData ? `
                <div class="text-xs text-glass-secondary mt-1">
                  ${boothCount > 0 ? `${boothCount} booth${boothCount > 1 ? 's' : ''} • ` : ''}
                  ${vendorData.category || 'General'}
                  ${vendorData.totalPrice ? ` • Registration Total: $${vendorData.totalPrice.toLocaleString()}` : ''}
                </div>
              ` : ''}
            </div>
            
            <div>
              <label class="block text-glass-secondary text-sm mb-1">Payment Amount ($)</label>
              <input type="number" id="paymentAmount" step="0.01" min="0.01" required
                     class="w-full p-3 bg-glass-surface border border-glass-border rounded text-glass"
                     placeholder="0.00" value="${defaultAmount > 0 ? defaultAmount : ''}">
              ${defaultAmount > 0 ? `<div class="text-xs text-glass-secondary mt-1">Auto-filled from registration total</div>` : ''}
            </div>
            
            <div>
              <label class="block text-glass-secondary text-sm mb-1">Description</label>
              <textarea id="paymentDescription" rows="3" required
                        class="w-full p-3 bg-glass-surface border border-glass-border rounded text-glass"
                        placeholder="Payment for booth rental, services, etc.">${defaultDescription}</textarea>
              <div class="text-xs text-glass-secondary mt-1">Auto-generated description (editable)</div>
            </div>
            
            <div>
              <label class="block text-glass-secondary text-sm mb-1">Payment Type</label>
              <select id="paymentType" required
                      class="w-full p-3 bg-glass-surface border border-glass-border rounded text-glass">
                <option value="">Select payment type</option>
                <option value="booth_rental">Booth Rental</option>
                <option value="services">Services</option>
                <option value="refund">Refund</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end gap-4 mt-6 pt-6 border-t border-glass-border">
            <button type="button" onclick="closePaymentModal()" 
                    class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
              Cancel
            </button>
            <button type="submit" 
                    class="px-4 py-2 bg-orange-600 rounded text-white hover:bg-orange-700">
              <ion-icon name="card-outline" class="mr-2"></ion-icon>Send Payment
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) window.closePaymentModal();
    };
    
    window.closePaymentModal = () => {
      // Remove all payment modals (safety cleanup)
      document.querySelectorAll('.stripe-payment-modal').forEach(m => {
        if (document.body.contains(m)) {
          document.body.removeChild(m);
        }
      });
      delete window.closePaymentModal;
      delete window.processStripePayment;
    };
    
    window.processStripePayment = async (event) => {
      event.preventDefault();
      
      const form = event.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-2"></ion-icon>Processing...';
      submitBtn.disabled = true;
      
      try {
        // Get values from the form directly (more reliable than document.getElementById)
        const amountInput = form.querySelector('#paymentAmount');
        const descriptionInput = form.querySelector('#paymentDescription');
        const paymentTypeInput = form.querySelector('#paymentType');
        const vendorEmailInput = form.querySelector('#paymentVendorEmail');
        const vendorIdInput = form.querySelector('#paymentVendorId');
        const vendorNameInput = form.querySelector('#paymentVendorName');
        
        const amount = parseFloat(amountInput?.value || 0);
        const description = descriptionInput?.value || '';
        const paymentType = paymentTypeInput?.value || '';
        const vendorEmail = vendorEmailInput?.value || '';
        const vendorId = vendorIdInput?.value || '';
        const vendorName = vendorNameInput?.value || '';
        
        console.log('Payment form values:', { amount, description, paymentType, vendorEmail, vendorId, vendorName });
        
        // Validate required fields
        if (!vendorEmail || !amount || !description) {
          throw new Error(`Please fill in all required fields. Email: ${vendorEmail ? 'OK' : 'Missing'}, Amount: ${amount ? 'OK' : 'Missing'}, Description: ${description ? 'OK' : 'Missing'}`);
        }
        
        // Prepare payment data
        const paymentData = {
          customerEmail: vendorEmail,
          amount: Math.round(amount * 100), // Convert to cents
          description: description,
          paymentType: paymentType,
          vendorName: vendorName,
          vendorId: vendorId
        };

        // Call Netlify function to create Stripe invoice
        const response = await fetch('/.netlify/functions/create-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Update vendor payment status in Firestore
          try {
            const { getDb } = await import("../firebase.js");
            const db = getDb();
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            
            await updateDoc(doc(db, 'vendors', vendorId), {
              paymentStatus: 'payment_sent',
              lastPaymentSent: new Date().toISOString(),
              stripeInvoiceId: result.invoiceId,
              stripeInvoiceUrl: result.invoiceUrl || null,
              invoiceAmount: amount
            });
          } catch (firestoreError) {
            console.error('Failed to update vendor payment status:', firestoreError);
          }

          // Close modal FIRST, then show success alert
          closePaymentModal();
          await AlertDialog('Invoice Sent', `Invoice sent successfully!\n\nInvoice ID: ${result.invoiceId}\nAmount: $${amount.toFixed(2)}\nSent to: ${vendorEmail}`, { type: 'success' });
          
          // Refresh the vendor list to show updated status
          await loadVendors();
        } else {
          throw new Error(result.error || 'Failed to create invoice');
        }
        
      } catch (error) {
        console.error('Failed to send payment:', error);
        // Close modal FIRST, then show error alert
        closePaymentModal();
        await AlertDialog('Payment Failed', `Failed to send payment: ${error.message}`, { type: 'error' });
      }
    };
  }

  // Expose load functions globally
  window.loadVendors = loadVendors;
  window.loadUsers = loadUsers;
  window.loadBooths = loadBooths;
  window.loadPayments = loadPayments;
  
  // Expose filter function globally
  window.filterVendors = (filterType) => {
    const search = document.querySelector('#vendorSearch')?.value || '';
    loadVendors(filterType, search);
  };

  // Initialize the dashboard
  render();
}