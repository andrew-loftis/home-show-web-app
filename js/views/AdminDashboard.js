import { getState } from "../store.js";

export default function AdminDashboard(root) {
  const state = getState();
  console.log('AdminDashboard - state:', { isAdmin: state.isAdmin, role: state.role, user: state.user?.email });
  
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

  function render() {
    root.innerHTML = `
      <div class="glass-container">
        <!-- Header -->
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-glass flex items-center gap-3">
                <ion-icon name="settings-outline" class="text-brand"></ion-icon>
                Admin Dashboard
              </h1>
              <p class="text-glass-secondary mt-1">Complete system management</p>
            </div>
            <div class="text-sm text-glass-secondary">
              Logged in as: <span class="text-brand">${state.user?.email}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-glass-border bg-glass-surface/30">
          <button class="tab-btn px-6 py-3 border-b-2 ${activeTab === 'overview' ? 'border-brand text-brand' : 'border-transparent text-glass-secondary hover:text-glass'}" data-tab="overview">
            <ion-icon name="analytics-outline" class="mr-2"></ion-icon>Overview
          </button>
          <button class="tab-btn px-6 py-3 border-b-2 ${activeTab === 'vendors' ? 'border-brand text-brand' : 'border-transparent text-glass-secondary hover:text-glass'}" data-tab="vendors">
            <ion-icon name="storefront-outline" class="mr-2"></ion-icon>Vendors
          </button>
          <button class="tab-btn px-6 py-3 border-b-2 ${activeTab === 'users' ? 'border-brand text-brand' : 'border-transparent text-glass-secondary hover:text-glass'}" data-tab="users">
            <ion-icon name="people-outline" class="mr-2"></ion-icon>Users
          </button>
          <button class="tab-btn px-6 py-3 border-b-2 ${activeTab === 'booths' ? 'border-brand text-brand' : 'border-transparent text-glass-secondary hover:text-glass'}" data-tab="booths">
            <ion-icon name="grid-outline" class="mr-2"></ion-icon>Booths
          </button>
          <button class="tab-btn px-6 py-3 border-b-2 ${activeTab === 'payments' ? 'border-brand text-brand' : 'border-transparent text-glass-secondary hover:text-glass'}" data-tab="payments">
            <ion-icon name="card-outline" class="mr-2"></ion-icon>Payments
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
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
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="glass-card p-6 text-center">
                <div class="text-3xl text-brand mb-2">
                  <ion-icon name="people-outline"></ion-icon>
                </div>
                <div class="text-2xl font-bold text-glass" id="totalUsers">Loading...</div>
                <div class="text-glass-secondary">Total Users</div>
              </div>
              <div class="glass-card p-6 text-center">
                <div class="text-3xl text-green-400 mb-2">
                  <ion-icon name="storefront-outline"></ion-icon>
                </div>
                <div class="text-2xl font-bold text-glass" id="totalVendors">Loading...</div>
                <div class="text-glass-secondary">Vendors</div>
              </div>
              <div class="glass-card p-6 text-center">
                <div class="text-3xl text-blue-400 mb-2">
                  <ion-icon name="grid-outline"></ion-icon>
                </div>
                <div class="text-2xl font-bold text-glass" id="totalBooths">Loading...</div>
                <div class="text-glass-secondary">Booths</div>
              </div>
              <div class="glass-card p-6 text-center">
                <div class="text-3xl text-yellow-400 mb-2">
                  <ion-icon name="card-outline"></ion-icon>
                </div>
                <div class="text-2xl font-bold text-glass" id="totalRevenue">Loading...</div>
                <div class="text-glass-secondary">Revenue</div>
              </div>
            </div>
          </div>
        `;
      case 'vendors':
        return `
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-glass">Vendor Management</h2>
              <div class="flex items-center gap-4">
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
                <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadVendors()">Refresh</button>
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
              <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadUsers()">Refresh</button>
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
              <button class="bg-brand px-4 py-2 rounded text-white" onclick="loadPayments()">Refresh</button>
            </div>
            <div id="paymentsList">Loading payments...</div>
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
    }
  }

  async function loadOverview() {
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

      // Update UI
      const totalUsersEl = root.querySelector('#totalUsers');
      const totalVendorsEl = root.querySelector('#totalVendors');
      const totalBoothsEl = root.querySelector('#totalBooths');
      const totalRevenueEl = root.querySelector('#totalRevenue');

      if (totalUsersEl) totalUsersEl.textContent = totalUsers;
      if (totalVendorsEl) totalVendorsEl.textContent = totalVendors;
      if (totalBoothsEl) totalBoothsEl.textContent = totalBooths;
      if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toLocaleString()}`;

    } catch (error) {
      console.error('Failed to load overview:', error);
    }
  }

  async function loadVendors(filterType = 'all') {
    const vendorsList = root.querySelector('#vendorsList');
    if (!vendorsList) return;

    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const vendorsSnap = await getDocs(collection(db, 'vendors'));
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
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-glass">${vendor.name}</h3>
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
                  <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" onclick="viewVendorProfile('${vendor.id}')">
                    <ion-icon name="eye-outline" class="mr-1"></ion-icon>View Profile
                  </button>
                  <button class="bg-purple-600 px-3 py-1 rounded text-white text-sm" onclick="editVendorProfile('${vendor.id}')">
                    <ion-icon name="create-outline" class="mr-1"></ion-icon>Edit
                  </button>
                  ${vendor.approved ? `<button class="bg-orange-600 px-3 py-1 rounded text-white text-sm" onclick="sendStripePayment('${vendor.id}', '${vendor.name}', '${vendor.contactEmail}')">
                    <ion-icon name="card-outline" class="mr-1"></ion-icon>Send Payment
                  </button>` : ''}
                  ${!vendor.approved ? `<button class="bg-green-600 px-3 py-1 rounded text-white text-sm" onclick="approveVendor('${vendor.id}', '${vendor.contactEmail}')">
                    <ion-icon name="checkmark-outline" class="mr-1"></ion-icon>Approve
                  </button>` : ''}
                  <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" onclick="deleteVendor('${vendor.id}')">
                    <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                  </button>
                </div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;

      // Set up the filter event listener
      const vendorFilter = root.querySelector('#vendorFilter');
      if (vendorFilter) {
        vendorFilter.addEventListener('change', (e) => {
          loadVendors(e.target.value);
        });
      }

      // Set up payment button click handlers using event delegation
      vendorsList.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-vendor-id]');
        if (button && button.textContent.includes('Send Payment')) {
          const vendorId = button.dataset.vendorId;
          const vendorName = button.dataset.vendorName;
          const vendorEmail = button.dataset.vendorEmail;
          sendStripePayment(vendorId, vendorName, vendorEmail);
        }
      });

      // Expose functions globally for onclick handlers
      window.approveVendor = async (vendorId, vendorEmail) => {
        try {
          const { doc, updateDoc, collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          
          // 1. Approve the vendor
          await updateDoc(doc(db, 'vendors', vendorId), { approved: true });
          
          // 2. Find the attendee record by email and update their role to 'vendor'
          const attendeesRef = collection(db, 'attendees');
          const q = query(attendeesRef, where('email', '==', vendorEmail));
          const attendeesSnap = await getDocs(q);
          
          if (!attendeesSnap.empty) {
            const attendeeDoc = attendeesSnap.docs[0];
            await updateDoc(attendeeDoc.ref, { role: 'vendor' });
            console.log(`✅ Vendor approved and role updated for ${vendorEmail}`);
          } else {
            console.log(`⚠️ No attendee record found for ${vendorEmail} - vendor approved but role not updated`);
          }
          
          await loadVendors(); // Refresh
          alert(`✅ Vendor approved successfully! ${vendorEmail} now has vendor access.`);
        } catch (error) {
          console.error('Failed to approve vendor:', error);
          alert('❌ Failed to approve vendor. Please try again.');
        }
      };

      window.viewVendorProfile = async (vendorId) => {
        try {
          const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
          
          if (vendorDoc.exists()) {
            const vendor = vendorDoc.data();
            showVendorProfileModal(vendorId, vendor, false); // false = view mode
          }
        } catch (error) {
          console.error('Failed to load vendor profile:', error);
          alert('❌ Failed to load vendor profile');
        }
      };

      window.editVendorProfile = async (vendorId) => {
        try {
          const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
          
          if (vendorDoc.exists()) {
            const vendor = vendorDoc.data();
            showVendorProfileModal(vendorId, vendor, true); // true = edit mode
          }
        } catch (error) {
          console.error('Failed to load vendor profile:', error);
          alert('❌ Failed to load vendor profile');
        }
      };

      window.sendStripePayment = async (vendorId, vendorName, vendorEmail) => {
        showStripePaymentModal(vendorId, vendorName, vendorEmail);
      };

      window.deleteVendor = async (vendorId) => {
        if (confirm('Delete this vendor?')) {
          try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await deleteDoc(doc(db, 'vendors', vendorId));
            await loadVendors(); // Refresh
          } catch (error) {
            console.error('Failed to delete vendor:', error);
          }
        }
      };

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
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      const attendeesSnap = await getDocs(collection(db, 'attendees'));
      const users = [];
      attendeesSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

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
                    <select class="bg-glass-surface border border-glass-border rounded px-2 py-1 text-glass text-sm" 
                            onchange="changeUserRole('${user.id}', this.value)">
                      <option value="attendee" ${(!user.role || user.role === 'attendee') ? 'selected' : ''}>Attendee</option>
                      <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>Vendor</option>
                      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                  </div>
                  ${user.ownerUid ? `<p class="text-xs text-glass-secondary mt-1">UID: ${user.ownerUid}</p>` : ''}
                </div>
                <div class="flex flex-col gap-2">
                  <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" onclick="viewUserProfile('${user.id}')">
                    <ion-icon name="eye-outline" class="mr-1"></ion-icon>View Profile
                  </button>
                  <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" onclick="deleteUser('${user.id}')">
                    <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      window.deleteUser = async (userId) => {
        if (confirm('Delete this user?')) {
          try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await deleteDoc(doc(db, 'attendees', userId));
            await loadUsers(); // Refresh
          } catch (error) {
            console.error('Failed to delete user:', error);
          }
        }
      };

      window.changeUserRole = async (userId, newRole) => {
        try {
          const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          await updateDoc(doc(db, 'attendees', userId), { role: newRole });
          console.log(`✅ User role updated to ${newRole}`);
          // Show visual feedback
          const select = event.target;
          const originalBg = select.style.backgroundColor;
          select.style.backgroundColor = '#10b981';
          setTimeout(() => {
            select.style.backgroundColor = originalBg;
          }, 1000);
        } catch (error) {
          console.error('Failed to update user role:', error);
          alert('❌ Failed to update user role');
          await loadUsers(); // Refresh to revert UI
        }
      };

      window.viewUserProfile = async (userId) => {
        try {
          const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
          const userDoc = await getDoc(doc(db, 'attendees', userId));
          
          if (userDoc.exists()) {
            const user = userDoc.data();
            showUserProfileModal(userId, user);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          alert('❌ Failed to load user profile');
        }
      };

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
        if (!confirm('Generate booth stock? This will create 66 indoor + 31 outdoor booths.')) return;

        try {
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
          alert('Booth stock generated successfully!');
          await loadBooths();

        } catch (error) {
          console.error('Failed to generate booths:', error);
          alert('Failed to generate booth stock');
        }
      };
    }

    if (deleteAllBoothsBtn) {
      deleteAllBoothsBtn.onclick = async () => {
        if (!confirm('Delete ALL booths? This cannot be undone!')) return;

        try {
          const { getDb } = await import("../firebase.js");
          const db = getDb();
          const { collection, getDocs, writeBatch } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

          const batch = writeBatch(db);
          const boothsSnap = await getDocs(collection(db, 'boothLayout'));
          boothsSnap.forEach(doc => batch.delete(doc.ref));
          
          await batch.commit();
          alert('All booths deleted!');
          await loadBooths();

        } catch (error) {
          console.error('Failed to delete booths:', error);
          alert('Failed to delete booths');
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
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

    } catch (error) {
      console.error('Failed to load payments:', error);
      paymentsList.innerHTML = '<div class="text-red-400">Failed to load payments</div>';
    }
  }

  function showVendorProfileModal(vendorId, vendor, isEditMode) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-container max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">
              ${isEditMode ? 'Edit' : 'View'} Vendor Profile
            </h2>
            <button class="text-glass-secondary hover:text-glass" onclick="closeModal()">
              <ion-icon name="close-outline" class="text-2xl"></ion-icon>
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
              <button type="button" onclick="closeModal()" 
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
              <button type="button" onclick="closeModal()" 
                      class="px-4 py-2 bg-brand rounded text-white">
                Close
              </button>
            </div>
          `}
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeModal = () => {
      document.body.removeChild(modal);
      delete window.closeModal;
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
          alert('✅ Vendor profile updated successfully!');
          closeModal();
          await loadVendors(); // Refresh the vendor list
          
        } catch (error) {
          console.error('Failed to update vendor:', error);
          alert('❌ Failed to update vendor profile');
        }
      };
    }
  }

  function showUserProfileModal(userId, user) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-container max-w-lg w-full mx-4">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">User Profile</h2>
            <button class="text-glass-secondary hover:text-glass" onclick="closeUserModal()">
              <ion-icon name="close-outline" class="text-2xl"></ion-icon>
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
    
    window.closeUserModal = () => {
      document.body.removeChild(modal);
      delete window.closeUserModal;
    };
  }

  async function showStripePaymentModal(vendorId, vendorName, vendorEmail) {
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
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-container max-w-md w-full mx-4">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">Send Stripe Payment</h2>
            <button class="text-glass-secondary hover:text-glass" onclick="closePaymentModal()">
              <ion-icon name="close-outline" class="text-2xl"></ion-icon>
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
    
    window.closePaymentModal = () => {
      document.body.removeChild(modal);
      delete window.closePaymentModal;
      delete window.processStripePayment;
    };
    
    window.processStripePayment = async (event) => {
      event.preventDefault();
      
      const submitBtn = event.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-2"></ion-icon>Processing...';
      submitBtn.disabled = true;
      
      try {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const description = document.getElementById('paymentDescription').value;
        const paymentType = document.getElementById('paymentType').value;
        const vendorEmail = document.getElementById('paymentVendorEmail').value;
        const vendorId = document.getElementById('paymentVendorId').value;
        const vendorName = document.getElementById('paymentVendorName').value;
        
        // Prepare payment data
        const paymentData = {
          customerEmail: vendorEmail,
          amount: Math.round(amount * 100), // Convert to cents
          description: description,
          paymentType: paymentType,
          vendorName: vendorName,
          vendorId: vendorId
        };

        console.log('Sending payment data:', paymentData);

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
              invoiceAmount: amount
            });
            
            console.log('Vendor payment status updated to payment_sent');
          } catch (firestoreError) {
            console.error('Failed to update vendor payment status:', firestoreError);
          }

          alert(`✅ Invoice sent successfully!\n\nInvoice ID: ${result.invoiceId}\nAmount: $${amount.toFixed(2)}\nSent to: ${vendorEmail}`);
          closePaymentModal();
          
          // Refresh the vendor list to show updated status
          await loadVendors();
        } else {
          throw new Error(result.error || 'Failed to create invoice');
        }
        
      } catch (error) {
        console.error('Failed to send payment:', error);
        alert(`❌ Failed to send payment: ${error.message}`);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
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
    loadVendors(filterType);
  };

  // Initialize the dashboard
  render();
}