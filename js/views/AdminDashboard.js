/**
 * Admin Dashboard - Main Orchestrator
 * Coordinates all admin tab modules
 * 
 * V-2.23 - Added show filter for multi-show admin management
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
import { renderImportTab, setupImportListeners } from "./admin/AdminImport.js";
import { renderShowsTab, loadShows as loadShowsTab } from "./admin/AdminShows.js";
import { renderFloorPlanTab, loadFloorPlan } from "./admin/AdminFloorPlan.js";

// Import shows for admin filter
import { SHOWS, getAllShows, getCurrentShowId, setCurrentShow, getCurrentShow, DEFAULT_SHOW_ID, initShows } from "../shows.js";

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
  let sidebarOpen = false;
  
  // Admin show filter - tracks which show admin is viewing
  let adminShowId = getCurrentShowId();
  const adminShow = () => SHOWS[adminShowId] || getCurrentShow();
  const allShows = getAllShows();

  // Tab configuration - organized into sections
  const navSections = [
    {
      title: 'Dashboard',
      items: [
        { key: 'overview', icon: 'grid-outline', label: 'Overview' },
        { key: 'analytics', icon: 'bar-chart-outline', label: 'Analytics' },
      ]
    },
    {
      title: 'Management',
      items: [
        { key: 'vendors', icon: 'storefront-outline', label: 'Vendors' },
        { key: 'users', icon: 'people-outline', label: 'Users' },
        { key: 'leads', icon: 'swap-horizontal-outline', label: 'Leads' },
        { key: 'booths', icon: 'map-outline', label: 'Booth Map' },
        { key: 'floorplan', icon: 'image-outline', label: 'Floor Plan' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { key: 'import', icon: 'cloud-upload-outline', label: 'Import Data' },
        { key: 'payments', icon: 'card-outline', label: 'Payments' },
        { key: 'ads', icon: 'megaphone-outline', label: 'Ads' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { key: 'shows', icon: 'calendar-outline', label: 'Shows' },
        { key: 'admins', icon: 'shield-checkmark-outline', label: 'Admin Users' },
      ]
    }
  ];

  // ========================================
  // Main Render
  // ========================================
  function render() {
    root.innerHTML = `
      <div class="admin-layout">
        <!-- Mobile Header -->
        <div class="admin-mobile-header lg:hidden">
          <button id="sidebarToggle" class="admin-menu-btn">
            <ion-icon name="menu-outline"></ion-icon>
          </button>
          <div class="admin-mobile-title">
            <ion-icon name="settings-outline" class="text-brand"></ion-icon>
            <span>Admin</span>
          </div>
          <div class="admin-user-badge">
            ${state.user?.email?.split('@')[0]?.substring(0, 8)}
          </div>
        </div>

        <!-- Sidebar Overlay (mobile) -->
        <div id="sidebarOverlay" class="admin-sidebar-overlay ${sidebarOpen ? 'active' : ''}"></div>

        <!-- Sidebar -->
        <aside id="adminSidebar" class="admin-sidebar ${sidebarOpen ? 'open' : ''}">
          <!-- Sidebar Header -->
          <div class="admin-sidebar-header">
            <div class="admin-logo">
              <div class="admin-logo-icon">
                <img src="/assets/House Logo Only.png" alt="WinnPro" class="w-8 h-8 object-contain">
              </div>
              <div class="admin-logo-text">
                <div class="admin-logo-title">WinnPro</div>
                <div class="admin-logo-subtitle">Admin Panel</div>
              </div>
            </div>
            <button id="sidebarClose" class="admin-sidebar-close lg:hidden">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <!-- Navigation -->
          <nav class="admin-nav">
            ${navSections.map(section => `
              <div class="admin-nav-section">
                <div class="admin-nav-section-title">${section.title}</div>
                <ul class="admin-nav-list">
                  ${section.items.map(item => `
                    <li>
                      <button class="admin-nav-item ${activeTab === item.key ? 'active' : ''}" data-tab="${item.key}">
                        <ion-icon name="${item.icon}"></ion-icon>
                        <span>${item.label}</span>
                        ${activeTab === item.key ? '<div class="admin-nav-active-indicator"></div>' : ''}
                      </button>
                    </li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
            
            <!-- Show Filter -->
            <div class="admin-show-filter">
              ${allShows.map(show => `
                <button class="admin-show-pill ${show.id === adminShowId ? 'active' : ''} ${show.season}" data-show-id="${show.id}">
                  ${show.shortName}
                </button>
              `).join('')}
            </div>
          </nav>

          <!-- Sidebar Footer -->
          <div class="admin-sidebar-footer">
            <div class="admin-user-info">
              <div class="admin-user-avatar">
                ${state.user?.email?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div class="admin-user-details">
                <div class="admin-user-name">${state.user?.displayName || state.user?.email?.split('@')[0] || 'Admin'}</div>
                <div class="admin-user-email">${state.user?.email || ''}</div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="admin-main">
          <!-- Desktop Header -->
          <header class="admin-content-header hidden lg:flex">
            <div class="admin-page-title">
              <h1>${getActiveTabLabel()}</h1>
              <p class="admin-page-subtitle">${getActiveTabDescription()}</p>
            </div>
            <div class="admin-header-actions">
              <div class="admin-current-show-badge">
                <div class="admin-show-badge-indicator ${adminShow().season === 'spring' ? 'spring' : 'fall'}"></div>
                <span>${adminShow().shortName}</span>
              </div>
              <div class="admin-user-badge-desktop">
                <ion-icon name="person-circle-outline"></ion-icon>
                ${state.user?.email?.split('@')[0]}
              </div>
            </div>
          </header>

          <!-- Content Area -->
          <div class="admin-content">
            <div id="tabContent">
              ${renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    `;

    // Wire up sidebar toggle
    const sidebarToggle = root.querySelector('#sidebarToggle');
    const sidebarClose = root.querySelector('#sidebarClose');
    const sidebarOverlay = root.querySelector('#sidebarOverlay');
    
    if (sidebarToggle) {
      sidebarToggle.onclick = () => {
        sidebarOpen = true;
        render();
      };
    }
    
    if (sidebarClose) {
      sidebarClose.onclick = () => {
        sidebarOpen = false;
        render();
      };
    }
    
    if (sidebarOverlay) {
      sidebarOverlay.onclick = () => {
        sidebarOpen = false;
        render();
      };
    }

    // Wire up tab navigation
    root.querySelectorAll('.admin-nav-item').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        sidebarOpen = false; // Close sidebar on mobile after selection
        render();
        initializeTab();
      };
    });

    // Wire up show selector
    root.querySelectorAll('.admin-show-pill').forEach(btn => {
      btn.onclick = () => {
        const newShowId = btn.dataset.showId;
        if (newShowId !== adminShowId) {
          adminShowId = newShowId;
          // Also update the global show context (optional - could keep them separate)
          setCurrentShow(newShowId);
          // Re-render and reload data for the new show
          render();
          initializeTab();
          Toast(`Now viewing: ${adminShow().shortName}`, 'success');
        }
      };
    });

    initializeTab();
  }

  function getActiveTabLabel() {
    for (const section of navSections) {
      const item = section.items.find(i => i.key === activeTab);
      if (item) return item.label;
    }
    return 'Dashboard';
  }

  function getActiveTabDescription() {
    const descriptions = {
      overview: 'System statistics and quick insights',
      analytics: 'Detailed charts and performance metrics',
      vendors: 'Manage vendor accounts and profiles',
      users: 'View and manage attendee accounts',
      leads: 'All card swaps and lead exchanges',
      booths: 'Configure booth layout and assignments',
      import: 'Import vendor data from CSV or other sources',
      payments: 'Process payments and view transactions',
      ads: 'Manage promotional content and banners',
      admins: 'Manage admin user access',
      floorplan: 'Configure floor plan layout and booth placement'
    };
    return descriptions[activeTab] || '';
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'analytics':
        return renderAnalyticsDashboard();
      case 'vendors':
        return renderVendorsTab();
      case 'import':
        return renderImportTab();
      case 'leads':
        return renderLeadsTab();
      case 'users':
        return renderUsersTab();
      case 'booths':
        return renderBoothsTab();
      case 'payments':
        return renderPaymentsTab();
      case 'ads':
        return renderAdsTab();
      case 'floorplan':
        return renderFloorPlanTab();
      case 'shows':
        return renderShowsTab();
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
    // Get current show filter for data queries
    const showFilter = { showId: adminShowId };
    
    switch (activeTab) {
      case 'overview':
        await loadOverview();
        break;
      case 'analytics':
        await loadAnalytics();
        break;
      case 'vendors':
        await loadVendors(root, showFilter, showVendorProfileModal, showStripePaymentModal);
        break;
      case 'import':
        await setupImportListeners(root);
        break;
      case 'leads':
        await loadLeads();
        break;
      case 'users':
        await loadUsers(root, showUserProfileModal, showFilter);
        break;
      case 'booths':
        await loadBooths(root, showFilter);
        break;
      case 'payments':
        await loadPayments(root, showFilter, showStripePaymentModal);
        break;
      case 'ads':
        await loadAdsTab(root, showFilter);
        break;
      case 'floorplan':
        await loadFloorPlan(root, showFilter);
        break;
      case 'shows':
        await loadShowsTab(root);
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

      // Filter by selected show (legacy data without showId belongs to default show)
      let totalVendors = 0;
      let totalRevenue = 0;
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          totalVendors++;
          if (data.totalPrice) totalRevenue += data.totalPrice;
        }
      });
      
      let totalAttendees = 0;
      attendeesSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          totalAttendees++;
        }
      });
      
      const totalUsers = totalAttendees + totalVendors;
      const totalBooths = boothsSnap.size;

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

      // Filter by selected show (legacy data without showId belongs to default show)
      const vendors = [];
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          vendors.push({ id: doc.id, ...data });
        }
      });
      
      const attendees = [];
      attendeesSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          attendees.push({ id: doc.id, ...data });
        }
      });
      
      const leads = [];
      leadsSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          leads.push({ id: doc.id, ...data });
        }
      });

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
  // Leads Tab (All swapped cards per company)
  // ========================================
  function renderLeadsTab() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <h2 class="text-2xl font-bold text-glass">All Leads (Card Swaps)</h2>
          <div class="flex gap-3">
            <select id="leadsVendorFilter" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
              <option value="all">All Vendors</option>
            </select>
            <button class="bg-brand px-4 py-2 rounded text-white" id="refreshLeadsBtn">
              <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
            </button>
            <button class="bg-green-600 px-4 py-2 rounded text-white" id="exportLeadsBtn">
              <ion-icon name="download-outline" class="mr-1"></ion-icon>Export CSV
            </button>
          </div>
        </div>

        <!-- Search & Lead Type Filters -->
        <div class="glass-card p-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1 relative">
              <ion-icon name="search-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-glass-secondary"></ion-icon>
              <input type="text" id="leadsSearchInput" placeholder="Search by name or email..."
                     class="w-full pl-10 pr-3 py-2 bg-glass-surface border border-glass-border rounded text-glass text-sm" />
            </div>
            <div class="flex gap-2 flex-wrap" id="leadsTypeFilter">
              <button class="leads-type-btn px-3 py-2 rounded text-sm font-medium bg-brand text-white" data-type="all">
                All Types
              </button>
              <button class="leads-type-btn px-3 py-2 rounded text-sm font-medium bg-glass-surface border border-glass-border text-glass-secondary" data-type="card_share">
                <ion-icon name="swap-horizontal-outline" class="mr-1"></ion-icon>Card Share
              </button>
              <button class="leads-type-btn px-3 py-2 rounded text-sm font-medium bg-glass-surface border border-glass-border text-glass-secondary" data-type="manual">
                <ion-icon name="create-outline" class="mr-1"></ion-icon>Manual
              </button>
            </div>
          </div>
        </div>

        <div id="leadsStats" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
        <div id="leadsFilteredCount" class="text-sm text-glass-secondary"></div>
        <div id="leadsList" class="space-y-3">
          <div class="glass-card p-8 text-center text-glass-secondary">
            Loading leads...
          </div>
        </div>
      </div>
    `;
  }

  let allLeadsData = [];
  let allVendorsMap = {};
  let leadsSearchQuery = '';
  let leadsTypeFilter = 'all';
  let leadsSearchDebounceTimer = null;

  async function loadLeads() {
    const listEl = root.querySelector('#leadsList');
    const statsEl = root.querySelector('#leadsStats');
    const filterEl = root.querySelector('#leadsVendorFilter');
    const refreshBtn = root.querySelector('#refreshLeadsBtn');
    const exportBtn = root.querySelector('#exportLeadsBtn');
    const searchInput = root.querySelector('#leadsSearchInput');
    const typeFilterBtns = root.querySelectorAll('.leads-type-btn');
    if (!listEl) return;

    // Wire up refresh
    if (refreshBtn && !refreshBtn._listenerAdded) {
      refreshBtn._listenerAdded = true;
      refreshBtn.addEventListener('click', () => loadLeads());
    }

    // Wire up export
    if (exportBtn && !exportBtn._listenerAdded) {
      exportBtn._listenerAdded = true;
      exportBtn.addEventListener('click', () => exportLeadsCsv());
    }

    // Wire up search (debounced 300ms)
    if (searchInput && !searchInput._listenerAdded) {
      searchInput._listenerAdded = true;
      searchInput.value = leadsSearchQuery; // Restore previous query
      searchInput.addEventListener('input', () => {
        clearTimeout(leadsSearchDebounceTimer);
        leadsSearchDebounceTimer = setTimeout(() => {
          leadsSearchQuery = searchInput.value.trim();
          renderLeadsList();
        }, 300);
      });
    }

    // Wire up lead type filter buttons
    typeFilterBtns.forEach(btn => {
      if (btn._listenerAdded) return;
      btn._listenerAdded = true;
      btn.addEventListener('click', () => {
        leadsTypeFilter = btn.dataset.type;
        // Update button styles
        root.querySelectorAll('.leads-type-btn').forEach(b => {
          if (b.dataset.type === leadsTypeFilter) {
            b.className = 'leads-type-btn px-3 py-2 rounded text-sm font-medium bg-brand text-white';
          } else {
            b.className = 'leads-type-btn px-3 py-2 rounded text-sm font-medium bg-glass-surface border border-glass-border text-glass-secondary';
          }
        });
        renderLeadsList();
      });
    });

    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      // Load all vendors for the filter dropdown (filtered by show)
      const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
      allVendorsMap = {};
      vendorsSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          allVendorsMap[doc.id] = { id: doc.id, ...data };
        }
      });

      // Populate vendor filter dropdown
      if (filterEl) {
        filterEl.innerHTML = '<option value="all">All Vendors</option>' +
          Object.values(allVendorsMap)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(v => `<option value="${v.id}">${v.name || v.companyName || v.id}</option>`)
            .join('');

        if (!filterEl._listenerAdded) {
          filterEl._listenerAdded = true;
          filterEl.addEventListener('change', () => renderLeadsList());
        }
      }

      // Load all leads (filtered by show)
      const leadsSnap = await fsm.getDocs(fsm.collection(db, 'leads'));
      allLeadsData = [];
      leadsSnap.forEach(doc => {
        const data = doc.data();
        const docShowId = data.showId || DEFAULT_SHOW_ID;
        if (docShowId === adminShowId) {
          allLeadsData.push({ id: doc.id, ...data });
        }
      });

      // Sort by date (newest first)
      allLeadsData.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bDate - aDate;
      });

      renderLeadsStats();
      renderLeadsList();

    } catch (error) {
      console.error('[AdminDashboard] Failed to load leads:', error);
      listEl.innerHTML = `
        <div class="glass-card p-8 text-center text-red-400">
          <ion-icon name="warning-outline" class="text-3xl mb-2"></ion-icon>
          <p>Failed to load leads</p>
        </div>
      `;
    }
  }

  function renderLeadsStats() {
    const statsEl = root.querySelector('#leadsStats');
    if (!statsEl) return;

    const totalLeads = allLeadsData.length;
    const uniqueVendors = new Set(allLeadsData.map(l => l.vendorId)).size;
    const uniqueAttendees = new Set(allLeadsData.map(l => l.attendeeId || l.attendee_id)).size;
    const todayCount = allLeadsData.filter(l => {
      const date = l.createdAt?.toDate?.() || new Date(l.createdAt || 0);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length;

    statsEl.innerHTML = `
      <div class="glass-card p-4 text-center">
        <div class="text-3xl font-bold text-brand">${totalLeads}</div>
        <div class="text-sm text-glass-secondary">Total Leads</div>
      </div>
      <div class="glass-card p-4 text-center">
        <div class="text-3xl font-bold text-green-400">${todayCount}</div>
        <div class="text-sm text-glass-secondary">Today</div>
      </div>
      <div class="glass-card p-4 text-center">
        <div class="text-3xl font-bold text-blue-400">${uniqueVendors}</div>
        <div class="text-sm text-glass-secondary">Vendors w/ Leads</div>
      </div>
      <div class="glass-card p-4 text-center">
        <div class="text-3xl font-bold text-purple-400">${uniqueAttendees}</div>
        <div class="text-sm text-glass-secondary">Unique Attendees</div>
      </div>
    `;
  }

  /**
   * Applies all active filters (vendor, type, search) and returns the filtered leads array.
   * Shared by both renderLeadsList and exportLeadsCsv.
   */
  function getFilteredLeads() {
    const filterEl = root.querySelector('#leadsVendorFilter');
    const vendorFilter = filterEl?.value || 'all';
    let filtered = allLeadsData;

    // Vendor filter
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(l => l.vendorId === vendorFilter);
    }

    // Lead type filter (exchangeMethod)
    if (leadsTypeFilter !== 'all') {
      filtered = filtered.filter(l => {
        const method = (l.exchangeMethod || '').toLowerCase();
        if (leadsTypeFilter === 'card_share') {
          return method === 'card_share' || method === 'card share';
        }
        if (leadsTypeFilter === 'manual') {
          return method === 'manual' || method === '';
        }
        return true;
      });
    }

    // Text search filter (name or email, case-insensitive)
    if (leadsSearchQuery) {
      const q = leadsSearchQuery.toLowerCase();
      filtered = filtered.filter(l => {
        const name = (l.name || l.attendeeName || '').toLowerCase();
        const email = (l.email || l.attendeeEmail || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return filtered;
  }

  function renderLeadsList() {
    const listEl = root.querySelector('#leadsList');
    const countEl = root.querySelector('#leadsFilteredCount');
    if (!listEl) return;

    const filteredLeads = getFilteredLeads();
    const hasActiveFilters = leadsTypeFilter !== 'all' || leadsSearchQuery || (root.querySelector('#leadsVendorFilter')?.value || 'all') !== 'all';

    // Show filtered count when filters are active
    if (countEl) {
      if (hasActiveFilters) {
        countEl.textContent = `Showing ${filteredLeads.length} of ${allLeadsData.length} leads`;
      } else {
        countEl.textContent = '';
      }
    }

    if (filteredLeads.length === 0) {
      listEl.innerHTML = `
        <div class="glass-card p-8 text-center text-glass-secondary">
          <ion-icon name="swap-horizontal-outline" class="text-4xl mb-2"></ion-icon>
          <p>No leads found${hasActiveFilters ? ' matching your filters' : ''}</p>
          ${hasActiveFilters ? '<p class="text-xs mt-2">Try adjusting your search or filter criteria</p>' : ''}
        </div>
      `;
      return;
    }

    // Group leads by vendor
    const groupedByVendor = {};
    filteredLeads.forEach(lead => {
      const vendorId = lead.vendorId || 'unknown';
      if (!groupedByVendor[vendorId]) {
        groupedByVendor[vendorId] = [];
      }
      groupedByVendor[vendorId].push(lead);
    });

    listEl.innerHTML = Object.entries(groupedByVendor).map(([vendorId, leads]) => {
      const vendor = allVendorsMap[vendorId] || {};
      const vendorName = vendor.name || vendor.companyName || 'Unknown Vendor';

      return `
        <div class="glass-card p-4">
          <div class="flex items-center justify-between mb-3 pb-3 border-b border-glass-border">
            <div>
              <h3 class="text-lg font-semibold text-glass">${vendorName}</h3>
              <p class="text-sm text-glass-secondary">${leads.length} lead${leads.length !== 1 ? 's' : ''} captured</p>
            </div>
            <span class="bg-brand/20 text-brand px-3 py-1 rounded text-sm font-medium">${vendor.category || 'N/A'}</span>
          </div>
          <div class="space-y-2">
            ${leads.map(lead => {
              const name = lead.name || lead.attendeeName || 'Unknown';
              const email = lead.email || lead.attendeeEmail || '';
              const phone = lead.phone || lead.attendeePhone || '';
              const date = lead.createdAt?.toDate?.() || new Date(lead.createdAt || 0);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const method = (lead.exchangeMethod || '').toLowerCase();
              const isCardShare = method === 'card_share' || method === 'card share';
              const methodLabel = isCardShare ? 'Card Share' : 'Manual';
              const methodBadgeClass = isCardShare
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400';
              const notesEscaped = (lead.notes || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              return `
                <div class="bg-glass-surface/50 rounded p-3" data-lead-id="${lead.id}">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-medium text-glass">${name}</p>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${methodBadgeClass}">
                          <ion-icon name="${isCardShare ? 'swap-horizontal-outline' : 'create-outline'}" style="font-size:12px"></ion-icon>
                          ${methodLabel}
                        </span>
                      </div>
                      <div class="text-sm text-glass-secondary flex flex-wrap gap-3 mt-1">
                        ${email ? `<span><ion-icon name="mail-outline" class="mr-1"></ion-icon>${email}</span>` : ''}
                        ${phone ? `<span><ion-icon name="call-outline" class="mr-1"></ion-icon>${phone}</span>` : ''}
                      </div>
                    </div>
                    <div class="text-xs text-glass-secondary text-right whitespace-nowrap">
                      ${dateStr}
                    </div>
                  </div>
                  <!-- Inline editable notes -->
                  <div class="mt-2 lead-notes-container" data-lead-id="${lead.id}">
                    <div class="lead-notes-display cursor-pointer group flex items-start gap-2" data-lead-id="${lead.id}" title="Click to edit notes">
                      <ion-icon name="document-text-outline" class="text-glass-secondary mt-0.5" style="font-size:14px"></ion-icon>
                      <span class="text-xs ${lead.notes ? 'text-glass-secondary' : 'text-glass-secondary/50 italic'} group-hover:text-glass transition-colors">
                        ${lead.notes ? notesEscaped : 'Add notes...'}
                      </span>
                      <ion-icon name="pencil-outline" class="text-glass-secondary/50 group-hover:text-brand transition-colors ml-auto" style="font-size:12px"></ion-icon>
                    </div>
                    <div class="lead-notes-edit hidden" data-lead-id="${lead.id}">
                      <textarea class="lead-notes-textarea w-full p-2 bg-glass-surface border border-glass-border rounded text-glass text-xs resize-none"
                                rows="2" placeholder="Add notes about this lead..." data-lead-id="${lead.id}">${lead.notes || ''}</textarea>
                      <div class="flex justify-end gap-2 mt-1">
                        <button class="lead-notes-cancel text-xs px-2 py-1 border border-glass-border rounded text-glass-secondary hover:text-glass" data-lead-id="${lead.id}">
                          Cancel
                        </button>
                        <button class="lead-notes-save text-xs px-2 py-1 bg-brand rounded text-white" data-lead-id="${lead.id}">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Wire up inline notes editing
    wireLeadNotesListeners();
  }

  /**
   * Attaches click/save/cancel listeners for inline lead notes editing.
   */
  function wireLeadNotesListeners() {
    // Click to open edit mode
    root.querySelectorAll('.lead-notes-display').forEach(el => {
      if (el._listenerAdded) return;
      el._listenerAdded = true;
      el.addEventListener('click', () => {
        const leadId = el.dataset.leadId;
        const container = root.querySelector(`.lead-notes-container[data-lead-id="${leadId}"]`);
        if (!container) return;
        container.querySelector('.lead-notes-display').classList.add('hidden');
        container.querySelector('.lead-notes-edit').classList.remove('hidden');
        const textarea = container.querySelector('.lead-notes-textarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      });
    });

    // Cancel button
    root.querySelectorAll('.lead-notes-cancel').forEach(btn => {
      if (btn._listenerAdded) return;
      btn._listenerAdded = true;
      btn.addEventListener('click', () => {
        const leadId = btn.dataset.leadId;
        const container = root.querySelector(`.lead-notes-container[data-lead-id="${leadId}"]`);
        if (!container) return;
        // Restore original value
        const lead = allLeadsData.find(l => l.id === leadId);
        const textarea = container.querySelector('.lead-notes-textarea');
        if (textarea && lead) textarea.value = lead.notes || '';
        container.querySelector('.lead-notes-edit').classList.add('hidden');
        container.querySelector('.lead-notes-display').classList.remove('hidden');
      });
    });

    // Save button
    root.querySelectorAll('.lead-notes-save').forEach(btn => {
      if (btn._listenerAdded) return;
      btn._listenerAdded = true;
      btn.addEventListener('click', async () => {
        const leadId = btn.dataset.leadId;
        const container = root.querySelector(`.lead-notes-container[data-lead-id="${leadId}"]`);
        if (!container) return;
        const textarea = container.querySelector('.lead-notes-textarea');
        const newNotes = textarea?.value?.trim() || '';

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          const db = await getAdminDb();
          const fsm = await getFirestoreModule();
          await fsm.updateDoc(fsm.doc(db, 'leads', leadId), { notes: newNotes });

          // Update local data
          const lead = allLeadsData.find(l => l.id === leadId);
          if (lead) lead.notes = newNotes;

          Toast('Notes saved', 'success');

          // Re-render the list to reflect changes
          renderLeadsList();
        } catch (err) {
          console.error('[AdminDashboard] Failed to save lead notes:', err);
          Toast('Failed to save notes', 'error');
          btn.disabled = false;
          btn.textContent = 'Save';
        }
      });
    });
  }

  function exportLeadsCsv() {
    const filteredLeads = getFilteredLeads();

    if (filteredLeads.length === 0) {
      Toast('No leads to export (check your filters)');
      return;
    }

    const hasActiveFilters = leadsTypeFilter !== 'all' || leadsSearchQuery || (root.querySelector('#leadsVendorFilter')?.value || 'all') !== 'all';

    const headers = ['Vendor', 'Attendee Name', 'Email', 'Phone', 'Exchange Method', 'Notes', 'Date'];
    const rows = filteredLeads.map(lead => {
      const vendor = allVendorsMap[lead.vendorId] || {};
      const date = lead.createdAt?.toDate?.() || new Date(lead.createdAt || 0);
      const method = (lead.exchangeMethod || '').toLowerCase();
      const isCardShare = method === 'card_share' || method === 'card share';
      return [
        vendor.name || vendor.companyName || lead.vendorId || '',
        lead.name || lead.attendeeName || '',
        lead.email || lead.attendeeEmail || '',
        lead.phone || lead.attendeePhone || '',
        isCardShare ? 'Card Share' : 'Manual',
        lead.notes || '',
        date.toISOString()
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast(`${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} exported${hasActiveFilters ? ' (filtered)' : ''}`);
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
          await loadVendors(root, { showId: adminShowId }, showVendorProfileModal, showStripePaymentModal);
          
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
          vendorId: vendorIdVal,
          showId: adminShowId || ''
        };

        // Get auth token for authenticated request
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
        const idToken = await getAuth().currentUser?.getIdToken();
        const response = await fetch('/.netlify/functions/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) },
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

            // Send push notification to the vendor (if we can resolve ownerUid)
            try {
              const vendorSnap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorIdVal));
              const vendorData = vendorSnap.exists() ? vendorSnap.data() : null;
              const ownerUid = vendorData?.ownerUid;
              if (ownerUid) {
                const { sendPushNotification } = await import('../utils/notifications.js');
                await sendPushNotification({
                  template: 'invoiceSent',
                  userId: ownerUid,
                  data: {
                    amount: amount.toFixed(2),
                    invoiceUrl: result.invoiceUrl || '',
                    vendorId: vendorIdVal,
                    showId: adminShowId || ''
                  }
                });
              }
            } catch (pushErr) {
              console.warn('[AdminDashboard] Push notification failed (non-blocking):', pushErr);
            }
          } catch (firestoreError) {
            console.error('[AdminDashboard] Failed to update vendor payment status:', firestoreError);
          }

          closeModal();
          await AlertDialog('Invoice Sent', `Invoice sent successfully!\n\nInvoice ID: ${result.invoiceId}\nAmount: $${amount.toFixed(2)}\nSent to: ${vendorEmailVal}`, { type: 'success' });
          
          await loadVendors(root, { showId: adminShowId }, showVendorProfileModal, showStripePaymentModal);
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
