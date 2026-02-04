/**
 * Admin Users Module
 * Handles all user management functionality in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading, exportCsv, debounce } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';
import { DEFAULT_SHOW_ID } from '../../shows.js';

// Module state
let lastUsers = [];
let allUsers = []; // Full filtered list
let userCurrentPage = 1;
const USER_PAGE_SIZE = 25; // Items per page

/**
 * Render the users tab HTML template
 */
export function renderUsersTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">User Management</h2>
        <div class="flex items-center gap-3 flex-wrap">
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
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshUsers">Refresh</button>
          <button id="exportUsers" class="px-4 py-2 rounded border border-glass-border text-glass hover:text-white hover:bg-glass-surface/40">Export CSV</button>
        </div>
      </div>
      <div id="usersList">Loading users...</div>
      <div id="userPagination" class="mt-4 flex items-center justify-between flex-wrap gap-3">
        <!-- Pagination controls will be inserted here -->
      </div>
    </div>
  `;
}

/**
 * Load users data and render the list
 * @param {HTMLElement} root - The root container element
 * @param {Function} showUserModal - Callback to show user profile modal
 * @param {Object} options - Additional options (includes showId for show filtering)
 */
export async function loadUsers(root, showUserModal, options = {}) {
  const { resetPage = true, showId = null } = options;
  
  const usersList = root.querySelector('#usersList');
  const paginationEl = root.querySelector('#userPagination');
  if (!usersList) return;

  // Reset page on filter/search change
  if (resetPage) {
    userCurrentPage = 1;
  }

  try {
    console.log('[AdminUsers] Loading users...', showId ? `for show: ${showId}` : '(all shows)');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const [attendeesSnap, adminsSnap] = await Promise.all([
      fsm.getDocs(fsm.collection(db, 'attendees')),
      fsm.getDocs(fsm.collection(db, 'adminEmails'))
    ]);
    
    const adminSet = new Set();
    adminsSnap.forEach(d => adminSet.add(String(d.id).toLowerCase()));

    let users = [];
    attendeesSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    console.log('[AdminUsers] Users loaded:', users.length);

    // Filter by show if specified (legacy data without showId belongs to default show)
    if (showId) {
      users = users.filter(u => (u.showId || DEFAULT_SHOW_ID) === showId);
      console.log('[AdminUsers] Users after show filter:', users.length);
    }

    // Apply filters
    const q = String(root.querySelector('#userSearch')?.value || '').trim().toLowerCase();
    const roleFilter = root.querySelector('#userRoleFilter')?.value || 'all';
    
    if (q) {
      users = users.filter(u => [u.name, u.email].some(x => String(x || '').toLowerCase().includes(q)));
    }
    
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        users = users.filter(u => adminSet.has(String(u.email || '').toLowerCase()));
      } else {
        users = users.filter(u => (u.role || 'attendee') === roleFilter);
      }
    }

    // Store full list for export
    allUsers = users;
    lastUsers = users.map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'attendee',
      isAdmin: adminSet.has(String(u.email || '').toLowerCase()),
      ownerUid: u.ownerUid || '',
      createdAt: u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toISOString() : '',
      updatedAt: u.updatedAt?.seconds ? new Date(u.updatedAt.seconds * 1000).toISOString() : ''
    }));

    // Calculate pagination
    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / USER_PAGE_SIZE);
    const startIndex = (userCurrentPage - 1) * USER_PAGE_SIZE;
    const endIndex = Math.min(startIndex + USER_PAGE_SIZE, totalItems);
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Render user list
    usersList.innerHTML = `
      <div class="space-y-4">
        ${paginatedUsers.length === 0 ? `
          <div class="glass-card p-8 text-center">
            <div class="text-glass-secondary">
              <ion-icon name="people-outline" class="text-2xl mb-2"></ion-icon>
              <p>No users match the selected filter</p>
            </div>
          </div>
        ` : paginatedUsers.map(user => `
          <div class="glass-card p-4">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold text-glass truncate">${user.name || 'Unnamed User'}</h3>
                <p class="text-glass-secondary truncate">${user.email}</p>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <span class="text-sm text-glass-secondary">Role:</span>
                  <select class="bg-glass-surface border border-glass-border rounded px-2 py-1 text-glass text-sm user-role-select" 
                          data-user-id="${user.id}">
                    <option value="attendee" ${(!user.role || user.role === 'attendee') ? 'selected' : ''}>Attendee</option>
                    <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>Vendor</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                  <span class="inline-flex items-center gap-2 text-xs ${adminSet.has(String(user.email || '').toLowerCase()) ? 'text-green-400' : 'text-glass-secondary'}">
                    <ion-icon name="shield-checkmark-outline"></ion-icon>
                    ${adminSet.has(String(user.email || '').toLowerCase()) ? 'Admin access' : 'Not admin'}
                  </span>
                </div>
                ${user.ownerUid ? `<p class="text-xs text-glass-secondary mt-1 truncate">UID: ${user.ownerUid}</p>` : ''}
              </div>
              <div class="flex flex-col gap-2">
                <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" data-action="user-view" data-user-id="${user.id}">
                  <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                </button>
                <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" data-action="user-delete" data-user-id="${user.id}">
                  <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                </button>
                ${user.email ? `
                  ${adminSet.has(String(user.email).toLowerCase())
                    ? `<button class="px-3 py-1 bg-orange-700 rounded text-white text-sm" data-action="admin-revoke" data-admin-email="${String(user.email).toLowerCase()}">
                        <ion-icon name="remove-circle-outline" class="mr-1"></ion-icon>Revoke
                      </button>`
                    : `<button class="px-3 py-1 bg-green-700 rounded text-white text-sm" data-action="admin-grant" data-admin-email="${String(user.email).toLowerCase()}">
                        <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Grant
                      </button>`}
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Render pagination controls
    if (paginationEl) {
      paginationEl.innerHTML = renderUserPagination(totalItems, totalPages, userCurrentPage, startIndex, endIndex);
      setupUserPaginationListeners(root, paginationEl, totalPages, showUserModal);
    }

    // Setup event listeners
    setupUserListeners(root, showUserModal, adminSet);

  } catch (error) {
    console.error('[AdminUsers] Failed to load users:', error);
    usersList.innerHTML = '<div class="text-red-400">Failed to load users</div>';
  }
}

