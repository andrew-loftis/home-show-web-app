/**
 * Admin Users Module
 * Handles all user management functionality in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading, exportCsv, debounce } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';

// Module state
let lastUsers = [];
let allUsers = []; // Full filtered list
let userCurrentPage = 1;
const USER_PAGE_SIZE = 25; // Items per page

async function getIdToken() {
  try {
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
    return await getAuth().currentUser?.getIdToken();
  } catch {
    return null;
  }
}

async function authHeaders() {
  const token = await getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function asMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value?.toDate === 'function') {
    try { return value.toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

function roleRank(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return 3;
  if (normalized === 'vendor') return 2;
  return 1;
}

function bestString(values = []) {
  const filtered = values
    .map(v => String(v || '').trim())
    .filter(Boolean);
  if (!filtered.length) return '';
  filtered.sort((a, b) => b.length - a.length);
  return filtered[0];
}

function parseSourceIds(value, fallbackId = '') {
  const parsed = String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  if (parsed.length) return Array.from(new Set(parsed));
  return fallbackId ? [fallbackId] : [];
}

function choosePrimaryUser(records = []) {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => {
    const aOwner = String(a.ownerUid || '').trim() ? 1 : 0;
    const bOwner = String(b.ownerUid || '').trim() ? 1 : 0;
    if (aOwner !== bOwner) return bOwner - aOwner;

    const aRole = roleRank(a.role);
    const bRole = roleRank(b.role);
    if (aRole !== bRole) return bRole - aRole;

    const aTime = asMillis(a.updatedAt || a.createdAt);
    const bTime = asMillis(b.updatedAt || b.createdAt);
    if (aTime !== bTime) return bTime - aTime;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return sorted[0];
}

function mergeDuplicateUsers(rawUsers = []) {
  const groups = new Map();

  for (const user of rawUsers) {
    const email = normalizeEmail(user.email);
    const ownerUid = String(user.ownerUid || '').trim();
    const key = email ? `email:${email}` : ownerUid ? `uid:${ownerUid}` : `doc:${user.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(user);
  }

  const merged = [];
  let duplicatesCombined = 0;

  groups.forEach((records) => {
    if (!records.length) return;
    const primary = choosePrimaryUser(records) || records[0];
    const sourceIds = Array.from(new Set(records.map(r => String(r.id || '').trim()).filter(Boolean)));
    if (sourceIds.length > 1) {
      duplicatesCombined += sourceIds.length - 1;
    }

    const normalizedEmail = normalizeEmail(bestString(records.map(r => r.email)));
    const mergedRole = records.reduce((best, row) => {
      return roleRank(row.role) > roleRank(best) ? String(row.role || 'attendee').toLowerCase() : best;
    }, String(primary.role || 'attendee').toLowerCase());

    const latest = [...records].sort((a, b) => asMillis(b.updatedAt || b.createdAt) - asMillis(a.updatedAt || a.createdAt))[0] || primary;
    const earliest = [...records].sort((a, b) => asMillis(a.createdAt || a.updatedAt) - asMillis(b.createdAt || b.updatedAt))[0] || primary;

    merged.push({
      ...primary,
      id: primary.id,
      name: bestString(records.map(r => r.name)) || primary.name || '',
      email: normalizedEmail || primary.email || '',
      role: mergedRole || 'attendee',
      ownerUid: bestString(records.map(r => r.ownerUid)) || primary.ownerUid || '',
      createdAt: earliest.createdAt || primary.createdAt || null,
      updatedAt: latest.updatedAt || latest.createdAt || primary.updatedAt || null,
      _sourceIds: sourceIds,
      _duplicateCount: sourceIds.length
    });
  });

  return { users: merged, duplicatesCombined };
}

function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return String(value).trim() === '';
}

function bestNonEmpty(values = []) {
  const list = values
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  if (!list.length) return '';
  list.sort((a, b) => b.length - a.length);
  return list[0];
}

function getUserSummary(record = {}) {
  return {
    id: String(record.id || ''),
    name: String(record.name || '').trim(),
    email: normalizeEmail(record.email),
    role: String(record.role || 'attendee').toLowerCase(),
    ownerUid: String(record.ownerUid || '').trim(),
    createdAt: asMillis(record.createdAt),
    updatedAt: asMillis(record.updatedAt || record.createdAt),
  };
}

function formatDateLabel(ms) {
  if (!ms) return '—';
  try { return new Date(ms).toLocaleString(); } catch { return '—'; }
}

async function showUserMergeModal(records = []) {
  if (!records.length) return null;

  return new Promise((resolve) => {
    const summaries = records.map(getUserSummary);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-glass-surface border border-glass-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-5 border-b border-glass-border">
          <h3 class="text-xl font-bold text-glass">Merge Duplicate Users</h3>
          <p class="text-sm text-glass-secondary mt-1">Select one user record to keep and purge the others.</p>
        </div>
        <div class="p-5 space-y-4">
          <div class="grid md:grid-cols-2 gap-3">
            ${summaries.map((record, idx) => `
              <label class="glass-card p-3 border border-glass-border cursor-pointer">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-glass font-medium">${escHtml(record.name || `User ${idx + 1}`)}</p>
                    <p class="text-xs text-glass-secondary break-all">${escHtml(record.email || 'No email')}</p>
                    <p class="text-xs text-glass-secondary mt-1">Role: ${escHtml(record.role || 'attendee')}</p>
                    <p class="text-xs text-glass-secondary">UID: ${escHtml(record.ownerUid || '—')}</p>
                    <p class="text-[11px] text-glass-secondary mt-1">Created: ${escHtml(formatDateLabel(record.createdAt))}</p>
                    <p class="text-[11px] text-glass-secondary">Updated: ${escHtml(formatDateLabel(record.updatedAt))}</p>
                    <p class="text-[11px] text-glass-secondary break-all mt-1">Doc: ${escHtml(record.id)}</p>
                  </div>
                  <input type="radio" name="keepUserDoc" value="${escHtml(record.id)}" ${idx === 0 ? 'checked' : ''} class="accent-brand mt-1" />
                </div>
              </label>
            `).join('')}
          </div>
          <label class="inline-flex items-center gap-2 text-sm text-glass-secondary">
            <input id="mergeMissingUserFields" type="checkbox" class="accent-brand" checked />
            Fill missing fields on kept record using data from purged copies
          </label>
        </div>
        <div class="p-5 border-t border-glass-border flex justify-end gap-3">
          <button id="cancelUserMergeBtn" class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">Cancel</button>
          <button id="confirmUserMergeBtn" class="px-4 py-2 bg-red-600 rounded text-white">Merge & Purge</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const cleanup = () => overlay.remove();

    overlay.querySelector('#cancelUserMergeBtn')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    overlay.querySelector('#confirmUserMergeBtn')?.addEventListener('click', () => {
      const keepId = overlay.querySelector('input[name="keepUserDoc"]:checked')?.value || '';
      const mergeMissing = !!overlay.querySelector('#mergeMissingUserFields')?.checked;
      if (!keepId) {
        Toast('Select a user record to keep');
        return;
      }
      cleanup();
      resolve({ keepId, mergeMissing });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });
  });
}

async function fetchUserSourceRecords(db, fsm, sourceIds = []) {
  const records = [];
  for (const id of sourceIds) {
    const snap = await fsm.getDoc(fsm.doc(db, 'attendees', id));
    if (snap.exists()) {
      records.push({ id: snap.id, ...snap.data() });
    }
  }
  return records;
}

function buildUserMergePatch(records = [], keepId, mergeMissing = true) {
  const keep = records.find((record) => record.id === keepId) || records[0];
  const patch = {
    mergedFromIds: records.map((record) => record.id).filter((id) => id !== keep.id),
    mergedAt: new Date().toISOString(),
  };

  if (mergeMissing) {
    patch.name = String(keep.name || '').trim() || bestNonEmpty(records.map((record) => record.name));
    patch.email = normalizeEmail(keep.email) || normalizeEmail(bestNonEmpty(records.map((record) => record.email)));
    patch.ownerUid = String(keep.ownerUid || '').trim() || bestNonEmpty(records.map((record) => record.ownerUid));
    patch.role = records.reduce((best, row) => {
      const current = String(row.role || 'attendee').toLowerCase();
      return roleRank(current) > roleRank(best) ? current : best;
    }, String(keep.role || 'attendee').toLowerCase());
  }

  if (isBlank(patch.role) && !isBlank(keep.role)) {
    patch.role = String(keep.role || 'attendee').toLowerCase();
  }

  return { keepRecord: keep, patch };
}

async function mergeUserDuplicateGroup(db, fsm, sourceIds = [], keepId, mergeMissing = true) {
  const records = await fetchUserSourceRecords(db, fsm, sourceIds);
  if (records.length < 2) {
    throw new Error('Need at least two user records to merge');
  }

  const validKeepId = records.some((record) => record.id === keepId) ? keepId : records[0].id;
  const purgeIds = records.map((record) => record.id).filter((id) => id !== validKeepId);
  const { patch } = buildUserMergePatch(records, validKeepId, mergeMissing);

  await fsm.updateDoc(fsm.doc(db, 'attendees', validKeepId), {
    ...patch,
    updatedAt: fsm.serverTimestamp(),
  });

  await Promise.all(purgeIds.map((id) =>
    fsm.deleteDoc(fsm.doc(db, 'attendees', id)).catch(() => null)
  ));

  return {
    keepId: validKeepId,
    purgedCount: purgeIds.length,
  };
}

function normalizeUserRole(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'vendor') return 'vendor';
  if (normalized === 'admin') return 'admin';
  return 'attendee';
}

async function sendAppInviteEmail({ to, attendeeName, role, resetLink, userId }) {
  const response = await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      to,
      template: 'appInvite',
      data: {
        attendeeName,
        role,
        resetLink: resetLink || '',
        userId: userId || '',
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Invite email failed (${response.status})`);
  }
  return payload;
}

async function sendPasswordResetFallback(email) {
  const response = await fetch('/.netlify/functions/send-password-reset', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ email })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Password reset email failed (${response.status})`);
  }
  return payload;
}

async function ensureAuthAccountWithResetLink({ email, displayName }) {
  const response = await fetch('/.netlify/functions/create-vendor-account', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      email,
      displayName: displayName || '',
      sendPasswordReset: true
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 200) {
    throw new Error(payload.error || `Failed to create auth account (${response.status})`);
  }

  return {
    uid: String(payload.uid || '').trim(),
    resetLink: String(payload.resetLink || '').trim(),
    isNewUser: payload.isNewUser === true
  };
}

async function sendUserInviteAndReset({ email, attendeeName, role, userId = '' }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeUserRole(role);
  const safeName = String(attendeeName || '').trim() || normalizedEmail.split('@')[0] || 'there';

  if (!normalizedEmail) {
    throw new Error('Missing email');
  }

  let authUid = '';
  let resetLink = '';
  let inviteSent = false;
  let resetFallbackSent = false;
  let inviteError = null;
  let accountError = null;

  try {
    const account = await ensureAuthAccountWithResetLink({
      email: normalizedEmail,
      displayName: safeName
    });
    authUid = account.uid || '';
    resetLink = account.resetLink || '';
  } catch (error) {
    accountError = error?.message || 'auth_account_setup_failed';
  }

  try {
    const invitePayload = await sendAppInviteEmail({
      to: normalizedEmail,
      attendeeName: safeName,
      role: normalizedRole,
      resetLink,
      userId
    });
    inviteSent = !!invitePayload?.success;
  } catch (error) {
    inviteError = error?.message || 'invite_email_failed';
  }

  if (!inviteSent) {
    try {
      const resetPayload = await sendPasswordResetFallback(normalizedEmail);
      resetFallbackSent = !!resetPayload?.success;
    } catch (error) {
      inviteError = error?.message || inviteError || accountError || 'password_reset_fallback_failed';
    }
  }

  return {
    inviteSent,
    resetFallbackSent,
    authUid,
    resetLink,
    error: inviteSent || resetFallbackSent ? null : (inviteError || accountError || 'invite_failed')
  };
}

async function showCreateUserModal(root, reloadFn) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-glass-surface border border-glass-border rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="p-6 border-b border-glass-border">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-glass">Create User & Invite</h3>
          <button id="closeCreateUserModal" class="text-glass-secondary hover:text-glass p-2">
            <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
          </button>
        </div>
        <p class="text-glass-secondary text-sm mt-1">Create a user account and email them a password setup invite.</p>
      </div>
      <form id="createUserForm" class="p-6 space-y-4">
        <div>
          <label class="block text-sm text-glass-secondary mb-1">Full Name <span class="text-red-400">*</span></label>
          <input type="text" name="name" required class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="Jane Doe" />
        </div>
        <div>
          <label class="block text-sm text-glass-secondary mb-1">Email <span class="text-red-400">*</span></label>
          <input type="email" name="email" required class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="jane@example.com" />
        </div>
        <div>
          <label class="block text-sm text-glass-secondary mb-1">Role</label>
          <select name="role" class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass">
            <option value="attendee">Attendee</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-glass-secondary">
          <input type="checkbox" name="sendInvite" class="accent-brand" checked />
          Send invite email with password setup link
        </label>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancelCreateUserModal" class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-green-600 rounded text-white">
            <ion-icon name="person-add-outline" class="mr-1"></ion-icon>Create User
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => overlay.remove();
  overlay.querySelector('#closeCreateUserModal')?.addEventListener('click', cleanup);
  overlay.querySelector('#cancelCreateUserModal')?.addEventListener('click', cleanup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

  overlay.querySelector('#createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Creating...');

    try {
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const email = normalizeEmail(fd.get('email'));
      const role = normalizeUserRole(fd.get('role'));
      const sendInvite = fd.get('sendInvite') === 'on';

      if (!name || !email) {
        throw new Error('Name and email are required');
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      if (role === 'admin') {
        const { addAdminEmail } = await import('../../firebase.js');
        const granted = await addAdminEmail(email, null);
        if (!granted) {
          throw new Error('Failed to grant admin access. Please try again.');
        }
      }

      const existingQuery = fsm.query(
        fsm.collection(db, 'attendees'),
        fsm.where('email', '==', email)
      );
      const existingSnap = await fsm.getDocs(existingQuery);

      let userRef = null;
      if (!existingSnap.empty) {
        userRef = existingSnap.docs[0].ref;
        await fsm.updateDoc(userRef, {
          name,
          email,
          role,
          updatedAt: fsm.serverTimestamp(),
          createdBy: 'admin',
        });
      } else {
        userRef = await fsm.addDoc(fsm.collection(db, 'attendees'), {
          name,
          email,
          role,
          createdAt: fsm.serverTimestamp(),
          updatedAt: fsm.serverTimestamp(),
          createdBy: 'admin',
          inviteStatus: sendInvite ? 'pending' : 'not_sent',
        });
      }

      let inviteSent = false;
      let resetFallbackSent = false;
      let inviteError = null;
      let authUid = null;
      let resetLink = '';

      if (sendInvite) {
        const inviteResult = await sendUserInviteAndReset({
          email,
          attendeeName: name,
          role,
          userId: userRef.id || userRef?.id || '',
        });
        inviteSent = inviteResult.inviteSent;
        resetFallbackSent = inviteResult.resetFallbackSent;
        inviteError = inviteResult.error;
        authUid = inviteResult.authUid || null;
        resetLink = inviteResult.resetLink || '';
      }

      const invitePatch = {
        inviteStatus: sendInvite
          ? (inviteSent ? 'sent' : (resetFallbackSent ? 'reset_sent_only' : 'failed'))
          : 'not_sent',
        inviteSentAt: inviteSent ? fsm.serverTimestamp() : null,
        inviteError: sendInvite && !inviteSent ? (inviteError || 'invite_email_failed') : null,
        passwordResetStatus: sendInvite
          ? (inviteSent && resetLink ? 'included_in_invite' : (resetFallbackSent ? 'sent' : 'failed'))
          : 'skipped',
        passwordResetSentAt: resetFallbackSent ? fsm.serverTimestamp() : null,
        updatedAt: fsm.serverTimestamp(),
      };
      if (authUid) invitePatch.ownerUid = authUid;

      await fsm.updateDoc(fsm.doc(db, 'attendees', userRef.id), invitePatch);

      if (!sendInvite) {
        Toast('User created (no invite sent).');
      } else if (inviteSent) {
        Toast('User created and invite email sent.');
      } else if (resetFallbackSent) {
        Toast('User created. Invite email failed, but password reset email was sent.');
      } else {
        Toast('User created, but invite email failed. Use password reset to resend.');
      }

      cleanup();
      if (typeof reloadFn === 'function') reloadFn();
    } catch (error) {
      console.error('[AdminUsers] Create user failed:', error);
      await AlertDialog('Create User Failed', error.message || 'Could not create user', { type: 'error' });
      setButtonLoading(submitBtn, false);
      return;
    }

    setButtonLoading(submitBtn, false);
  });
}

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
              <option value="attendee">Guests</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin (flag)</option>
            </select>
          </div>
          <button class="bg-green-600 px-4 py-2 rounded text-white" id="createUserBtn">
            <ion-icon name="person-add-outline" class="mr-1"></ion-icon>Create User
          </button>
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
    const rawCount = users.length;
    const merged = mergeDuplicateUsers(users);
    users = merged.users;
    console.log('[AdminUsers] Users loaded:', rawCount, `merged to ${users.length}`);

    // Users tab is global by design: include all guest/attendee records.

    const existingEmails = new Set(users.map((u) => normalizeEmail(u.email)).filter(Boolean));
    for (const adminEmail of adminSet) {
      if (existingEmails.has(adminEmail)) continue;
      users.push({
        id: `admin-email:${adminEmail}`,
        name: adminEmail.split('@')[0] || 'Admin User',
        email: adminEmail,
        role: 'admin',
        ownerUid: '',
        createdAt: null,
        updatedAt: null,
        _sourceIds: [],
        _duplicateCount: 1,
        _adminOnly: true
      });
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
      } else if (roleFilter === 'attendee') {
        users = users.filter((u) => {
          const email = String(u.email || '').toLowerCase();
          return (u.role || 'attendee') === 'attendee' || adminSet.has(email);
        });
      } else {
        users = users.filter(u => (u.role || 'attendee') === roleFilter);
      }
    }

    // Store full list for export
    allUsers = users;
    lastUsers = users.map(u => ({
      id: u.id,
      sourceCount: Number(u._duplicateCount || 1),
      sourceIds: (u._sourceIds || [u.id]).join(','),
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
        ${merged.duplicatesCombined > 0 ? `
          <div class="glass-card p-3 border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm">
            Combined ${merged.duplicatesCombined} duplicate user record${merged.duplicatesCombined === 1 ? '' : 's'} by email/UID.
          </div>
        ` : ''}
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
                  ${user._adminOnly ? `
                    <span class="text-sm text-glass">Admin (email allowlist)</span>
                  ` : `
                    <select class="bg-glass-surface border border-glass-border rounded px-2 py-1 text-glass text-sm user-role-select" 
                            data-user-id="${user.id}"
                            data-source-ids="${(user._sourceIds || [user.id]).join(',')}">
                      <option value="attendee" ${(!user.role || user.role === 'attendee') ? 'selected' : ''}>Attendee</option>
                      <option value="vendor" ${user.role === 'vendor' ? 'selected' : ''}>Vendor</option>
                      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                  `}
                  <span class="inline-flex items-center gap-2 text-xs ${adminSet.has(String(user.email || '').toLowerCase()) ? 'text-green-400' : 'text-glass-secondary'}">
                    <ion-icon name="shield-checkmark-outline"></ion-icon>
                    ${adminSet.has(String(user.email || '').toLowerCase()) ? 'Admin access' : 'Not admin'}
                  </span>
                  ${Number(user._duplicateCount || 1) > 1 ? `
                    <span class="inline-flex items-center gap-1 text-xs text-yellow-300">
                      <ion-icon name="layers-outline"></ion-icon>
                      Merged ${Number(user._duplicateCount || 1)} records
                    </span>
                  ` : ''}
                </div>
                ${user.ownerUid ? `<p class="text-xs text-glass-secondary mt-1 truncate">UID: ${user.ownerUid}</p>` : ''}
              </div>
              <div class="flex flex-col gap-2">
                ${!user._adminOnly ? `
                  <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" data-action="user-view" data-user-id="${user.id}" data-source-ids="${(user._sourceIds || [user.id]).join(',')}">
                    <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                  </button>
                  ${Number(user._duplicateCount || 1) > 1 ? `
                    <button class="bg-yellow-600 px-3 py-1 rounded text-white text-sm" data-action="user-merge" data-user-id="${user.id}" data-source-ids="${(user._sourceIds || [user.id]).join(',')}">
                      <ion-icon name="git-merge-outline" class="mr-1"></ion-icon>Merge
                    </button>
                  ` : ''}
                  <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" data-action="user-delete" data-user-id="${user.id}" data-source-ids="${(user._sourceIds || [user.id]).join(',')}">
                    <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete
                  </button>
                ` : ''}
                ${user.email ? `
                  <button class="bg-indigo-600 px-3 py-1 rounded text-white text-sm" data-action="user-send-invite" data-user-id="${user.id}" data-source-ids="${(user._sourceIds || [user.id]).join(',')}" data-user-email="${String(user.email || '').toLowerCase()}" data-user-name="${escHtml(user.name || '')}" data-user-role="${adminSet.has(String(user.email || '').toLowerCase()) ? 'admin' : (user.role || 'attendee')}">
                    <ion-icon name="mail-open-outline" class="mr-1"></ion-icon>${adminSet.has(String(user.email || '').toLowerCase()) ? 'Invite Admin' : 'Invite / Reset'}
                  </button>
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

  // Create user button
  const createUserBtn = root.querySelector('#createUserBtn');
  if (createUserBtn && !createUserBtn._listenerAdded) {
    createUserBtn._listenerAdded = true;
    createUserBtn.addEventListener('click', () => {
      showCreateUserModal(root, reloadUsers);
    });
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
    const sourceIds = parseSourceIds(sel.getAttribute('data-source-ids'), userId);
    const newRole = sel.value;
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      await Promise.all(sourceIds.map((id) =>
        fsm.updateDoc(fsm.doc(db, 'attendees', id), { role: newRole }).catch(() => null)
      ));
      
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
        const sourceIds = parseSourceIds(btn.getAttribute('data-source-ids'), userId);
        let userDoc = await fsm.getDoc(fsm.doc(db, 'attendees', userId));
        if (!userDoc.exists() && sourceIds.length > 1) {
          for (const id of sourceIds) {
            userDoc = await fsm.getDoc(fsm.doc(db, 'attendees', id));
            if (userDoc.exists()) break;
          }
        }
        setButtonLoading(btn, false);
        if (userDoc.exists()) {
          showUserModal(userDoc.id, userDoc.data());
        }
      } else if (action === 'user-merge') {
        const userId = btn.getAttribute('data-user-id');
        const sourceIds = parseSourceIds(btn.getAttribute('data-source-ids'), userId);
        const records = await fetchUserSourceRecords(db, fsm, sourceIds);
        if (records.length < 2) {
          Toast('No duplicate user records found');
          return;
        }

        const choice = await showUserMergeModal(records);
        if (!choice) return;

        const keepRecord = records.find((record) => record.id === choice.keepId) || records[0];
        const purgeCount = records.length - 1;
        const confirmed = await ConfirmDialog(
          'Confirm Merge',
          `Keep "${keepRecord.name || keepRecord.email || keepRecord.id}" and purge ${purgeCount} duplicate record${purgeCount === 1 ? '' : 's'}?`,
          { danger: true, confirmText: 'Merge & Purge' }
        );
        if (!confirmed) return;

        setButtonLoading(btn, true, 'Merging...');
        const result = await mergeUserDuplicateGroup(db, fsm, sourceIds, choice.keepId, choice.mergeMissing);
        Toast(`Merged user duplicates: kept 1, purged ${result.purgedCount}.`);
        reloadUsers();
      } else if (action === 'user-delete') {
        const userId = btn.getAttribute('data-user-id');
        const sourceIds = parseSourceIds(btn.getAttribute('data-source-ids'), userId);
        const confirmed = await ConfirmDialog(
          'Delete User',
          `Are you sure you want to delete this user${sourceIds.length > 1 ? ` and ${sourceIds.length - 1} duplicate record${sourceIds.length - 1 === 1 ? '' : 's'}` : ''}? This action cannot be undone.`,
          { danger: true, confirmText: 'Delete' }
        );
        if (!confirmed) return;
        
        setButtonLoading(btn, true, 'Deleting...');
        await Promise.all(sourceIds.map((id) =>
          fsm.deleteDoc(fsm.doc(db, 'attendees', id)).catch(() => null)
        ));
        Toast(`User deleted (${sourceIds.length} record${sourceIds.length === 1 ? '' : 's'})`);
        reloadUsers();
      } else if (action === 'user-send-invite') {
        const email = normalizeEmail(btn.getAttribute('data-user-email'));
        const name = String(btn.getAttribute('data-user-name') || '').trim();
        const role = normalizeUserRole(btn.getAttribute('data-user-role') || 'attendee');
        const userId = btn.getAttribute('data-user-id') || '';
        const sourceIds = parseSourceIds(btn.getAttribute('data-source-ids'), userId)
          .filter((id) => !String(id).startsWith('admin-email:'));

        if (!email) {
          throw new Error('User email is missing');
        }

        const promptRole = role === 'admin' ? 'admin user' : 'user';
        const confirmed = await ConfirmDialog(
          'Send Invite',
          `Send a password reset/sign-in invite to ${email} as ${promptRole}?`,
          { confirmText: 'Send Invite' }
        );
        if (!confirmed) return;

        setButtonLoading(btn, true, 'Sending...');

        if (role === 'admin') {
          const { addAdminEmail } = await import('../../firebase.js');
          const granted = await addAdminEmail(email, null);
          if (!granted) {
            throw new Error('Failed to ensure admin access for this email');
          }
        }

        const inviteResult = await sendUserInviteAndReset({
          email,
          attendeeName: name || email.split('@')[0],
          role,
          userId: sourceIds[0] || userId || ''
        });

        if (sourceIds.length) {
          const patch = {
            inviteStatus: inviteResult.inviteSent
              ? 'sent'
              : (inviteResult.resetFallbackSent ? 'reset_sent_only' : 'failed'),
            inviteSentAt: inviteResult.inviteSent ? fsm.serverTimestamp() : null,
            inviteError: inviteResult.error || null,
            passwordResetStatus: inviteResult.inviteSent && inviteResult.resetLink
              ? 'included_in_invite'
              : (inviteResult.resetFallbackSent ? 'sent' : 'failed'),
            passwordResetSentAt: (inviteResult.inviteSent || inviteResult.resetFallbackSent)
              ? fsm.serverTimestamp()
              : null,
            updatedAt: fsm.serverTimestamp()
          };
          if (inviteResult.authUid) patch.ownerUid = inviteResult.authUid;

          await Promise.all(sourceIds.map((id) =>
            fsm.updateDoc(fsm.doc(db, 'attendees', id), patch).catch(() => null)
          ));
        }

        if (inviteResult.inviteSent) {
          Toast(`Invite sent to ${email}`);
        } else if (inviteResult.resetFallbackSent) {
          Toast(`Invite email failed. Password reset sent to ${email}`);
        } else {
          throw new Error(inviteResult.error || 'Failed to send invite');
        }

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
