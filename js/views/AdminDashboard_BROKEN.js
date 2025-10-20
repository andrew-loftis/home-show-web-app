import { getState, topVendorsByLeadCount } from "../store.js";

export default function AdminDashboard(root) {
  const state = getState();
  console.log('AdminDashboard - state:', { isAdmin: state.isAdmin, role: state.role, user: state.user?.email });
  
  if (!state.isAdmin) {
    console.log('AdminDashboard - Access denied: not admin');
    root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>
      Admin access required.<br>
      <small>Current role: ${state.role || 'none'}<br>
      User: ${state.user?.email || 'not signed in'}<br>
      IsAdmin: ${state.isAdmin}</small>
    </div>`;
    return;
  }

  let activeTab = 'overview';
  
  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-6 text-glass">Admin Dashboard</h2>
        
        <!-- Tab Navigation -->
        <div class="flex flex-wrap gap-2 mb-6 border-b border-white/20 pb-4">
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'overview' ? 'brand-bg text-white' : 'glass-button'}" data-tab="overview">
            <ion-icon name="analytics-outline" class="mr-2"></ion-icon>Overview
          </button>
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'approvals' ? 'brand-bg text-white' : 'glass-button'}" data-tab="approvals">
            <ion-icon name="checkmark-circle-outline" class="mr-2"></ion-icon>Approvals
          </button>
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'vendors' ? 'brand-bg text-white' : 'glass-button'}" data-tab="vendors">
            <ion-icon name="business-outline" class="mr-2"></ion-icon>Approved Vendors
          </button>
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'users' ? 'brand-bg text-white' : 'glass-button'}" data-tab="users">
            <ion-icon name="people-outline" class="mr-2"></ion-icon>Users
          </button>
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'payments' ? 'brand-bg text-white' : 'glass-button'}" data-tab="payments">
            <ion-icon name="card-outline" class="mr-2"></ion-icon>Payments
          </button>
          <button class="tab-btn px-4 py-2 rounded-t ${activeTab === 'booths' ? 'brand-bg text-white' : 'glass-button'}" data-tab="booths">
            <ion-icon name="grid-outline" class="mr-2"></ion-icon>Booth Stock
          </button>
        </div>

        <!-- Tab Content -->
        <div id="tabContent" class="min-h-96">
          ${renderTabContent()}
        </div>
      </div>
    `;

    // Wire up tab switching
    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        render();
      };
    });

    // Initialize tab-specific functionality
    initializeActiveTab();
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'approvals':
        return renderApprovalsTab();
      case 'vendors':
        return renderVendorsTab();
      case 'users':
        return renderUsersTab();
      case 'payments':
        return renderPaymentsTab();
      case 'booths':
        return renderBoothsTab();
      default:
        return '<div class="text-glass-secondary">Tab not found</div>';
    }
  }

  function renderOverviewTab() {
    const topVendors = topVendorsByLeadCount();
    return `
      <div class="space-y-6">
        <!-- Analytics Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-blue-400" id="count-attendees">…</div>
            <div class="text-sm text-glass-secondary">Registered Attendees</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-green-400" id="count-vendors">…</div>
            <div class="text-sm text-glass-secondary">Approved Vendors</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-purple-400" id="count-leads">…</div>
            <div class="text-sm text-glass-secondary">Total Leads</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-yellow-400" id="count-revenue">$0</div>
            <div class="text-sm text-glass-secondary">Expected Revenue</div>
          </div>
        </div>

        <!-- Top Vendors -->
        <div class="glass-card p-4">
          <h3 class="text-lg font-semibold mb-4 text-glass">Top Vendors by Leads</h3>
          <div class="space-y-2">
            ${topVendors.length ? topVendors.map(v => `
              <div class='flex items-center gap-3 p-2 glass-button rounded'>
                <img src='${v.logoUrl || './assets/splash.svg'}' class='w-8 h-8 rounded' onerror='this.style.display="none"'>
                <div class='flex-1 text-glass'>${v.name}</div>
                <div class='text-sm text-glass-secondary'>${v.leadCount} leads</div>
              </div>
            `).join("") : '<div class="text-glass-secondary text-center py-4">No lead data available</div>'}
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="glass-card p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-glass">Recent Activity</h3>
            <div class="flex gap-2">
              <button class="glass-button px-3 py-1 text-sm" onclick="loadRecentActivity()">
                <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
              </button>
              <button class="bg-red-600 px-3 py-1 text-sm rounded text-white" id="clearActivityBtn">
                <ion-icon name="trash-outline" class="mr-1"></ion-icon>Clear All
              </button>
            </div>
          </div>
          <div id="recentActivity" class="space-y-2">
            <div class="text-glass-secondary text-center py-4">Loading recent activity...</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderApprovalsTab() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-glass">Pending Vendor Approvals</h3>
          <div class="flex gap-2">
            <button class="glass-button px-4 py-2" id="refreshApprovalsBtn">
              <ion-icon name="refresh-outline" class="mr-2"></ion-icon>Refresh
            </button>
            <button class="bg-red-600 px-4 py-2 rounded text-white" id="deleteAllPendingBtn">
              <ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete All Pending
            </button>
          </div>
        </div>
        <div id="pendingVendors" class="space-y-3">
          <div class="text-glass-secondary text-center py-8">Loading pending vendors...</div>
        </div>
      </div>
    `;
  }

  function renderVendorsTab() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-glass">Approved Vendors</h3>
          <div class="flex gap-2">
            <input type="text" placeholder="Search vendors..." class="px-3 py-2 rounded w-64" id="vendorSearch">
            <button class="glass-button px-4 py-2" id="refreshVendorsBtn">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
            <button class="bg-red-600 px-4 py-2 rounded text-white" id="deleteAllVendorsBtn">
              <ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete All
            </button>
          </div>
        </div>
        <div id="approvedVendors" class="space-y-3">
          <div class="text-glass-secondary text-center py-8">Loading approved vendors...</div>
        </div>
      </div>
    `;
  }

  function renderUsersTab() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-glass">User Management</h3>
          <div class="flex gap-2">
            <button class="glass-button px-4 py-2" id="refreshUsersBtn">
              <ion-icon name="refresh-outline" class="mr-2"></ion-icon>Refresh
            </button>
            <button class="bg-red-600 px-4 py-2 rounded text-white" id="purgeAllUsersBtn">
              <ion-icon name="nuclear-outline" class="mr-2"></ion-icon>Purge All Users
            </button>
          </div>
        </div>
        
        <!-- Admin Email Management -->
        <div class="glass-card p-4">
          <h4 class="font-semibold mb-3 text-glass">Admin Email Management</h4>
          <div class="flex gap-2 mb-3">
            <input type="email" placeholder="Add admin email" class="flex-1 px-3 py-2" id="newAdminEmail">
            <button class="brand-bg px-4 py-2 rounded" id="addAdminBtn">Add Admin</button>
          </div>
          <div id="adminEmails" class="space-y-2">
            <div class="text-glass-secondary">Loading admin emails...</div>
          </div>
        </div>

        <!-- User List -->
        <div id="usersList" class="space-y-3">
          <div class="text-glass-secondary text-center py-8">Loading users...</div>
        </div>
      </div>
    `;
  }

  function renderPaymentsTab() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-glass">Payment Management</h3>
          <div class="flex gap-2">
            <button class="bg-blue-600 px-4 py-2 rounded text-white" id="syncPaymentsBtn">
              <ion-icon name="sync-outline" class="mr-2"></ion-icon>Sync Approved Vendors
            </button>
            <button class="brand-bg px-4 py-2 rounded text-white" id="sendPendingInvoicesBtn">
              <ion-icon name="send-outline" class="mr-2"></ion-icon>Send All Invoices
            </button>
            <button class="glass-button px-4 py-2" id="refreshPaymentsBtn">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
            <button class="bg-red-600 px-4 py-2 rounded text-white" id="clearPaymentsBtn">
              <ion-icon name="trash-outline" class="mr-2"></ion-icon>Clear All
            </button>
          </div>
        </div>

        <!-- Revenue Cards -->
        <div id="revenueCards" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass">$0</div>
            <div class="text-glass-secondary text-sm">Total Revenue</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass">0</div>
            <div class="text-glass-secondary text-sm">Paid Vendors</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass">0</div>
            <div class="text-glass-secondary text-sm">Pending Payments</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass">0</div>
            <div class="text-glass-secondary text-sm">Failed Payments</div>
          </div>
        </div>

        <!-- Stripe Integration -->
        <div class="glass-card p-4">
          <h4 class="font-semibold mb-3 text-glass">Stripe Integration</h4>
          <div id="stripeStatus" class="text-glass-secondary">Checking Stripe connection...</div>
        </div>

        <!-- Payments List -->
        <div class="glass-card p-4">
          <h4 class="font-semibold mb-3 text-glass">Vendor Payments</h4>
          <div id="paymentsList" class="space-y-3">
            <div class="text-glass-secondary text-center py-8">Loading payments...</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderBoothsTab() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-glass">Booth Stock Management</h3>
          <div class="flex gap-2">
            <button class="bg-blue-600 px-4 py-2 rounded text-white" id="generateStockBtn">
              <ion-icon name="construct-outline" class="mr-2"></ion-icon>Generate Stock
            </button>
            <button class="glass-button px-4 py-2" id="addBoothBtn">
              <ion-icon name="add-outline" class="mr-2"></ion-icon>Add Booth
            </button>
            <button class="glass-button px-4 py-2" id="refreshBoothsBtn">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
            <button class="bg-orange-600 px-4 py-2 rounded text-white" id="clearAllAssignmentsBtn">
              <ion-icon name="remove-circle-outline" class="mr-2"></ion-icon>Clear All Assignments
            </button>
            <button class="bg-red-600 px-4 py-2 rounded text-white" id="deleteAllBoothsBtn">
              <ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete All Booths
            </button>
          </div>
        </div>

        <!-- Booth Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass" id="totalBooths">0</div>
            <div class="text-sm text-glass-secondary">Total Booths</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-green-400" id="availableBooths">0</div>
            <div class="text-sm text-glass-secondary">Available</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-red-400" id="occupiedBooths">0</div>
            <div class="text-sm text-glass-secondary">Occupied</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-yellow-400" id="reservedBooths">0</div>
            <div class="text-sm text-glass-secondary">Reserved</div>
          </div>
        </div>

        <!-- Booth Layout -->
        <div class="glass-card p-4">
          <h4 class="font-semibold mb-3 text-glass">Booth Layout</h4>
          <div id="boothLayout" class="grid grid-cols-8 md:grid-cols-15 gap-1">
            <div class="text-glass-secondary text-center py-8 col-span-full">Loading booth layout...</div>
          </div>
          
          <!-- Legend -->
          <div class="flex items-center gap-6 mt-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-green-400 rounded"></div>
              <span class="text-glass-secondary">Available</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-red-400 rounded"></div>
              <span class="text-glass-secondary">Occupied</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-yellow-400 rounded"></div>
              <span class="text-glass-secondary">Reserved</span>
            </div>
          </div>
        </div>

        <!-- Booth Management -->
        <div id="boothManagement" class="space-y-3">
          <div class="text-glass-secondary text-center py-8">Select a booth to manage</div>
        </div>
      </div>
    `;
  }
  function initializeActiveTab() {
    switch (activeTab) {
      case 'overview':
        loadOverviewData();
        break;
      case 'approvals':
        loadApprovalsData();
        break;
      case 'vendors':
        loadVendorsData();
        break;
      case 'users':
        loadUsersData();
        break;
      case 'payments':
        loadPaymentsData();
        break;
      case 'booths':
        loadBoothsData();
        break;
    }
  }

  async function loadOverviewData() {
    // Load accurate counts from Firebase
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const set = (id, val) => { 
        const el = root.querySelector(id); 
        if (el) el.textContent = String(val); 
      };
      
      // Count attendees
      try {
        const attendeesSnap = await getDocs(collection(db, 'attendees'));
        set('#count-attendees', attendeesSnap.size);
      } catch (error) {
        console.warn('Attendees collection access limited, using fallback');
        // Fallback to importing collection count function
        try {
          const { getCollectionCount } = await import("../firebase.js");
          const count = await getCollectionCount('attendees');
          set('#count-attendees', count);
        } catch {
          set('#count-attendees', 0);
        }
      }
      
      // Count vendors (total and approved)
      try {
        const vendorsSnap = await getDocs(collection(db, 'vendors'));
        const allVendors = [];
        vendorsSnap.forEach(doc => allVendors.push({ id: doc.id, ...doc.data() }));
        
        const approvedVendors = allVendors.filter(v => v.approved === true);
        set('#count-vendors', approvedVendors.length);
        
        // Calculate total revenue from approved vendors
        const totalRevenue = approvedVendors.reduce((sum, vendor) => {
          return sum + (vendor.totalPrice || 0);
        }, 0);
        
        const revenueEl = root.querySelector('#count-revenue');
        if (revenueEl) {
          revenueEl.textContent = `$${totalRevenue.toLocaleString()}`;
        }
      } catch (error) {
        console.warn('Vendors collection access limited, using fallback');
        try {
          const { getCollectionCount } = await import("../firebase.js");
          const count = await getCollectionCount('vendors');
          set('#count-vendors', count);
        } catch {
          set('#count-vendors', 0);
        }
      }
      
      // Count leads
      try {
        const leadsSnap = await getDocs(collection(db, 'leads'));
        set('#count-leads', leadsSnap.size);
      } catch (error) {
        console.warn('Leads collection access limited, using fallback');
        try {
          const { getCollectionCount } = await import("../firebase.js");
          const count = await getCollectionCount('leads');
          set('#count-leads', count);
        } catch {
          set('#count-leads', 0);
        }
      }
      
    } catch (error) {
      console.error('Failed to load overview data:', error);
      // Fallback to state data
      const set = (id, val) => { 
        const el = root.querySelector(id); 
        if (el) el.textContent = String(val); 
      };
      set('#count-attendees', state.attendees.length || 0);
      set('#count-vendors', state.vendors.length || 0);
      set('#count-leads', state.leads.length || 0);
    }

    // Load recent activity
    loadRecentActivity();
    
    // Wire up clear activity button
    const clearActivityBtn = root.querySelector('#clearActivityBtn');
    if (clearActivityBtn) {
      clearActivityBtn.onclick = async () => {
        const { ConfirmDialog } = await import("../utils/ui.js");
        
        const confirmed = await ConfirmDialog(
          'Clear Recent Activity',
          'Clear all recent activity? This will not delete actual data, just the activity display.',
          { confirmText: 'Clear Activity' }
        );
        
        if (!confirmed) return;
        
        const container = root.querySelector('#recentActivity');
        if (container) {
          container.innerHTML = '<div class="text-glass-secondary text-center py-4">No recent activity</div>';
        }
      };
    }
  }

  async function loadRecentActivity() {
    const container = root.querySelector('#recentActivity');
    if (!container) return;
    
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      // Get recent vendor registrations
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'), limit(5));
      const vendorsSnap = await getDocs(vendorsQuery);
      
      const activities = [];
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'vendor_registration',
          message: `New vendor registration: ${data.name}`,
          timestamp: data.createdAt?.toDate() || new Date(),
          status: data.approved ? 'approved' : 'pending'
        });
      });

      if (activities.length) {
        container.innerHTML = activities.map(activity => `
          <div class="flex items-center gap-3 p-2 glass-button rounded">
            <ion-icon name="${activity.type === 'vendor_registration' ? 'business-outline' : 'information-circle-outline'}" class="text-primary"></ion-icon>
            <div class="flex-1">
              <div class="text-glass text-sm">${activity.message}</div>
              <div class="text-glass-secondary text-xs">${activity.timestamp.toLocaleDateString()}</div>
            </div>
            <div class="text-xs px-2 py-1 rounded ${activity.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">
              ${activity.status}
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="text-glass-secondary text-center py-4">No recent activity</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="text-red-400 text-center py-4">Failed to load recent activity</div>';
    }
  }

  async function loadApprovalsData() {
    const container = root.querySelector('#pendingVendors');
    if (!container) return;

    const refreshBtn = root.querySelector('#refreshApprovalsBtn');
    if (refreshBtn) {
      refreshBtn.onclick = loadApprovalsData;
    }

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const q = query(collection(db, 'vendors'), where('approved', '==', false));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      
      if (!list.length) {
        container.innerHTML = `<div class='text-glass-secondary text-center py-8'>No pending vendors.</div>`;
      } else {
        container.innerHTML = list.map(v => `
          <div class='glass-card p-4' data-vendor-id='${v.id}'>
            <div class='flex items-start gap-4'>
              <img src='${v.logoUrl || './assets/splash.svg'}' class='w-12 h-12 rounded-lg' onerror='this.style.display="none"'>
              <div class='flex-1'>
                <div class='editable-field font-semibold text-glass text-lg' data-field='name' data-value='${v.name || ''}'>${v.name || 'Untitled'}</div>
                <div class='text-glass-secondary text-sm mt-1 space-y-1'>
                  <div>Category: <span class='editable-field' data-field='category' data-value='${v.category || ''}'>${v.category || '-'}</span></div>
                  <div>Booths: <span class='editable-field' data-field='booths' data-value='${JSON.stringify(v.booths||[])}'>${(v.booths||[]).join(', ') || v.booth || '-'}</span></div>
                  <div>Total: $<span class='editable-field' data-field='totalPrice' data-value='${v.totalPrice||0}'>${(v.totalPrice||0).toLocaleString()}</span></div>
                  <div>Contact: <span class='editable-field' data-field='contactEmail' data-value='${v.contactEmail || ''}'>${v.contactEmail || '-'}</span></div>
                </div>
                <div class='flex items-center gap-4 mt-2 text-xs'>
                  <label class='flex items-center gap-2'>
                    <input type='checkbox' class='edit-checkbox' data-field='needsPower' ${v.needsPower ? 'checked' : ''}>
                    <span class="flex items-center gap-1"><ion-icon name="flash-outline"></ion-icon>Power</span>
                  </label>
                  <label class='flex items-center gap-2'>
                    <input type='checkbox' class='edit-checkbox' data-field='needsTable' ${v.needsTable ? 'checked' : ''}>
                    <span class="flex items-center gap-1"><ion-icon name="desktop-outline"></ion-icon>Table</span>
                  </label>
                  <label class='flex items-center gap-2'>
                    <input type='number' class='edit-input w-12 px-1 py-1 rounded text-xs' data-field='chairCount' value='${v.chairCount || 0}' min='0' max='20'>
                    chairs
                  </label>
                </div>
              </div>
              <div class='flex flex-col gap-2'>
                <button class='brand-bg px-4 py-2 rounded approve-btn' data-id='${v.id}'>
                  <ion-icon name="checkmark-outline" class="mr-1"></ion-icon>Approve
                </button>
                <button class='glass-button px-4 py-2 rounded deny-btn' data-id='${v.id}'>
                  <ion-icon name="close-outline" class="mr-1"></ion-icon>Deny
                </button>
                <button class='glass-button px-4 py-2 rounded edit-btn' data-id='${v.id}'>
                  <ion-icon name="pencil-outline" class="mr-1"></ion-icon>Edit
                </button>
                <button class='bg-red-600 px-4 py-2 rounded text-white delete-btn' data-id='${v.id}'>
                  <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                </button>
                <button class='bg-green-600 px-4 py-2 rounded text-white save-edits-btn' data-id='${v.id}'>
                  <ion-icon name="save-outline" class="mr-1"></ion-icon>Save Changes
                </button>
              </div>
            </div>
          </div>
        `).join("");
        
        // Wire up action buttons
        container.querySelectorAll('.approve-btn').forEach(btn => {
          btn.onclick = async () => {
            try {
              const vendorId = btn.dataset.id;
              
              // Get vendor data to find contact email
              const vendorSnap = await getDocs(query(collection(db, 'vendors'), where('__name__', '==', vendorId)));
              let vendorData = null;
              vendorSnap.forEach(doc => {
                vendorData = { id: doc.id, ...doc.data() };
              });
              
              // Update vendor as approved
              await updateDoc(doc(db, 'vendors', vendorId), { 
                approved: true, 
                status: 'approved',
                approvedAt: new Date()
              });
              
              // Update user's role in attendee record if they exist
              if (vendorData && vendorData.contactEmail) {
                try {
                  const attendeeQuery = query(
                    collection(db, 'attendees'), 
                    where('email', '==', vendorData.contactEmail)
                  );
                  const attendeeSnap = await getDocs(attendeeQuery);
                  
                  attendeeSnap.forEach(async (attendeeDoc) => {
                    await updateDoc(doc(db, 'attendees', attendeeDoc.id), {
                      role: 'vendor',
                      vendorApproved: true,
                      vendorApprovedAt: new Date()
                    });
                  });
                } catch (error) {
                  console.warn('Could not update attendee role:', error);
                }
              }
              
              btn.closest('.glass-card').remove();
              
              // Show success message
              const { Toast } = await import("../utils/ui.js");
              Toast('Vendor approved successfully! User role updated.', { type: 'success' });
              
            } catch (error) {
              console.error('Failed to approve vendor:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Approval Failed', 'Failed to approve vendor. Please try again.', { type: 'error' });
            }
          };
        });
        
        container.querySelectorAll('.deny-btn').forEach(btn => {
          btn.onclick = async () => {
            try {
              await updateDoc(doc(db, 'vendors', btn.dataset.id), { 
                status: 'denied',
                deniedAt: new Date()
              });
              btn.closest('.glass-card').remove();
            } catch (error) {
              console.error('Failed to deny vendor:', error);
            }
          };
        });
        
        container.querySelectorAll('.edit-btn').forEach(btn => {
          btn.onclick = async () => {
            try {
              const { vendorLogin } = await import('../store.js');
              vendorLogin(btn.dataset.id);
              window.location.hash = '/edit-vendor';
            } catch (error) {
              console.error('Failed to edit vendor:', error);
            }
          };
        });
        
        // Make fields editable on click
        container.querySelectorAll('.editable-field').forEach(field => {
          field.onclick = () => makeFieldEditable(field);
        });
        
        // Save changes functionality
        container.querySelectorAll('.save-edits-btn').forEach(btn => {
          btn.onclick = async () => {
            const vendorId = btn.dataset.id;
            const card = btn.closest('.glass-card');
            
            try {
              const updates = {};
              
              // Collect editable field values
              card.querySelectorAll('.editable-field').forEach(field => {
                const fieldName = field.dataset.field;
                let value = field.dataset.value;
                
                if (fieldName === 'totalPrice') {
                  value = parseFloat(value) || 0;
                } else if (fieldName === 'booths') {
                  try {
                    value = JSON.parse(value);
                  } catch {
                    value = value.split(',').map(s => s.trim()).filter(s => s);
                  }
                }
                
                updates[fieldName] = value;
              });
              
              // Collect checkbox values
              card.querySelectorAll('.edit-checkbox').forEach(checkbox => {
                updates[checkbox.dataset.field] = checkbox.checked;
              });
              
              // Collect input values
              card.querySelectorAll('.edit-input').forEach(input => {
                const fieldName = input.dataset.field;
                let value = input.value;
                
                if (fieldName === 'chairCount') {
                  value = parseInt(value) || 0;
                }
                
                updates[fieldName] = value;
              });
              
              // Update in Firestore
              await updateDoc(doc(db, 'vendors', vendorId), updates);
              
              // Show success
              btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Saved';
              btn.classList.remove('bg-green-600');
              btn.classList.add('bg-blue-600');
              
              setTimeout(() => {
                btn.innerHTML = '<ion-icon name="save-outline" class="mr-1"></ion-icon>Save Changes';
                btn.classList.remove('bg-blue-600');
                btn.classList.add('bg-green-600');
              }, 2000);
              
            } catch (error) {
              console.error('Failed to save changes:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Save Failed', 'Failed to save changes. Please try again.', { type: 'error' });
            }
          };
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
          btn.onclick = async () => {
            const { ConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await ConfirmDialog(
              'Delete Vendor Application',
              'Are you sure you want to permanently delete this vendor application? This cannot be undone.',
              { danger: true, confirmText: 'Delete' }
            );
            
            if (!confirmed) return;
            try {
              const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
              await deleteDoc(doc(db, 'vendors', btn.dataset.id));
              btn.closest('.glass-card').remove();
            } catch (error) {
              console.error('Failed to delete vendor:', error);
            }
          };
        });
      }
      
      // Add bulk delete functionality
      const deleteAllBtn = root.querySelector('#deleteAllPendingBtn');
      if (deleteAllBtn) {
        deleteAllBtn.onclick = async () => {
          const { ConfirmDialog } = await import("../utils/ui.js");
          
          const confirmed = await ConfirmDialog(
            'Delete All Pending Applications',
            'Are you sure you want to delete ALL pending vendor applications? This cannot be undone.',
            { danger: true, confirmText: 'Delete All' }
          );
          
          if (!confirmed) return;
          try {
            const { writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            const batch = writeBatch(db);
            list.forEach(vendor => {
              batch.delete(doc(db, 'vendors', vendor.id));
            });
            await batch.commit();
            container.innerHTML = '<div class="text-glass-secondary text-center py-8">No pending vendors.</div>';
          } catch (error) {
            console.error('Failed to delete all pending vendors:', error);
            const { AlertDialog } = await import("../utils/ui.js");
            await AlertDialog('Delete Failed', 'Failed to delete all pending vendors. Please try again.', { type: 'error' });
          }
        };
      }
    } catch (error) {
      container.innerHTML = `<div class='text-red-400 text-center py-8'>Failed to load pending vendors</div>`;
    }
  }

  function makeFieldEditable(field) {
    if (field.querySelector('input')) return; // Already editing
    
    const currentValue = field.dataset.value || field.textContent;
    const fieldType = field.dataset.field;
    
    let input;
    if (fieldType === 'booths') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = Array.isArray(JSON.parse(currentValue || '[]')) ? JSON.parse(currentValue).join(', ') : currentValue;
      input.placeholder = 'e.g. A1, B2, C3';
    } else if (fieldType === 'totalPrice') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = currentValue;
      input.min = '0';
      input.step = '0.01';
    } else if (fieldType === 'contactEmail') {
      input = document.createElement('input');
      input.type = 'email';
      input.value = currentValue;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = currentValue;
    }
    
    input.className = 'bg-white/10 border border-white/20 rounded px-2 py-1 text-glass w-full';
    
    const originalContent = field.innerHTML;
    field.innerHTML = '';
    field.appendChild(input);
    
    input.focus();
    input.select();
    
    const saveEdit = () => {
      let newValue = input.value;
      
      if (fieldType === 'booths') {
        const boothArray = newValue.split(',').map(s => s.trim()).filter(s => s);
        field.dataset.value = JSON.stringify(boothArray);
        field.innerHTML = boothArray.join(', ') || '-';
      } else {
        field.dataset.value = newValue;
        field.innerHTML = newValue || '-';
      }
    };
    
    const cancelEdit = () => {
      field.innerHTML = originalContent;
    };
    
    input.onblur = saveEdit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    };
  }

  function makeUserFieldEditable(field) {
    if (field.querySelector('input')) return; // Already editing
    
    const currentValue = field.dataset.value || field.textContent.trim();
    const fieldType = field.dataset.type || 'text';
    const fieldName = field.dataset.field;
    
    let input;
    if (fieldType === 'email') {
      input = document.createElement('input');
      input.type = 'email';
      input.value = currentValue;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = currentValue;
    }
    
    input.className = 'bg-white/10 border border-white/20 rounded px-2 py-1 text-glass w-full';
    
    const originalContent = field.innerHTML;
    field.innerHTML = '';
    field.appendChild(input);
    
    input.focus();
    input.select();
    
    const saveEdit = () => {
      const newValue = input.value.trim();
      field.dataset.value = newValue;
      field.innerHTML = newValue || 'Not provided';
    };
    
    const cancelEdit = () => {
      field.innerHTML = originalContent;
    };
    
    input.onblur = saveEdit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    };
  }

  function makePaymentFieldEditable(field) {
    if (field.querySelector('input')) return; // Already editing
    
    const currentValue = field.dataset.value || field.textContent.trim();
    const fieldType = field.dataset.type || 'text';
    const fieldName = field.dataset.field;
    
    let input;
    if (fieldType === 'number' || fieldName === 'totalPrice') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = parseFloat(currentValue.replace(/[^0-9.]/g, '')) || 0;
      input.min = '0';
      input.step = '0.01';
    } else if (fieldType === 'email') {
      input = document.createElement('input');
      input.type = 'email';
      input.value = currentValue;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = currentValue;
    }
    
    input.className = 'bg-white/10 border border-white/20 rounded px-2 py-1 text-glass w-full';
    
    const originalContent = field.innerHTML;
    field.innerHTML = '';
    field.appendChild(input);
    
    input.focus();
    input.select();
    
    const saveEdit = () => {
      const newValue = input.value.trim();
      field.dataset.value = newValue;
      
      if (fieldName === 'totalPrice') {
        const numValue = parseFloat(newValue) || 0;
        field.innerHTML = `$${numValue.toLocaleString()}`;
        field.dataset.value = numValue;
      } else {
        field.innerHTML = newValue || 'Not provided';
      }
    };
    
    const cancelEdit = () => {
      field.innerHTML = originalContent;
    };
    
    input.onblur = saveEdit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    };
  }

  async function loadVendorsData() {
    const container = root.querySelector('#approvedVendors');
    const searchInput = root.querySelector('#vendorSearch');
    if (!container) return;

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const q = query(collection(db, 'vendors'), where('approved', '==', true));
      const snap = await getDocs(q);
      const vendors = [];
      snap.forEach(d => vendors.push({ id: d.id, ...d.data() }));
      
      function renderVendors(filteredVendors = vendors) {
        if (!filteredVendors.length) {
          container.innerHTML = '<div class="text-glass-secondary text-center py-8">No approved vendors found</div>';
          return;
        }
        
        container.innerHTML = filteredVendors.map(v => `
          <div class="glass-card p-4">
            <div class="flex items-center gap-4">
              <img src="${v.logoUrl || './assets/splash.svg'}" class="w-16 h-16 rounded-lg" onerror="this.style.display='none'">
              <div class="flex-1">
                <h3 class="text-glass font-semibold text-lg">${v.name}</h3>
                <p class="text-glass-secondary text-sm">${v.category || 'Uncategorized'}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-glass-secondary">
                  <span>Booths: ${(v.booths||[]).join(', ') || v.booth || 'None'}</span>
                  <span>Revenue: $${(v.totalPrice||0).toLocaleString()}</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <button class="glass-button px-3 py-1 rounded text-sm" onclick="window.location.hash='/vendor/${v.id}'">
                  <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                </button>
                <button class="glass-button px-3 py-1 rounded text-sm" onclick="navigator.clipboard.writeText('${v.contactEmail || ''}')">
                  <ion-icon name="mail-outline" class="mr-1"></ion-icon>Contact
                </button>
                <button class="bg-red-600 px-3 py-1 rounded text-white text-sm delete-vendor-btn" data-id="${v.id}" data-name="${v.name}">
                  <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                </button>
              </div>
            </div>
          </div>
        `).join('');
        
        // Add delete functionality for individual vendors
        container.querySelectorAll('.delete-vendor-btn').forEach(btn => {
          btn.onclick = async () => {
            const vendorName = btn.dataset.name;
            const { ConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await ConfirmDialog(
              'Delete Approved Vendor',
              `Are you sure you want to permanently delete "${vendorName}" and ALL related data?

This includes:
• Vendor profile and booth assignments
• All leads and interactions
• Payment records

This action CANNOT be undone.`,
              { danger: true, confirmText: 'Delete Vendor' }
            );
            
            if (!confirmed) return;
            
            try {
              const { getDb } = await import("../firebase.js");
              const db = getDb();
              const { doc, deleteDoc, collection, query, where, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
              
              const batch = writeBatch(db);
              const vendorId = btn.dataset.id;
              
              // Delete vendor document
              batch.delete(doc(db, 'vendors', vendorId));
              
              // Delete all leads for this vendor
              const leadsQuery = query(collection(db, 'leads'), where('vendorUid', '==', vendorId));
              const leadsSnap = await getDocs(leadsQuery);
              leadsSnap.forEach(leadDoc => {
                batch.delete(leadDoc.ref);
              });
              
              await batch.commit();
              btn.closest('.glass-card').remove();
            } catch (error) {
              console.error('Failed to delete vendor:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Delete Failed', 'Failed to delete vendor. Please try again.', { type: 'error' });
            }
          };
        });
      }
      
      renderVendors();
      
      // Add bulk delete functionality
      const deleteAllBtn = root.querySelector('#deleteAllVendorsBtn');
      if (deleteAllBtn) {
        deleteAllBtn.onclick = async () => {
          const { TypedConfirmDialog } = await import("../utils/ui.js");
          
          const confirmed = await TypedConfirmDialog(
            '⚠️ DANGER ZONE ⚠️',
            `This will permanently delete ALL ${vendors.length} approved vendors and ALL related data including:

• All vendor profiles and booth assignments
• All leads and interactions
• All payment records
• ALL vendor-related data

This action CANNOT be undone.`,
            'DELETE ALL VENDORS',
            { confirmText: 'Delete All Vendors' }
          );
          
          if (!confirmed) return;
          
          try {
            const { writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            const batch = writeBatch(db);
            
            // Delete all vendor documents
            vendors.forEach(vendor => {
              batch.delete(doc(db, 'vendors', vendor.id));
            });
            
            // Delete all leads
            const leadsSnap = await getDocs(collection(db, 'leads'));
            leadsSnap.forEach(leadDoc => {
              batch.delete(leadDoc.ref);
            });
            
            await batch.commit();
            container.innerHTML = '<div class="text-glass-secondary text-center py-8">No approved vendors found</div>';
          } catch (error) {
            console.error('Failed to delete all vendors:', error);
            const { AlertDialog } = await import("../utils/ui.js");
            await AlertDialog('Bulk Delete Failed', 'Failed to delete all vendors. Please try again.', { type: 'error' });
          }
        };
      }
      
      if (searchInput) {
        searchInput.oninput = (e) => {
          const term = e.target.value.toLowerCase();
          const filtered = vendors.filter(v => 
            (v.name || '').toLowerCase().includes(term) ||
            (v.category || '').toLowerCase().includes(term)
          );
          renderVendors(filtered);
        };
      }
    } catch (error) {
      container.innerHTML = '<div class="text-red-400 text-center py-8">Failed to load vendors</div>';
    }
  }

  async function loadUsersData() {
    const adminEmailsList = root.querySelector('#adminEmailsList');
    const usersList = root.querySelector('#usersList');
    const addEmailInput = root.querySelector('#newAdminEmail');
    const addEmailBtn = root.querySelector('#addAdminEmailBtn');
    
    if (addEmailBtn && addEmailInput) {
      addEmailBtn.onclick = async () => {
        const email = addEmailInput.value.trim().toLowerCase();
        if (!email) return;
        
        try {
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          
          await addDoc(collection(db, 'adminEmails'), { email });
          addEmailInput.value = '';
          loadUsersData(); // Refresh
        } catch (error) {
          console.error('Failed to add admin email:', error);
        }
      };
    }

    // Load admin emails
    if (adminEmailsList) {
      try {
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const { collection, getDocs, doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        
        const snap = await getDocs(collection(db, 'adminEmails'));
        const emails = [];
        snap.forEach(d => emails.push({ id: d.id, ...d.data() }));
        
        // Add config.js emails
        const { ADMIN_EMAILS } = await import('../config.js');
        ADMIN_EMAILS.forEach(email => {
          if (!emails.find(e => e.email === email)) {
            emails.push({ email, source: 'config.js' });
          }
        });
        
        adminEmailsList.innerHTML = emails.map(e => `
          <div class="flex items-center justify-between p-2 glass-button rounded">
            <span class="text-glass">${e.email}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-1 rounded ${e.source === 'config.js' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
                ${e.source || 'Firestore'}
              </span>
              ${e.id ? `<button class="text-red-400 hover:text-red-300" onclick="deleteAdminEmail('${e.id}')">
                <ion-icon name="trash-outline"></ion-icon>
              </button>` : ''}
            </div>
          </div>
        `).join('');
        
        window.deleteAdminEmail = async (id) => {
          try {
            await deleteDoc(doc(db, 'adminEmails', id));
            loadUsersData();
          } catch (error) {
            console.error('Failed to delete admin email:', error);
          }
        };
      } catch (error) {
        adminEmailsList.innerHTML = '<div class="text-red-400">Failed to load admin emails</div>';
      }
    }

    // Load users list (active users only)
    if (usersList) {
      try {
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        
        // Load all attendees (fallback for permission issues)
        const attendeesSnap = await getDocs(collection(db, 'attendees'));
        const attendees = [];
        attendeesSnap.forEach(d => attendees.push({ id: d.id, type: 'attendee', ...d.data() }));
        
        // Load all vendors (they all have contactEmail, even if not signed in)
        const vendorsSnap = await getDocs(collection(db, 'vendors'));
        const vendors = [];
        vendorsSnap.forEach(d => vendors.push({ id: d.id, type: 'vendor', ...d.data() }));
        
        // Create combined users list, avoiding duplicates
        const userMap = new Map();
        
        // Add attendees first (filter for active users)
        attendees.forEach(attendee => {
          const key = attendee.ownerUid || attendee.email;
          const hasSignedIn = !!attendee.ownerUid;
          if (key && hasSignedIn) { // Only show users who have signed in
            userMap.set(key, {
              ...attendee,
              displayType: 'attendee',
              hasSignedIn: true
            });
          }
        });
        
        // Add vendors, upgrading existing attendees to vendor status
        vendors.forEach(vendor => {
          const key = vendor.ownerUid || vendor.contactEmail;
          if (key) {
            const existing = userMap.get(key);
            if (existing) {
              // Upgrade attendee to vendor
              userMap.set(key, {
                ...existing,
                ...vendor,
                displayType: 'vendor',
                vendorApproved: vendor.approved,
                hasSignedIn: existing.hasSignedIn || !!vendor.ownerUid
              });
            } else {
              // New vendor-only user
              userMap.set(key, {
                ...vendor,
                displayType: 'vendor',
                vendorApproved: vendor.approved,
                hasSignedIn: !!vendor.ownerUid
              });
            }
          }
        });
        
        const users = Array.from(userMap.values());
        
        usersList.innerHTML = users.length ? users.map(u => {
          const displayName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User';
          const displayEmail = u.email || u.contactEmail || 'No email';
          const userType = u.displayType || u.type;
          
          return `
          <div class="glass-card p-3" data-user-id="${u.id}" data-user-type="${userType}">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br ${userType === 'vendor' ? 'from-green-500 to-blue-500' : 'from-purple-500 to-pink-500'} flex items-center justify-center text-white font-semibold">
                  ${displayName[0].toUpperCase()}
                </div>
                ${!u.hasSignedIn ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full" title="Has not signed in yet"></div>' : ''}
              </div>
              <div class="flex-1">
                <div class="editable-user-field text-glass font-medium cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors" 
                     data-field="name" data-value="${displayName}">${displayName}</div>
                <div class="editable-user-field text-glass-secondary text-sm cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors" 
                     data-field="email" data-value="${displayEmail}">${displayEmail}</div>
                <div class="flex items-center gap-2 mt-1">
                  <select class="edit-user-select text-xs px-2 py-1 rounded bg-white/10 border border-white/20 text-glass" data-field="displayType">
                    <option value="attendee" ${userType === 'attendee' ? 'selected' : ''}>Attendee</option>
                    <option value="vendor" ${userType === 'vendor' ? 'selected' : ''}>Vendor</option>
                  </select>
                  ${userType === 'vendor' ? `
                    <div class="text-xs">
                      <label class="flex items-center gap-1">
                        <input type="checkbox" class="edit-user-checkbox" data-field="approved" ${u.vendorApproved || u.approved ? 'checked' : ''}>
                        <span class="text-glass-secondary">Approved</span>
                      </label>
                    </div>
                  ` : ''}
                  <div class="text-xs px-2 py-1 rounded ${u.hasSignedIn ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}">
                    ${u.hasSignedIn ? '✓ Active' : '○ Not signed in'}
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <button class="bg-green-600 px-3 py-1 rounded text-white text-xs save-user-btn" 
                        data-id="${u.id}" 
                        data-type="${userType}">
                  <ion-icon name="save-outline" class="mr-1"></ion-icon>Save
                </button>
                <button class="bg-red-600 px-3 py-1 rounded text-white text-xs purge-user-btn" 
                        data-id="${u.id}" 
                        data-type="${userType}" 
                        data-name="${displayName}"
                        data-email="${displayEmail}"
                        data-owner-uid="${u.ownerUid || ''}">
                  <ion-icon name="nuclear-outline" class="mr-1"></ion-icon>Purge
                </button>
              </div>
            </div>
          </div>
        `;
        }).join('') : '<div class="text-glass-secondary text-center py-8">No active users found</div>';
        
        // Make user fields editable
        usersList.querySelectorAll('.editable-user-field').forEach(field => {
          field.onclick = () => makeUserFieldEditable(field);
        });
        
        // Save user changes functionality
        usersList.querySelectorAll('.save-user-btn').forEach(btn => {
          btn.onclick = async () => {
            const userId = btn.dataset.id;
            const userType = btn.dataset.type;
            const card = btn.closest('.glass-card');
            
            try {
              const updates = {};
              
              // Collect editable field values
              card.querySelectorAll('.editable-user-field').forEach(field => {
                const fieldName = field.dataset.field;
                const value = field.dataset.value;
                
                if (fieldName === 'name') {
                  const nameParts = value.split(' ');
                  if (userType === 'attendee') {
                    updates.firstName = nameParts[0] || '';
                    updates.lastName = nameParts.slice(1).join(' ') || '';
                  } else {
                    updates.name = value;
                  }
                } else if (fieldName === 'email') {
                  if (userType === 'vendor') {
                    updates.contactEmail = value;
                  } else {
                    updates.email = value;
                  }
                } else {
                  updates[fieldName] = value;
                }
              });
              
              // Collect select values
              card.querySelectorAll('.edit-user-select').forEach(select => {
                updates[select.dataset.field] = select.value;
              });
              
              // Collect checkbox values
              card.querySelectorAll('.edit-user-checkbox').forEach(checkbox => {
                updates[checkbox.dataset.field] = checkbox.checked;
              });
              
              // Update in Firestore - determine correct collection
              const collectionName = userType === 'vendor' ? 'vendors' : 'attendees';
              await updateDoc(doc(db, collectionName, userId), updates);
              
              // Show success
              btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Saved';
              btn.classList.remove('bg-green-600');
              btn.classList.add('bg-blue-600');
              
              setTimeout(() => {
                btn.innerHTML = '<ion-icon name="save-outline" class="mr-1"></ion-icon>Save';
                btn.classList.remove('bg-blue-600');
                btn.classList.add('bg-green-600');
              }, 2000);
              
            } catch (error) {
              console.error('Failed to save user changes:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Save Failed', 'Failed to save user changes. Please try again.', { type: 'error' });
            }
          };
        });
        
        // Add individual user purge functionality
        usersList.querySelectorAll('.purge-user-btn').forEach(btn => {
          btn.onclick = async () => {
            const userName = btn.dataset.name;
            const userEmail = btn.dataset.email;
            const userType = btn.dataset.type;
            const ownerUid = btn.dataset.ownerUid;
            
            const { TypedConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await TypedConfirmDialog(
              '⚠️ COMPLETE USER PURGE ⚠️',
              `This will permanently delete "${userName}" (${userEmail}) and ALL related data:

• User profile and authentication
• Business cards and interactions
• ${userType === 'vendor' ? 'Vendor profile, booth assignments, and leads' : 'Attendee data and saved vendors'}
• All Firebase data and Auth account

This action CANNOT be undone.`,
              'PURGE USER',
              { confirmText: 'Purge User' }
            );
            
            if (!confirmed) return;
            
            try {
              btn.disabled = true;
              btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Purging...';
              
              const { getDb } = await import("../firebase.js");
              const db = getDb();
              const { doc, deleteDoc, collection, query, where, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
              
              const batch = writeBatch(db);
              const userId = btn.dataset.id;
              
              // Delete user document (attendee or vendor)
              if (userType === 'attendee') {
                batch.delete(doc(db, 'attendees', userId));
              } else if (userType === 'vendor') {
                batch.delete(doc(db, 'vendors', userId));
                
                // Delete all leads for this vendor
                const leadsQuery = query(collection(db, 'leads'), where('vendorUid', '==', userId));
                const leadsSnap = await getDocs(leadsQuery);
                leadsSnap.forEach(leadDoc => {
                  batch.delete(leadDoc.ref);
                });
              }
              
              // Delete user auth document if ownerUid exists
              if (ownerUid) {
                try {
                  batch.delete(doc(db, 'users', ownerUid));
                  
                  // Delete Firebase Auth account (requires calling a Cloud Function)
                  try {
                    await fetch('/.netlify/functions/delete-user', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ uid: ownerUid })
                    });
                  } catch (authError) {
                    console.warn('Failed to delete Firebase Auth account:', authError);
                  }
                } catch (userDocError) {
                  console.warn('Failed to delete user document:', userDocError);
                }
              }
              
              await batch.commit();
              btn.closest('.glass-card').remove();
            } catch (error) {
              console.error('Failed to purge user:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Purge Failed', 'Failed to purge user. Please try again.', { type: 'error' });
              btn.disabled = false;
              btn.innerHTML = '<ion-icon name="nuclear-outline" class="mr-1"></ion-icon>Purge';
            }
          };
        });
      } catch (error) {
        console.error('Failed to load users data:', error);
        usersList.innerHTML = `
          <div class="text-center py-8">
            <div class="text-red-400 mb-2">
              <ion-icon name="warning-outline" class="text-2xl"></ion-icon>
            </div>
            <div class="text-red-400">Failed to load users</div>
            <div class="text-glass-secondary text-sm mt-1">Check Firebase permissions</div>
          </div>
        `;
      }
      
      // Add bulk purge functionality
      const purgeAllBtn = root.querySelector('#purgeAllUsersBtn');
      if (purgeAllBtn) {
        purgeAllBtn.onclick = async () => {
          const { TypedConfirmDialog } = await import("../utils/ui.js");
          
          const confirmed = await TypedConfirmDialog(
            '🚨 NUCLEAR OPTION 🚨',
            `This will permanently delete ALL USERS and ALL DATA:

• All attendee and vendor accounts
• All business cards and interactions
• All vendor profiles, booth assignments, and leads
• All Firebase Auth accounts
• EVERYTHING except admin accounts

This action CANNOT be undone.`,
            'PURGE ALL USERS',
            { confirmText: 'Purge All Users' }
          );
          
          if (!confirmed) return;
          
          try {
            const { writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            const batch = writeBatch(db);
            
            // Delete all user documents
            users.forEach(user => {
              if (user.type === 'attendee') {
                batch.delete(doc(db, 'attendees', user.id));
              } else if (user.type === 'vendor') {
                batch.delete(doc(db, 'vendors', user.id));
              }
              
              // Delete user auth document if exists
              if (user.ownerUid) {
                batch.delete(doc(db, 'users', user.ownerUid));
              }
            });
            
            // Delete all leads
            const leadsSnap = await getDocs(collection(db, 'leads'));
            leadsSnap.forEach(leadDoc => {
              batch.delete(leadDoc.ref);
            });
            
            await batch.commit();
            
            // Call bulk user deletion endpoint
            try {
              await fetch('/.netlify/functions/bulk-delete-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  uids: users.filter(u => u.ownerUid).map(u => u.ownerUid) 
                })
              });
            } catch (authError) {
              console.warn('Failed to delete Firebase Auth accounts:', authError);
            }
            
            usersList.innerHTML = '<div class="text-glass-secondary text-center py-8">No users found</div>';
          } catch (error) {
            console.error('Failed to purge all users:', error);
            const { AlertDialog } = await import("../utils/ui.js");
            await AlertDialog('Bulk Purge Failed', 'Failed to purge all users. Please try again.', { type: 'error' });
          }
        };
      }
    }
  }

  async function loadPaymentsData() {
    const revenueCards = root.querySelector('#revenueCards');
    const paymentsList = root.querySelector('#paymentsList');
    const stripeStatus = root.querySelector('#stripeStatus');
    
    // Load all vendors and auto-populate payment data
    if (revenueCards && paymentsList) {
      try {
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const { collection, getDocs, doc, updateDoc, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        
        // Get all vendors (approved and pending) for payment tracking
        const vendorsSnap = await getDocs(collection(db, 'vendors'));
        const vendors = [];
        vendorsSnap.forEach(d => vendors.push({ id: d.id, ...d.data() }));
        
        let totalRevenue = 0;
        let paidCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        const pendingVendors = [];
        const paidVendors = [];
        
        // Process all approved vendors, including those without explicit totalPrice
        vendors.forEach(vendor => {
          // Include approved vendors even if totalPrice is not set
          if (vendor.approved && (!vendor.totalPrice || vendor.totalPrice === 0)) {
            // Auto-calculate price based on booth selection
            let calculatedPrice = 0;
            if (vendor.booths && vendor.booths.length > 0) {
              // Use booth count * average price if no totalPrice set
              calculatedPrice = vendor.booths.length * 800; // Default booth price
            } else if (vendor.boothCount) {
              calculatedPrice = vendor.boothCount * 800;
            } else {
              calculatedPrice = 800; // Default single booth
            }
            vendor.totalPrice = calculatedPrice;
          }
          
          if (vendor.approved && vendor.totalPrice && vendor.totalPrice > 0) {
            totalRevenue += vendor.totalPrice;
            
            switch (vendor.paymentStatus) {
              case 'paid':
                paidCount++;
                paidVendors.push(vendor);
                break;
              case 'failed':
                failedCount++;
                pendingVendors.push(vendor);
                break;
              default:
                pendingCount++;
                pendingVendors.push(vendor);
            }
          }
        });
        
        // Update revenue cards
        revenueCards.innerHTML = `
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-green-400">$${totalRevenue.toLocaleString()}</div>
            <div class="text-glass-secondary text-sm">Total Revenue</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-blue-400">${paidCount}</div>
            <div class="text-glass-secondary text-sm">Paid Vendors</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-yellow-400">${pendingCount}</div>
            <div class="text-glass-secondary text-sm">Pending Payments</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-red-400">${failedCount}</div>
            <div class="text-glass-secondary text-sm">Failed Payments</div>
          </div>
        `;
        
        // Stripe status check
        if (stripeStatus) {
          stripeStatus.innerHTML = '<div class="text-green-400">✓ Stripe connected via Netlify functions</div>';
        }
        
        // Render payment list with Stripe integration
        const allVendors = [...pendingVendors, ...paidVendors].sort((a, b) => 
          new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0)
        );
        
        const approvedVendorsWithPayments = allVendors.filter(v => v.approved && v.totalPrice > 0);
        
        if (approvedVendorsWithPayments.length) {
          paymentsList.innerHTML = approvedVendorsWithPayments.map(vendor => `
            <div class="glass-card p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <img src="${vendor.logoUrl || './assets/splash.svg'}" class="w-12 h-12 rounded-lg" onerror="this.style.display='none'">
                    <div>
                      <div class="editable-payment-field cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors" 
                           data-field="name" data-type="text" data-value="${vendor.name || ''}">${vendor.name || 'Unnamed Vendor'}</div>
                      <div class="editable-payment-field cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors text-glass-secondary text-sm" 
                           data-field="contactEmail" data-type="email" data-value="${vendor.contactEmail || ''}">${vendor.contactEmail || 'No email'}</div>
                      <div class="text-xs text-glass-secondary">
                        Booths: ${(vendor.booths||[]).join(', ') || vendor.booth || 'None'} | 
                        Registered: ${vendor.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="editable-payment-field cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors text-glass font-semibold text-lg" 
                       data-field="totalPrice" data-type="number" data-value="${vendor.totalPrice || 0}">$${(vendor.totalPrice || 0).toLocaleString()}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <select class="edit-payment-select bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-xs" 
                            data-field="paymentStatus" data-id="${vendor.id}">
                      <option value="pending" ${vendor.paymentStatus === 'pending' || !vendor.paymentStatus ? 'selected' : ''}>⏳ Pending</option>
                      <option value="paid" ${vendor.paymentStatus === 'paid' ? 'selected' : ''}>✓ Paid</option>
                      <option value="failed" ${vendor.paymentStatus === 'failed' ? 'selected' : ''}>✗ Failed</option>
                      <option value="invoice_sent" ${vendor.paymentStatus === 'invoice_sent' ? 'selected' : ''}>📧 Invoice Sent</option>
                    </select>
                  </div>
                  <div class="flex gap-1 mt-2">
                    <button class="bg-green-600 px-3 py-1 rounded text-xs text-white save-payment-btn" 
                            data-id="${vendor.id}">
                      <ion-icon name="save-outline" class="mr-1"></ion-icon>Save
                    </button>
                    ${vendor.paymentStatus !== 'paid' ? `
                      <button class="brand-bg px-3 py-1 rounded text-xs text-white send-invoice-btn" 
                              data-vendor-id="${vendor.id}"
                              data-vendor-name="${vendor.name}"
                              data-vendor-email="${vendor.contactEmail}"
                              data-amount="${vendor.totalPrice}">
                        <ion-icon name="send-outline" class="mr-1"></ion-icon>Send Invoice
                      </button>
                    ` : ''}
                    <button class="bg-red-600 px-3 py-1 rounded text-xs text-white delete-payment-btn" 
                            data-vendor-id="${vendor.id}">
                      <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('');
          
          // Make payment fields editable
          paymentsList.querySelectorAll('.editable-payment-field').forEach(field => {
            field.onclick = () => makePaymentFieldEditable(field);
          });
          
          // Save payment changes functionality
          paymentsList.querySelectorAll('.save-payment-btn').forEach(btn => {
            btn.onclick = async () => {
              const vendorId = btn.dataset.id;
              const card = btn.closest('.glass-card');
              
              try {
                const updates = {};
                
                // Collect editable field values
                card.querySelectorAll('.editable-payment-field').forEach(field => {
                  const fieldName = field.dataset.field;
                  let value = field.dataset.value;
                  
                  if (fieldName === 'totalPrice') {
                    value = parseFloat(value) || 0;
                  }
                  
                  updates[fieldName] = value;
                });
                
                // Collect select values
                card.querySelectorAll('.edit-payment-select').forEach(select => {
                  updates[select.dataset.field] = select.value;
                });
                
                // Update in Firestore
                await updateDoc(doc(db, 'vendors', vendorId), updates);
                
                // Show success
                btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Saved';
                btn.classList.remove('bg-green-600');
                btn.classList.add('bg-blue-600');
                
                setTimeout(() => {
                  btn.innerHTML = '<ion-icon name="save-outline" class="mr-1"></ion-icon>Save';
                  btn.classList.remove('bg-blue-600');
                  btn.classList.add('bg-green-600');
                }, 2000);
                
              } catch (error) {
                console.error('Failed to save payment changes:', error);
                const { AlertDialog } = await import("../utils/ui.js");
                await AlertDialog('Save Failed', 'Failed to save payment changes. Please try again.', { type: 'error' });
              }
            };
          });
          
          // Wire up sync button
          const syncPaymentsBtn = root.querySelector('#syncPaymentsBtn');
          if (syncPaymentsBtn) {
            syncPaymentsBtn.onclick = async () => {
              try {
                syncPaymentsBtn.disabled = true;
                syncPaymentsBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Syncing...';
                
                // Find approved vendors without proper payment setup
                const vendorsToUpdate = [];
                vendors.forEach(vendor => {
                  if (vendor.approved && (!vendor.totalPrice || vendor.totalPrice === 0)) {
                    let calculatedPrice = 0;
                    if (vendor.booths && vendor.booths.length > 0) {
                      calculatedPrice = vendor.booths.length * 800;
                    } else if (vendor.boothCount) {
                      calculatedPrice = vendor.boothCount * 800;
                    } else {
                      calculatedPrice = 800;
                    }
                    vendorsToUpdate.push({
                      id: vendor.id,
                      totalPrice: calculatedPrice
                    });
                  }
                });
                
                // Update vendors in batch
                if (vendorsToUpdate.length > 0) {
                  const batch = writeBatch(db);
                  vendorsToUpdate.forEach(vendor => {
                    const vendorRef = doc(db, 'vendors', vendor.id);
                    batch.update(vendorRef, {
                      totalPrice: vendor.totalPrice,
                      paymentStatus: 'pending',
                      paymentSyncedAt: new Date()
                    });
                  });
                  await batch.commit();
                  
                  syncPaymentsBtn.innerHTML = `<ion-icon name="checkmark-outline"></ion-icon> Synced ${vendorsToUpdate.length} vendors`;
                  syncPaymentsBtn.classList.remove('bg-blue-600');
                  syncPaymentsBtn.classList.add('bg-green-600');
                  
                  setTimeout(() => {
                    loadPaymentsData(); // Refresh
                  }, 2000);
                } else {
                  syncPaymentsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Already synced';
                  syncPaymentsBtn.classList.remove('bg-blue-600');
                  syncPaymentsBtn.classList.add('bg-gray-600');
                  
                  setTimeout(() => {
                    syncPaymentsBtn.innerHTML = '<ion-icon name="sync-outline" class="mr-2"></ion-icon>Sync Approved Vendors';
                    syncPaymentsBtn.classList.remove('bg-gray-600');
                    syncPaymentsBtn.classList.add('bg-blue-600');
                    syncPaymentsBtn.disabled = false;
                  }, 3000);
                }
              } catch (error) {
                console.error('Failed to sync payments:', error);
                const { AlertDialog } = await import("../utils/ui.js");
                await AlertDialog('Sync Failed', 'Failed to sync approved vendors. Please try again.', { type: 'error' });
                
                syncPaymentsBtn.innerHTML = '<ion-icon name="sync-outline" class="mr-2"></ion-icon>Sync Approved Vendors';
                syncPaymentsBtn.disabled = false;
              }
            };
          }
          
          // Wire up Stripe invoice sending
          paymentsList.querySelectorAll('.send-invoice-btn').forEach(btn => {
            btn.onclick = async () => {
              const vendorId = btn.dataset.vendorId;
              const vendorName = btn.dataset.vendorName;
              const vendorEmail = btn.dataset.vendorEmail;
              const amount = parseFloat(btn.dataset.amount);
              
              if (!vendorEmail) {
                const { AlertDialog } = await import("../utils/ui.js");
                await AlertDialog('Cannot Send Invoice', 'No email address for this vendor. Cannot send invoice.', { type: 'error' });
                return;
              }
              
              try {
                btn.disabled = true;
                btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Sending...';
                
                // Call Netlify function to create Stripe invoice
                const response = await fetch('/.netlify/functions/create-invoice', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    vendorId,
                    vendorName,
                    customerEmail: vendorEmail,
                    amount: Math.round(amount * 100), // Convert to cents
                    description: `Home Show Booth Payment - ${vendorName}`,
                    metadata: {
                      vendorId,
                      boothPayment: true
                    }
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  
                  // Update vendor payment status
                  await updateDoc(doc(db, 'vendors', vendorId), {
                    paymentStatus: 'invoice_sent',
                    stripeInvoiceId: result.invoiceId,
                    invoiceSentAt: new Date()
                  });
                  
                  btn.innerHTML = '✓ Sent';
                  btn.classList.remove('brand-bg');
                  btn.classList.add('bg-green-600');
                  
                  // Refresh data
                  setTimeout(() => loadPaymentsData(), 1000);
                } else {
                  throw new Error(`HTTP ${response.status}`);
                }
              } catch (error) {
                console.error('Failed to send invoice:', error);
                const { AlertDialog } = await import("../utils/ui.js");
                await AlertDialog('Invoice Failed', 'Failed to send invoice. Please try again.', { type: 'error' });
                btn.disabled = false;
                btn.innerHTML = '<ion-icon name="send-outline" class="mr-1"></ion-icon>Send Invoice';
              }
            };
          });
          
          // Wire up payment deletion
          paymentsList.querySelectorAll('.delete-payment-btn').forEach(btn => {
            btn.onclick = async () => {
              const { ConfirmDialog } = await import("../utils/ui.js");
              
              const confirmed = await ConfirmDialog(
                'Delete Payment Record',
                'Delete this payment record? This will not refund any payments already made.',
                { danger: true, confirmText: 'Delete Record' }
              );
              
              if (!confirmed) return;
              
              try {
                const vendorId = btn.dataset.vendorId;
                await updateDoc(doc(db, 'vendors', vendorId), {
                  paymentStatus: null,
                  stripeInvoiceId: null,
                  stripePaymentIntentId: null,
                  paidAt: null,
                  invoiceSentAt: null
                });
                
                btn.closest('.glass-card').remove();
              } catch (error) {
                console.error('Failed to delete payment record:', error);
              }
            };
          });
        } else {
          paymentsList.innerHTML = '<div class="text-glass-secondary text-center py-8">No payment records found</div>';
        }
        
        // Wire up bulk invoice sending
        const sendAllInvoicesBtn = root.querySelector('#sendPendingInvoicesBtn');
        if (sendAllInvoicesBtn) {
          sendAllInvoicesBtn.onclick = async () => {
            const pendingWithEmail = pendingVendors.filter(v => v.contactEmail && v.totalPrice > 0);
            
            if (!pendingWithEmail.length) {
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('No Pending Vendors', 'No pending vendors with email addresses found.', { type: 'error' });
              return;
            }
            
            const { ConfirmDialog } = await import("../utils/ui.js");
            const confirmed = await ConfirmDialog(
              'Send Bulk Invoices',
              `Send Stripe invoices to ${pendingWithEmail.length} pending vendors?`,
              { confirmText: 'Send All Invoices' }
            );
            
            if (!confirmed) return;
            
            try {
              sendAllInvoicesBtn.disabled = true;
              sendAllInvoicesBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Sending...';
              
              const promises = pendingWithEmail.map(async (vendor) => {
                try {
                  const response = await fetch('/.netlify/functions/create-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vendorId: vendor.id,
                      vendorName: vendor.name,
                      customerEmail: vendor.contactEmail,
                      amount: Math.round(vendor.totalPrice * 100),
                      description: `Home Show Booth Payment - ${vendor.name}`,
                      metadata: { vendorId: vendor.id, boothPayment: true }
                    })
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    await updateDoc(doc(db, 'vendors', vendor.id), {
                      paymentStatus: 'invoice_sent',
                      stripeInvoiceId: result.invoiceId,
                      invoiceSentAt: new Date()
                    });
                  }
                } catch (error) {
                  console.error(`Failed to send invoice to ${vendor.name}:`, error);
                }
              });
              
              await Promise.all(promises);
              
              sendAllInvoicesBtn.innerHTML = '✓ All Sent';
              sendAllInvoicesBtn.classList.remove('brand-bg');
              sendAllInvoicesBtn.classList.add('bg-green-600');
              
              // Refresh data
              setTimeout(() => loadPaymentsData(), 2000);
            } catch (error) {
              console.error('Failed to send bulk invoices:', error);
              sendAllInvoicesBtn.disabled = false;
              sendAllInvoicesBtn.innerHTML = '<ion-icon name="send-outline" class="mr-2"></ion-icon>Send All Invoices';
            }
          };
        }
        
        // Wire up clear all payments
        const clearPaymentsBtn = root.querySelector('#clearPaymentsBtn');
        if (clearPaymentsBtn) {
          clearPaymentsBtn.onclick = async () => {
            const { ConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await ConfirmDialog(
              'Clear All Payment Records',
              'Clear all payment records? This will not cancel any Stripe invoices already sent.',
              { danger: true, confirmText: 'Clear All' }
            );
            
            if (!confirmed) return;
            
            try {
              const batch = writeBatch(db);
              vendors.forEach(vendor => {
                if (vendor.paymentStatus || vendor.stripeInvoiceId) {
                  batch.update(doc(db, 'vendors', vendor.id), {
                    paymentStatus: null,
                    stripeInvoiceId: null,
                    stripePaymentIntentId: null,
                    paidAt: null,
                    invoiceSentAt: null
                  });
                }
              });
              await batch.commit();
              
              paymentsList.innerHTML = '<div class="text-glass-secondary text-center py-8">No payment records found</div>';
              revenueCards.innerHTML = `
                <div class="glass-card p-4 text-center">
                  <div class="text-2xl font-bold text-glass">$0</div>
                  <div class="text-glass-secondary text-sm">Total Revenue</div>
                </div>
                <div class="glass-card p-4 text-center">
                  <div class="text-2xl font-bold text-glass">0</div>
                  <div class="text-glass-secondary text-sm">Paid Vendors</div>
                </div>
                <div class="glass-card p-4 text-center">
                  <div class="text-2xl font-bold text-glass">0</div>
                  <div class="text-glass-secondary text-sm">Pending Payments</div>
                </div>
                <div class="glass-card p-4 text-center">
                  <div class="text-2xl font-bold text-glass">0</div>
                  <div class="text-glass-secondary text-sm">Failed Payments</div>
                </div>
              `;
            } catch (error) {
              console.error('Failed to clear payments:', error);
            }
          };
        }
      } catch (error) {
        revenueCards.innerHTML = '<div class="text-red-400">Failed to load revenue data</div>';
      }
    }
    
    // Load recent payments
    if (paymentsList) {
      try {
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        
        const paymentsQuery = query(
          collection(db, 'vendors'), 
          where('paymentStatus', '==', 'paid'),
          orderBy('paidAt', 'desc'),
          limit(10)
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        
        const payments = [];
        paymentsSnap.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        
        if (payments.length) {
          paymentsList.innerHTML = payments.map(p => `
            <div class="glass-card p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-glass font-medium">${p.name}</div>
                  <div class="text-glass-secondary text-sm">${p.paidAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</div>
                </div>
                <div class="text-right">
                  <div class="text-glass font-semibold">$${(p.totalPrice || 0).toLocaleString()}</div>
                  <div class="text-green-400 text-xs">✓ Paid</div>
                </div>
              </div>
            </div>
          `).join('');
        } else {
          paymentsList.innerHTML = '<div class="text-glass-secondary text-center py-8">No payments found</div>';
        }
      } catch (error) {
        paymentsList.innerHTML = '<div class="text-red-400">Failed to load payments</div>';
      }
    }
  }

  async function loadBoothsData() {
    const boothGrid = root.querySelector('#boothGrid');
    const boothStats = root.querySelector('#boothStats');
    
    if (boothGrid && boothStats) {
      try {
        const { getDb } = await import("../firebase.js");
        const db = getDb();
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        
        // Load booth configuration
        let boothLayout = [];
        try {
          const boothsSnap = await getDocs(collection(db, 'boothLayout'));
          boothsSnap.forEach(doc => boothLayout.push({ id: doc.id, ...doc.data() }));
          
          // Sort booths: Indoor first (by display number), then outdoor
          boothLayout.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'indoor' ? -1 : 1;
            }
            return a.displayNumber - b.displayNumber;
          });
        } catch (error) {
          console.error('Failed to load booth layout:', error);
        }
        
        // Load vendor booth assignments
        const vendorsSnap = await getDocs(collection(db, 'vendors'));
        const boothAssignments = {};
        vendorsSnap.forEach(doc => {
          const data = doc.data();
          if (data.booths) {
            data.booths.forEach(booth => {
              boothAssignments[booth] = { vendorId: doc.id, vendorName: data.name };
            });
          } else if (data.booth) {
            boothAssignments[data.booth] = { vendorId: doc.id, vendorName: data.name };
          }
        });
        
        // Calculate stats
        const totalBooths = boothLayout.length;
        const occupiedBooths = Object.keys(boothAssignments).length;
        const availableBooths = totalBooths - occupiedBooths;
        const occupancyRate = totalBooths > 0 ? Math.round((occupiedBooths / totalBooths) * 100) : 0;
        
        // Separate indoor and outdoor for detailed stats
        const indoorBooths = boothLayout.filter(b => b.type === 'indoor');
        const outdoorBooths = boothLayout.filter(b => b.type === 'outdoor');
        const totalIndoor = indoorBooths.length;
        const totalOutdoor = outdoorBooths.length;
        
        boothStats.innerHTML = `
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-glass">${totalBooths}</div>
            <div class="text-glass-secondary text-sm">Total Booths</div>
            <div class="text-xs text-glass-secondary mt-1">${totalIndoor} Indoor + ${totalOutdoor} Outdoor</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-blue-400">${availableBooths}</div>
            <div class="text-glass-secondary text-sm">Available</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-red-400">${occupiedBooths}</div>
            <div class="text-glass-secondary text-sm">Occupied</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-2xl font-bold text-purple-400">${occupancyRate}%</div>
            <div class="text-glass-secondary text-sm">Occupancy</div>
          </div>
        `;
        
        // Render booth grid
        if (boothLayout.length > 0) {
          // Separate indoor and outdoor booths
          const indoorBooths = boothLayout.filter(b => b.type === 'indoor');
          const outdoorBooths = boothLayout.filter(b => b.type === 'outdoor');
          
          boothGrid.innerHTML = `
            ${indoorBooths.length > 0 ? `
              <div class="mb-6">
                <h4 class="text-lg font-semibold text-glass mb-3">Indoor Booths (8ft x 8ft)</h4>
                <div class="grid grid-cols-8 md:grid-cols-11 gap-1">
                  ${indoorBooths.map(booth => {
                    const assignment = boothAssignments[booth.boothNumber];
                    const isOccupied = !!assignment;
                    const isCornerTriple = booth.isCornerTriple;
                    return `
                      <div class="booth-cell ${isOccupied ? 'occupied' : 'available'} ${isCornerTriple ? 'corner-triple' : ''} p-2 rounded text-center text-xs cursor-pointer" 
                           data-booth="${booth.boothNumber}"
                           title="${isOccupied ? `${booth.boothNumber} (${booth.displayNumber}) - ${assignment.vendorName}` : `${booth.boothNumber} (${booth.displayNumber}) - Available ($${booth.basePrice}) ${isCornerTriple ? '- Triple Corner' : ''}`}">
                        <div class="font-mono">${booth.displayNumber}</div>
                        <div class="text-xs opacity-75">${booth.boothNumber}</div>
                        ${isOccupied ? `<div class="text-xs mt-1 truncate">${assignment.vendorName}</div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
            
            ${outdoorBooths.length > 0 ? `
              <div>
                <h4 class="text-lg font-semibold text-glass mb-3">Outdoor Booths (10ft x 10ft Tents)</h4>
                <div class="grid grid-cols-6 md:grid-cols-8 gap-1">
                  ${outdoorBooths.map(booth => {
                    const assignment = boothAssignments[booth.boothNumber];
                    const isOccupied = !!assignment;
                    return `
                      <div class="booth-cell ${isOccupied ? 'occupied' : 'available'} outdoor p-2 rounded text-center text-xs cursor-pointer" 
                           data-booth="${booth.boothNumber}"
                           title="${isOccupied ? `${booth.boothNumber} (${booth.displayNumber}) - ${assignment.vendorName}` : `${booth.boothNumber} (${booth.displayNumber}) - Available ($${booth.basePrice})`}">
                        <div class="font-mono">${booth.displayNumber}</div>
                        <div class="text-xs opacity-75">${booth.boothNumber}</div>
                        ${isOccupied ? `<div class="text-xs mt-1 truncate">${assignment.vendorName}</div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
            
            ${boothLayout.length === 0 ? `
              <div class="text-center py-8 text-glass-secondary">
                <ion-icon name="grid-outline" class="text-4xl mb-2"></ion-icon>
                <p>No booth stock generated yet</p>
                <p class="text-sm">Click "Generate Stock" to create booth inventory</p>
              </div>
            ` : ''}
          `;
        } else {
          boothGrid.innerHTML = `
            <div class="text-center py-8 text-glass-secondary">
              <ion-icon name="grid-outline" class="text-4xl mb-2"></ion-icon>
              <p>No booth stock generated yet</p>
              <p class="text-sm">Click "Generate Stock" to create booth inventory</p>
            </div>
          `;
        }

        // Add booth cell styles
        const style = document.createElement('style');
        style.textContent = `
          .booth-cell.available {
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
            color: rgb(147, 197, 253);
          }
          .booth-cell.occupied {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.4);
            color: rgb(134, 239, 172);
          }
          .booth-cell.corner-triple {
            border: 2px solid rgba(255, 215, 0, 0.6);
            background: rgba(255, 215, 0, 0.1);
          }
          .booth-cell.outdoor {
            border-radius: 50%;
          }
          .booth-cell:hover {
            transform: scale(1.05);
            transition: transform 0.2s;
          }
        `;
        if (!document.head.querySelector('style[data-booth-styles]')) {
          style.setAttribute('data-booth-styles', '');
          document.head.appendChild(style);
        }

      } catch (error) {
        boothGrid.innerHTML = '<div class="text-red-400">Failed to load booth data</div>';
        boothStats.innerHTML = '<div class="text-red-400">Failed to load booth stats</div>';
      }
    }

    // Wire up booth management buttons (outside try/catch to ensure they always work)
    const generateStockBtn = root.querySelector('#generateStockBtn');
    const deleteAllBoothsBtn = root.querySelector('#deleteAllBoothsBtn');
    const clearAllAssignmentsBtn = root.querySelector('#clearAllAssignmentsBtn');
    const refreshBoothsBtn = root.querySelector('#refreshBoothsBtn');

    if (generateStockBtn) {
      generateStockBtn.onclick = async () => {
        const { ConfirmDialog } = await import("../utils/ui.js");
         
        const confirmed = await ConfirmDialog(
          'Generate Booth Stock',
          'Generate comprehensive booth stock? This will create:\n\n• 66 Indoor booths (8ft x 8ft)\n  - 4 triple corner combos: (3,4,5), (9,10,11), (25,26,27), (31,32,33)\n  - 36 outer wall perimeter booths\n  - 30 interior section booths\n\n• 31 Outdoor booths (10ft x 10ft tents)\n\nThis will replace any existing booth configuration.',
          { confirmText: 'Generate Stock', danger: false }
        );
         
        if (!confirmed) return;

        try {
              generateStockBtn.disabled = true;
              generateStockBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Generating...';

              const { getDb } = await import("../firebase.js");
              const db = getDb();
              const { collection, doc, writeBatch, deleteDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

              const batch = writeBatch(db);

              // Clear existing booth layout
              const existingBooths = await getDocs(collection(db, 'boothLayout'));
              existingBooths.forEach(docRef => {
                batch.delete(docRef.ref);
              });

              // Generate Indoor Booths (1-66)
              const indoorBooths = [];
              
              // Define corner triple combinations
              const cornerTriples = [
                [3, 4, 5],
                [9, 10, 11], 
                [25, 26, 27],
                [31, 32, 33]
              ];

              for (let i = 1; i <= 66; i++) {
                const boothNumber = `I${i.toString().padStart(2, '0')}`;
                
                // Check if this booth is part of a corner triple
                const isCornerTriple = cornerTriples.some(triple => triple.includes(i));
                const cornerTripleGroup = cornerTriples.find(triple => triple.includes(i));
                
                // Determine if it's perimeter or interior
                const isPerimeter = i <= 36; // First 36 are perimeter
                
                const boothDoc = doc(collection(db, 'boothLayout'));
                batch.set(boothDoc, {
                  boothNumber: boothNumber,
                  displayNumber: i,
                  type: 'indoor',
                  size: '8x8',
                  dimensions: { width: 8, height: 8 },
                  location: isPerimeter ? 'perimeter' : 'interior',
                  isCornerTriple: isCornerTriple,
                  cornerTripleGroup: cornerTripleGroup ? cornerTripleGroup.join(',') : null,
                  basePrice: isCornerTriple ? 1200 : 800, // Triple price for corner combos
                  available: true,
                  amenities: {
                    power: isPerimeter,
                    wall: isPerimeter
                  },
                  createdAt: new Date()
                });
              }

              // Generate Outdoor Booths (1-31)
              for (let i = 1; i <= 31; i++) {
                const boothNumber = `O${i.toString().padStart(2, '0')}`;
                
                const boothDoc = doc(collection(db, 'boothLayout'));
                batch.set(boothDoc, {
                  boothNumber: boothNumber,
                  displayNumber: i,
                  type: 'outdoor',
                  size: '10x10',
                  dimensions: { width: 10, height: 10 },
                  location: 'outdoor',
                  isCornerTriple: false,
                  cornerTripleGroup: null,
                  basePrice: 600,
                  available: true,
                  amenities: {
                    tent: true,
                    power: false,
                    wall: false
                  },
                  createdAt: new Date()
                });
              }

              await batch.commit();

              generateStockBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Generated!';
              generateStockBtn.classList.remove('bg-blue-600');
              generateStockBtn.classList.add('bg-green-600');

              setTimeout(() => {
                generateStockBtn.innerHTML = '<ion-icon name="construct-outline" class="mr-2"></ion-icon>Generate Stock';
                generateStockBtn.classList.remove('bg-green-600');
                generateStockBtn.classList.add('bg-blue-600');
                generateStockBtn.disabled = false;
                loadBoothsData(); // Refresh the display
              }, 3000);

            } catch (error) {
              console.error('Failed to generate booth stock:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Generation Failed', 'Failed to generate booth stock. Please try again.', { type: 'error' });
              
              generateStockBtn.innerHTML = '<ion-icon name="construct-outline" class="mr-2"></ion-icon>Generate Stock';
              generateStockBtn.disabled = false;
            }
          };
        }

        if (deleteAllBoothsBtn) {
          deleteAllBoothsBtn.onclick = async () => {
            const { TypedConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await TypedConfirmDialog(
              'Delete All Booth Stock',
              'This will permanently delete ALL booth configurations and assignments. This action cannot be undone.',
              'DELETE ALL BOOTHS',
              { danger: true }
            );
            
            if (!confirmed) return;

            try {
              deleteAllBoothsBtn.disabled = true;
              deleteAllBoothsBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Deleting...';

              const { getDb } = await import("../firebase.js");
              const db = getDb();
              const { collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

              const batch = writeBatch(db);

              // Delete all booth layout documents
              const boothsSnap = await getDocs(collection(db, 'boothLayout'));
              boothsSnap.forEach(docRef => {
                batch.delete(docRef.ref);
              });

              await batch.commit();

              deleteAllBoothsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Deleted';
              deleteAllBoothsBtn.classList.remove('bg-red-600');
              deleteAllBoothsBtn.classList.add('bg-gray-600');

              setTimeout(() => {
                deleteAllBoothsBtn.innerHTML = '<ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete All Booths';
                deleteAllBoothsBtn.classList.remove('bg-gray-600');
                deleteAllBoothsBtn.classList.add('bg-red-600');
                deleteAllBoothsBtn.disabled = false;
                loadBoothsData(); // Refresh the display
              }, 2000);

            } catch (error) {
              console.error('Failed to delete booth stock:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Deletion Failed', 'Failed to delete booth stock. Please try again.', { type: 'error' });
              
              deleteAllBoothsBtn.innerHTML = '<ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete All Booths';
              deleteAllBoothsBtn.disabled = false;
            }
          };
        }

        if (clearAllAssignmentsBtn) {
          clearAllAssignmentsBtn.onclick = async () => {
            const { ConfirmDialog } = await import("../utils/ui.js");
            
            const confirmed = await ConfirmDialog(
              'Clear All Booth Assignments',
              'This will remove all vendor booth assignments, making all booths available again. Vendors will keep their registration data.',
              { confirmText: 'Clear Assignments', danger: true }
            );
            
            if (!confirmed) return;

            try {
              clearAllAssignmentsBtn.disabled = true;
              clearAllAssignmentsBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Clearing...';

              const { getDb } = await import("../firebase.js");
              const db = getDb();
              const { collection, getDocs, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

              // Clear booth assignments from all vendors
              const vendorsSnap = await getDocs(collection(db, 'vendors'));
              const updatePromises = [];
              
              vendorsSnap.forEach(docRef => {
                const data = docRef.data();
                if (data.booths || data.booth) {
                  updatePromises.push(
                    updateDoc(doc(db, 'vendors', docRef.id), {
                      booths: [],
                      booth: null
                    })
                  );
                }
              });

              await Promise.all(updatePromises);

              clearAllAssignmentsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Cleared';
              clearAllAssignmentsBtn.classList.remove('bg-orange-600');
              clearAllAssignmentsBtn.classList.add('bg-green-600');

              setTimeout(() => {
                clearAllAssignmentsBtn.innerHTML = '<ion-icon name="remove-circle-outline" class="mr-2"></ion-icon>Clear All Assignments';
                clearAllAssignmentsBtn.classList.remove('bg-green-600');
                clearAllAssignmentsBtn.classList.add('bg-orange-600');
                clearAllAssignmentsBtn.disabled = false;
                loadBoothsData(); // Refresh the display
              }, 2000);

            } catch (error) {
              console.error('Failed to clear assignments:', error);
              const { AlertDialog } = await import("../utils/ui.js");
              await AlertDialog('Clear Failed', 'Failed to clear booth assignments. Please try again.', { type: 'error' });
              
              clearAllAssignmentsBtn.innerHTML = '<ion-icon name="remove-circle-outline" class="mr-2"></ion-icon>Clear All Assignments';
              clearAllAssignmentsBtn.disabled = false;
            }
          };
        }
    }

    // Wire up booth management buttons (outside try/catch to ensure they always work)
    const generateStockBtn = root.querySelector('#generateStockBtn');
    const deleteAllBoothsBtn = root.querySelector('#deleteAllBoothsBtn');
    const clearAllAssignmentsBtn = root.querySelector('#clearAllAssignmentsBtn');
    const refreshBoothsBtn = root.querySelector('#refreshBoothsBtn');

    if (generateStockBtn) {
      generateStockBtn.onclick = async () => {
        const { ConfirmDialog } = await import("../utils/ui.js");
        
        const confirmed = await ConfirmDialog(
          'Generate Booth Stock',
          'Generate comprehensive booth stock? This will create:\n\n• 66 Indoor booths (8ft x 8ft)\n  - 4 triple corner combos: (3,4,5), (9,10,11), (25,26,27), (31,32,33)\n  - 36 outer wall perimeter booths\n  - 30 interior section booths\n\n• 31 Outdoor booths (10ft x 10ft tents)\n\nThis will replace any existing booth configuration.',
          { confirmText: 'Generate Stock', danger: false }
        );
        
        if (!confirmed) return;

        try {
          generateStockBtn.disabled = true;
          generateStockBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Generating...';

          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, doc, writeBatch, deleteDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const batch = writeBatch(db);

          // Clear existing booth layout
          const existingBooths = await getDocs(collection(db, 'boothLayout'));
          existingBooths.forEach(d => batch.delete(d.ref));

          // Define booth structure
          const indoorBooths = [];
          const outdoorBooths = [];

          // Triple corner combos: (3,4,5), (9,10,11), (25,26,27), (31,32,33)
          const tripleCombos = [
            [3, 4, 5], [9, 10, 11], [25, 26, 27], [31, 32, 33]
          ];

          // Generate 66 indoor booths
          for (let i = 1; i <= 66; i++) {
            const isCornerTriple = tripleCombos.some(combo => combo.includes(i));
            const boothType = isCornerTriple ? 'corner-triple' : 'standard';
            
            indoorBooths.push({
              displayNumber: i,
              type: 'indoor',
              boothType,
              size: '8ft x 8ft',
              price: 250,
              available: true,
              location: 'Indoor Exhibition Hall'
            });
          }

          // Generate 31 outdoor booths
          for (let i = 1; i <= 31; i++) {
            outdoorBooths.push({
              displayNumber: i + 100, // Outdoor booths start at 101
              type: 'outdoor',
              boothType: 'tent',
              size: '10ft x 10ft',
              price: 200,
              available: true,
              location: 'Outdoor Vendor Area'
            });
          }

          // Add all booths to batch
          [...indoorBooths, ...outdoorBooths].forEach(booth => {
            const docRef = doc(collection(db, 'boothLayout'));
            batch.set(docRef, booth);
          });

          // Commit the batch
          await batch.commit();

          // Success feedback
          generateStockBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Generated!';
          generateStockBtn.classList.remove('bg-blue-600');
          generateStockBtn.classList.add('bg-green-600');
          
          setTimeout(() => {
            generateStockBtn.innerHTML = '<ion-icon name="construct-outline" class="mr-2"></ion-icon>Generate Stock';
            generateStockBtn.classList.remove('bg-green-600');
            generateStockBtn.classList.add('bg-blue-600');
            generateStockBtn.disabled = false;
            loadBoothsData(); // Refresh the display
          }, 2000);

        } catch (error) {
          console.error('Failed to generate booth stock:', error);
          const { AlertDialog } = await import("../utils/ui.js");
          await AlertDialog('Generation Failed', 'Failed to generate booth stock. Please try again.', { type: 'error' });
          
          generateStockBtn.innerHTML = '<ion-icon name="construct-outline" class="mr-2"></ion-icon>Generate Stock';
          generateStockBtn.disabled = false;
        }
      };
    }

    if (deleteAllBoothsBtn) {
      deleteAllBoothsBtn.onclick = async () => {
        const { ConfirmDialog } = await import("../utils/ui.js");
        
        const confirmed = await ConfirmDialog(
          'Delete All Booths',
          'This will permanently delete all booth configuration data. This action cannot be undone.',
          { confirmText: 'Delete All', danger: true }
        );
        
        if (!confirmed) return;

        try {
          deleteAllBoothsBtn.disabled = true;
          deleteAllBoothsBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Deleting...';

          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const boothsSnap = await getDocs(collection(db, 'boothLayout'));
          const batch = writeBatch(db);
          
          boothsSnap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();

          deleteAllBoothsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Deleted!';
          deleteAllBoothsBtn.classList.remove('bg-red-600');
          deleteAllBoothsBtn.classList.add('bg-green-600');
          
          setTimeout(() => {
            deleteAllBoothsBtn.innerHTML = '<ion-icon name="nuclear-outline" class="mr-2"></ion-icon>Delete All';
            deleteAllBoothsBtn.classList.remove('bg-green-600');
            deleteAllBoothsBtn.classList.add('bg-red-600');
            deleteAllBoothsBtn.disabled = false;
            loadBoothsData(); // Refresh the display
          }, 2000);

        } catch (error) {
          console.error('Failed to delete booths:', error);
          const { AlertDialog } = await import("../utils/ui.js");
          await AlertDialog('Deletion Failed', 'Failed to delete booth data. Please try again.', { type: 'error' });
          
          deleteAllBoothsBtn.innerHTML = '<ion-icon name="nuclear-outline" class="mr-2"></ion-icon>Delete All';
          deleteAllBoothsBtn.disabled = false;
        }
      };
    }

    if (clearAllAssignmentsBtn) {
      clearAllAssignmentsBtn.onclick = async () => {
        const { ConfirmDialog } = await import("../utils/ui.js");
        
        const confirmed = await ConfirmDialog(
          'Clear All Assignments',
          'This will remove all booth assignments from vendors but keep the booth configuration. Vendors will need to be reassigned.',
          { confirmText: 'Clear Assignments', danger: true }
        );
        
        if (!confirmed) return;

        try {
          clearAllAssignmentsBtn.disabled = true;
          clearAllAssignmentsBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Clearing...';

          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const vendorsSnap = await getDocs(collection(db, 'vendors'));
          const batch = writeBatch(db);
          
          vendorsSnap.forEach(doc => {
            const data = doc.data();
            if (data.booths || data.booth) {
              // Remove booth assignments
              const updates = { ...data };
              delete updates.booths;
              delete updates.booth;
              batch.update(doc.ref, updates);
            }
          });
          
          await batch.commit();

          clearAllAssignmentsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Cleared!';
          clearAllAssignmentsBtn.classList.remove('bg-orange-600');
          clearAllAssignmentsBtn.classList.add('bg-green-600');
          
          setTimeout(() => {
            clearAllAssignmentsBtn.innerHTML = '<ion-icon name="remove-circle-outline" class="mr-2"></ion-icon>Clear All Assignments';
            clearAllAssignmentsBtn.classList.remove('bg-green-600');
            clearAllAssignmentsBtn.classList.add('bg-orange-600');
            clearAllAssignmentsBtn.disabled = false;
            loadBoothsData(); // Refresh the display
          }, 2000);

        } catch (error) {
          console.error('Failed to clear assignments:', error);
          const { AlertDialog } = await import("../utils/ui.js");
          await AlertDialog('Clear Failed', 'Failed to clear booth assignments. Please try again.', { type: 'error' });
          
          clearAllAssignmentsBtn.innerHTML = '<ion-icon name="remove-circle-outline" class="mr-2"></ion-icon>Clear All Assignments';
          clearAllAssignmentsBtn.disabled = false;
        }
      };
    }

    if (refreshBoothsBtn) {
      refreshBoothsBtn.onclick = () => loadBoothsData();
    }
  }

  // Initialize the dashboard
  render();
}