/**
 * Render user pagination controls
 */
function renderUserPagination(totalItems, totalPages, currentPage, startIndex, endIndex) {
  if (totalItems <= USER_PAGE_SIZE) {
    return `<div class="text-sm text-glass-secondary">Showing all ${totalItems} user${totalItems !== 1 ? 's' : ''}</div>`;
  }

  return `
    <div class="text-sm text-glass-secondary">
      Showing ${startIndex + 1}–${endIndex} of ${totalItems} users
    </div>
    <div class="flex items-center gap-2">
      <button id="userPrevPage" class="px-3 py-1 bg-glass-surface border border-glass-border rounded text-glass text-sm disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>
        <ion-icon name="chevron-back-outline"></ion-icon> Prev
      </button>
      <span class="text-glass text-sm px-2">Page ${currentPage} of ${totalPages}</span>
      <button id="userNextPage" class="px-3 py-1 bg-glass-surface border border-glass-border rounded text-glass text-sm disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>
        Next <ion-icon name="chevron-forward-outline"></ion-icon>
      </button>
    </div>
  `;
}

/**
 * Setup user pagination button listeners
 */
function setupUserPaginationListeners(root, paginationEl, totalPages, showUserModal) {
  const prevBtn = paginationEl.querySelector('#userPrevPage');
  const nextBtn = paginationEl.querySelector('#userNextPage');

  if (prevBtn && !prevBtn._listenerAdded) {
    prevBtn._listenerAdded = true;
    prevBtn.addEventListener('click', () => {
      if (userCurrentPage > 1) {
        userCurrentPage--;
        loadUsers(root, showUserModal, { resetPage: false });
      }
    });
  }

  if (nextBtn && !nextBtn._listenerAdded) {
    nextBtn._listenerAdded = true;
    nextBtn.addEventListener('click', () => {
      if (userCurrentPage < totalPages) {
        userCurrentPage++;
        loadUsers(root, showUserModal, { resetPage: false });
      }
    });
  }
}

/**
 * Setup all user-related event listeners
 */
