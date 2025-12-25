/**
 * Admin Dashboard - Main Orchestrator
 * Coordinates all admin tab modules
 * 
 * V-2.22 - Modular architecture refactor
 */

import { getState } from "../store.js";
import { SkeletonStats } from "../utils/skeleton.js";
import { renderAnalyticsDashboard, initAnalyticsCharts } from "../utils/analytics.js";
import { ConfirmDialog, AlertDialog, Toast } from "../utils/ui.js";
import { getAdminDb, getFirestoreModule, setButtonLoading } from "../utils/admin.js";

// Import tab modules
import { renderVendorsTab, loadVendors } from "./admin/AdminVendors.js";
import { renderUsersTab, loadUsers } from "./admin/AdminUsers.js";
import { renderBoothsTab, loadBooths } from "./admin/AdminBooths.js";
import { renderPaymentsTab, loadPayments } from "./admin/AdminPayments.js";
import { renderAdsTab, loadAds as loadAdsTab } from "./admin/AdminAds.js";

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

  // ========================================
  // Main Render
  // ========================================
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

        <!-- Navigation Tabs -->
        <div class="admin-tabs border-b border-glass-border bg-glass-surface/20">
          ${renderTabButton('overview', 'stats-chart-outline', 'Overview')}
          ${renderTabButton('analytics', 'bar-chart-outline', 'Analytics')}
          ${renderTabButton('vendors', 'storefront-outline', 'Vendors')}
          ${renderTabButton('users', 'people-outline', 'Users')}
          ${renderTabButton('booths', 'grid-outline', 'Booths')}
          ${renderTabButton('payments', 'card-outline', 'Payments')}
          ${renderTabButton('ads', 'megaphone-outline', 'Ads')}
          ${renderTabButton('admins', 'shield-checkmark-outline', 'Admins')}
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

  function renderTabButton(tab, icon, label) {
    const isActive = activeTab === tab;
    const activeClass = isActive 
      ? 'bg-brand/20 text-brand border border-brand/30' 
      : 'text-glass-secondary hover:text-glass hover:bg-white/5';
    return `
      <button class="tab-btn ${activeClass}" data-tab="${tab}">
        <ion-icon name="${icon}"></ion-icon>
        <span>${label}</span>
      </button>
    `;
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'analytics':
        return renderAnalyticsDashboard();
      case 'vendors':
        return renderVendorsTab();
      case 'users':
        return renderUsersTab();
      case 'booths':
        return renderBoothsTab();
      case 'payments':
        return renderPaymentsTab();
      case 'ads':
        return renderAdsTab();
      case 'admins':
        return renderAdminsTab();
      default:
        return '<div class="text-center text-glass-secondary">Select a tab</div>';
    }
  }

  // ========================================
  // Tab Initializers
  // ========================================
  async function initializeTab() {
    switch (activeTab) {
      case 'overview':
        await loadOverview();
        break;
      case 'analytics':
        await loadAnalytics();
        break;
      case 'vendors':
        await loadVendors(root, {}, showVendorProfileModal, showStripePaymentModal);
        break;
      case 'users':
        await loadUsers(root, showUserProfileModal);
        break;
      case 'booths':
        await loadBooths(root);
        break;
      case 'payments':
        await loadPayments(root, {}, showStripePaymentModal);
        break;
      case 'ads':
        await loadAdsTab(root);
        break;
      case 'admins':
        await loadAdmins();
        break;
    }
  }

  // ========================================
  // Overview Tab
  // ========================================
  function renderOverviewTab() {
    return `
      <div class="space-y-6">
        <h2 class="text-2xl font-bold text-glass">System Overview</h2>
        <div id="statsContainer">
          ${SkeletonStats()}
        </div>
      </div>
    `;
  }

  async function loadOverview() {
    const statsContainer = root.querySelector('#statsContainer');
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      const [vendorsSnap, attendeesSnap, boothsSnap] = await Promise.all([
        fsm.getDocs(fsm.collection(db, 'vendors')),
        fsm.getDocs(fsm.collection(db, 'attendees')),
        fsm.getDocs(fsm.collection(db, 'boothLayout'))
      ]);

      const totalVendors = vendorsSnap.size;
      const totalUsers = attendeesSnap.size + vendorsSnap.size;
      const totalBooths = boothsSnap.size;
      
      let totalRevenue = 0;
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        if (data.totalPrice) totalRevenue += data.totalPrice;
      });

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
      console.error('[AdminDashboard] Failed to load overview:', error);
      if (statsContainer) {
        statsContainer.innerHTML = '<div class="text-red-400 text-center p-4">Failed to load stats</div>';
      }
    }
  }

  // ========================================
  // Analytics Tab
  // ========================================
  async function loadAnalytics() {
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      const [vendorsSnap, attendeesSnap, leadsSnap] = await Promise.all([
        fsm.getDocs(fsm.collection(db, 'vendors')),
        fsm.getDocs(fsm.collection(db, 'attendees')),
        fsm.getDocs(fsm.collection(db, 'leads'))
      ]);

      const vendors = [];
      vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));
      
      const attendees = [];
      attendeesSnap.forEach(doc => attendees.push({ id: doc.id, ...doc.data() }));
      
      const leads = [];
      leadsSnap.forEach(doc => leads.push({ id: doc.id, ...doc.data() }));

      await initAnalyticsCharts({
        vendors,
        attendees,
        leads,
        payments: vendors
      });

      const refreshBtn = root.querySelector('#refreshAnalytics');
      if (refreshBtn) {
        refreshBtn.onclick = () => loadAnalytics();
      }
    } catch (error) {
      console.error('[AdminDashboard] Failed to load analytics:', error);
    }
  }

  // ========================================
  // Admins Tab
  // ========================================
  function renderAdminsTab() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <h2 class="text-2xl font-bold text-glass">Admin Access</h2>
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshAdminsBtn">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
          </button>
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
  }

  async function loadAdmins() {
    const listEl = root.querySelector('#adminsList');
    const refreshBtn = root.querySelector('#refreshAdminsBtn');
    const form = root.querySelector('#addAdminForm');
    if (!listEl) return;

    // Wire up refresh
    if (refreshBtn && !refreshBtn._listenerAdded) {
      refreshBtn._listenerAdded = true;
      refreshBtn.addEventListener('click', () => loadAdmins());
    }

    // Wire up add form
    if (form && !form._listenerAdded) {
      form._listenerAdded = true;
      form.addEventListener('submit', async (e) => {
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
          console.error('[AdminDashboard] Add admin failed:', err);
          await AlertDialog('Failed', 'Failed to add admin', { type: 'error' });
        }
      });
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
        <div class="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
          <div class="min-w-0 flex-1">
            <div class="text-glass font-medium truncate">${r.id}</div>
            ${r.addedAt ? `<div class="text-xs text-glass-secondary">Added: ${new Date(r.addedAt.seconds * 1000).toLocaleString()}</div>` : ''}
          </div>
          <button class="px-3 py-1 bg-red-600 rounded text-white text-sm remove-admin-btn" data-email="${r.id}">
            <ion-icon name="trash-outline" class="mr-1"></ion-icon>Remove
          </button>
        </div>
      `).join('');

      // Attach remove listeners
      listEl.querySelectorAll('.remove-admin-btn').forEach(btn => {
        if (btn._listenerAdded) return;
        btn._listenerAdded = true;
        btn.addEventListener('click', async () => {
          const email = btn.getAttribute('data-email');
          const confirmed = await ConfirmDialog('Remove Admin', `Remove admin access for: ${email}?`, { danger: true, confirmText: 'Remove' });
          if (!confirmed) return;
          
          setButtonLoading(btn, true, 'Removing...');
          try {
            const ok = await removeAdminEmail(email);
            if (ok) {
              await loadAdmins();
              Toast(`Removed admin: ${email}`);
            } else {
              setButtonLoading(btn, false);
              await AlertDialog('Failed', 'Failed to remove admin', { type: 'error' });
            }
          } catch (err) {
            console.error('[AdminDashboard] Remove admin failed:', err);
            setButtonLoading(btn, false);
            await AlertDialog('Failed', 'Failed to remove admin', { type: 'error' });
          }
        });
      });
    } catch (err) {
      console.error('[AdminDashboard] Load admins failed:', err);
      listEl.innerHTML = '<div class="text-red-400">Failed to load admin list</div>';
    }
  }

  // ========================================
  // Modals (shared across modules)
  // ========================================
  function showVendorProfileModal(vendorId, vendor, isEditMode) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 vendor-profile-modal';
    modal.innerHTML = `
      <div class="glass-container max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">
              ${isEditMode ? 'Edit' : 'View'} Vendor Profile
            </h2>
            <button class="text-glass-secondary hover:text-glass p-2 modal-close-btn">
              <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
            </button>
          </div>
        </div>
        
        <form class="p-6 vendor-profile-form">
          <input type="hidden" name="vendorId" value="${vendorId}">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-glass">Basic Information</h3>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Business Name</label>
                <input type="text" name="name" value="${vendor.name || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Contact Email</label>
                <input type="email" name="contactEmail" value="${vendor.contactEmail || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Phone</label>
                <input type="tel" name="phone" value="${vendor.phone || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Category</label>
                <input type="text" name="category" value="${vendor.category || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Website</label>
                <input type="url" name="website" value="${vendor.website || ''}" 
                       class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                       ${!isEditMode ? 'readonly' : ''}>
              </div>
            </div>
            
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-glass">Additional Information</h3>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Description</label>
                <textarea name="description" rows="4" 
                          class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                          ${!isEditMode ? 'readonly' : ''}>${vendor.description || ''}</textarea>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Products/Services</label>
                <textarea name="products" rows="3" 
                          class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass"
                          ${!isEditMode ? 'readonly' : ''}>${vendor.products || ''}</textarea>
              </div>
              
              <div>
                <label class="block text-glass-secondary text-sm mb-1">Logo URL</label>
                <input type="url" name="logoUrl" value="${vendor.logoUrl || ''}" 
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
              <button type="button" class="modal-close-btn px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-brand rounded text-white hover:bg-brand/80">
                Save Changes
              </button>
            </div>
          ` : `
            <div class="flex justify-end mt-6 pt-6 border-t border-glass-border">
              <button type="button" class="modal-close-btn px-4 py-2 bg-brand rounded text-white">
                Close
              </button>
            </div>
          `}
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    const content = modal.querySelector('.modal-content');
    if (content) content.addEventListener('click', e => e.stopPropagation());
    
    modal.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    
    if (isEditMode) {
      const form = modal.querySelector('.vendor-profile-form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        try {
          const db = await getAdminDb();
          const fsm = await getFirestoreModule();
          
          const formData = new FormData(form);
          const updatedData = {
            name: formData.get('name'),
            contactEmail: formData.get('contactEmail'),
            phone: formData.get('phone'),
            category: formData.get('category'),
            website: formData.get('website'),
            description: formData.get('description'),
            products: formData.get('products'),
            logoUrl: formData.get('logoUrl')
          };
          
          await fsm.updateDoc(fsm.doc(db, 'vendors', vendorId), updatedData);
          closeModal();
          Toast('Vendor profile updated successfully!');
          await loadVendors(root, {}, showVendorProfileModal, showStripePaymentModal);
          
        } catch (error) {
          console.error('[AdminDashboard] Failed to update vendor:', error);
          await AlertDialog('Update Failed', 'Failed to update vendor profile', { type: 'error' });
        }
      });
    }
  }

  function showUserProfileModal(userId, user) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 user-profile-modal';
    modal.innerHTML = `
      <div class="glass-container max-w-lg w-full mx-4 modal-content">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">User Profile</h2>
            <button class="text-glass-secondary hover:text-glass p-2 modal-close-btn">
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
          <button class="modal-close-btn px-4 py-2 bg-brand rounded text-white">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    const content = modal.querySelector('.modal-content');
    if (content) content.addEventListener('click', e => e.stopPropagation());
    
    modal.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
  }

  async function showStripePaymentModal(vendorId, vendorName, vendorEmail) {
    if (document.querySelector('.stripe-payment-modal')) {
      console.log('[AdminDashboard] Payment modal already open, skipping');
      return;
    }
    
    let vendorData = null;
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      const vendorDoc = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
      if (vendorDoc.exists()) {
        vendorData = vendorDoc.data();
      }
    } catch (error) {
      console.error('[AdminDashboard] Error fetching vendor data:', error);
    }

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
      <div class="glass-container max-w-md w-full mx-4 modal-content">
        <div class="p-6 border-b border-glass-border">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-glass">Send Stripe Payment</h2>
            <button class="text-glass-secondary hover:text-glass p-2 modal-close-btn">
              <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
            </button>
          </div>
        </div>
        
        <form class="p-6 payment-form">
          <input type="hidden" name="vendorId" value="${vendorId}">
          <input type="hidden" name="vendorEmail" value="${vendorEmail}">
          <input type="hidden" name="vendorName" value="${vendorName}">
          
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
              <input type="number" name="amount" step="0.01" min="0.01" required
                     class="w-full p-3 bg-glass-surface border border-glass-border rounded text-glass"
                     placeholder="0.00" value="${defaultAmount > 0 ? defaultAmount : ''}">
              ${defaultAmount > 0 ? `<div class="text-xs text-glass-secondary mt-1">Auto-filled from registration total</div>` : ''}
            </div>
            
            <div>
              <label class="block text-glass-secondary text-sm mb-1">Description</label>
              <textarea name="description" rows="3" required
                        class="w-full p-3 bg-glass-surface border border-glass-border rounded text-glass"
                        placeholder="Payment for booth rental, services, etc.">${defaultDescription}</textarea>
              <div class="text-xs text-glass-secondary mt-1">Auto-generated description (editable)</div>
            </div>
            
            <div>
              <label class="block text-glass-secondary text-sm mb-1">Payment Type</label>
              <select name="paymentType" required
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
            <button type="button" class="modal-close-btn px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
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
    
    const closeModal = () => {
      document.querySelectorAll('.stripe-payment-modal').forEach(m => {
        if (document.body.contains(m)) {
          document.body.removeChild(m);
        }
      });
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    const content = modal.querySelector('.modal-content');
    if (content) content.addEventListener('click', e => e.stopPropagation());
    
    modal.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    
    const form = modal.querySelector('.payment-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true, 'Processing...');
      
      try {
        const formData = new FormData(form);
        const amount = parseFloat(formData.get('amount') || 0);
        const description = formData.get('description') || '';
        const paymentType = formData.get('paymentType') || '';
        const vendorEmailVal = formData.get('vendorEmail') || '';
        const vendorIdVal = formData.get('vendorId') || '';
        const vendorNameVal = formData.get('vendorName') || '';
        
        if (!vendorEmailVal || !amount || !description) {
          throw new Error('Please fill in all required fields.');
        }
        
        const paymentData = {
          customerEmail: vendorEmailVal,
          amount: Math.round(amount * 100),
          description: description,
          paymentType: paymentType,
          vendorName: vendorNameVal,
          vendorId: vendorIdVal
        };

        const response = await fetch('/.netlify/functions/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          try {
            const db = await getAdminDb();
            const fsm = await getFirestoreModule();
            
            await fsm.updateDoc(fsm.doc(db, 'vendors', vendorIdVal), {
              paymentStatus: 'payment_sent',
              lastPaymentSent: new Date().toISOString(),
              stripeInvoiceId: result.invoiceId,
              stripeInvoiceUrl: result.invoiceUrl || null,
              invoiceAmount: amount
            });
          } catch (firestoreError) {
            console.error('[AdminDashboard] Failed to update vendor payment status:', firestoreError);
          }

          closeModal();
          await AlertDialog('Invoice Sent', `Invoice sent successfully!\n\nInvoice ID: ${result.invoiceId}\nAmount: $${amount.toFixed(2)}\nSent to: ${vendorEmailVal}`, { type: 'success' });
          
          await loadVendors(root, {}, showVendorProfileModal, showStripePaymentModal);
        } else {
          throw new Error(result.error || 'Failed to create invoice');
        }
        
      } catch (error) {
        console.error('[AdminDashboard] Failed to send payment:', error);
        closeModal();
        await AlertDialog('Payment Failed', `Failed to send payment: ${error.message}`, { type: 'error' });
      }
    });
  }

  // Initialize the dashboard
  render();
}