function setupUserListeners(root, showUserModal) {
  const usersList = root.querySelector('#usersList');
  if (!usersList) return;

  // Reload helper
  const reloadUsers = () => loadUsers(root, showUserModal);

  // Export CSV
  const exportBtn = root.querySelector('#exportUsers');
  if (exportBtn && !exportBtn._listenerAdded) {
    exportBtn._listenerAdded = true;
    exportBtn.addEventListener('click', () => {
      exportCsv(`users_${new Date().toISOString().slice(0, 10)}.csv`, lastUsers);
    });
  }

  // Refresh button
  const refreshBtn = root.querySelector('#refreshUsers');
  if (refreshBtn && !refreshBtn._listenerAdded) {
    refreshBtn._listenerAdded = true;
    refreshBtn.addEventListener('click', reloadUsers);
  }

  // Search input with debounce
  const searchEl = root.querySelector('#userSearch');
  if (searchEl && !searchEl._listenerAdded) {
    searchEl._listenerAdded = true;
    const debouncedSearch = debounce(reloadUsers, 300);
    searchEl.addEventListener('input', debouncedSearch);
  }

  // Role filter
  const roleFilterEl = root.querySelector('#userRoleFilter');
  if (roleFilterEl && !roleFilterEl._listenerAdded) {
    roleFilterEl._listenerAdded = true;
    roleFilterEl.addEventListener('change', reloadUsers);
  }

  // Delegated events for users list
  if (usersList._listenerAdded) {
    console.log('[AdminUsers] Users list listener already attached, skipping');
    return;
  }
  usersList._listenerAdded = true;
  console.log('[AdminUsers] Attaching listeners for users list');

  // Role change handler
  usersList.addEventListener('change', async (e) => {
    const sel = e.target.closest('.user-role-select');
    if (!sel) return;
    
    const userId = sel.getAttribute('data-user-id');
    const newRole = sel.value;
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      await fsm.updateDoc(fsm.doc(db, 'attendees', userId), { role: newRole });
      
      const originalBg = sel.style.backgroundColor;
      sel.style.backgroundColor = '#10b981';
      setTimeout(() => { sel.style.backgroundColor = originalBg; }, 600);
    } catch (error) {
      console.error('[AdminUsers] Failed to update user role:', error);
      Toast('Failed to update user role');
      reloadUsers();
    }
  });

  // Action buttons handler
  usersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    
    const action = btn.getAttribute('data-action');
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      
      if (action === 'user-view') {
        setButtonLoading(btn, true, 'Loading...');
        const userId = btn.getAttribute('data-user-id');
        const userDoc = await fsm.getDoc(fsm.doc(db, 'attendees', userId));
        setButtonLoading(btn, false);
        if (userDoc.exists()) {
          showUserModal(userId, userDoc.data());
        }
      } else if (action === 'user-delete') {
        const userId = btn.getAttribute('data-user-id');
        const confirmed = await ConfirmDialog('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', { danger: true, confirmText: 'Delete' });
        if (!confirmed) return;
        
        setButtonLoading(btn, true, 'Deleting...');
        await fsm.deleteDoc(fsm.doc(db, 'attendees', userId));
        Toast('User deleted successfully');
        reloadUsers();
      } else if (action === 'admin-grant' || action === 'admin-revoke') {
        setButtonLoading(btn, true, action === 'admin-grant' ? 'Granting...' : 'Revoking...');
        const email = btn.getAttribute('data-admin-email');
        
        const { addAdminEmail, removeAdminEmail } = await import('../../firebase.js');
        const ok = action === 'admin-grant' 
          ? await addAdminEmail(email, null) 
          : await removeAdminEmail(email);
        
        if (ok) {
          Toast(action === 'admin-grant' ? 'Admin access granted' : 'Admin access revoked');
          reloadUsers();
        } else {
          setButtonLoading(btn, false);
          await AlertDialog('Failed', 'Failed to update admin access', { type: 'error' });
        }
      }
    } catch (err) {
      console.error('[AdminUsers] User action failed:', err);
      setButtonLoading(btn, false);
      await AlertDialog('Action Failed', 'Something went wrong. Check console for details.', { type: 'error' });
    }
  });
}

/**
 * Get the last loaded users for export
 */
export function getLastUsers() {
  return lastUsers;
}
