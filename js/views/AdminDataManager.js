import { getState } from "../store.js";
import { getAdminDb, getFirestoreModule, exportCsv, setButtonLoading } from "../utils/admin.js";
import { AlertDialog, Toast } from "../utils/ui.js";
import { getStorageInstance } from "../firebase.js";

const FUNCTION_ENDPOINTS = [
  { id: "create-vendor-account", label: "Create Vendor Account" },
  { id: "send-password-reset", label: "Send Password Reset" },
  { id: "create-invoice", label: "Create Invoice" },
  { id: "get-stripe-invoices", label: "Stripe Invoices" },
  { id: "void-invoice", label: "Void Invoice" },
  { id: "send-email", label: "Send Email" },
  { id: "send-push", label: "Send Push" }
];

function statusBadge(ok, text) {
  const cls = ok ? "text-green-400" : "text-red-400";
  return `<span class="${cls} font-medium">${text}</span>`;
}

async function exportCollection(collectionName) {
  const db = await getAdminDb();
  const fsm = await getFirestoreModule();
  const snap = await fsm.getDocs(fsm.collection(db, collectionName));
  const rows = [];
  snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
  const filename = `${collectionName}_${new Date().toISOString().slice(0, 10)}.csv`;
  exportCsv(filename, rows);
}

export default async function AdminDataManager(root) {
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

  root.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-glass">Admin Data Manager</h2>
          <p class="text-sm text-glass-secondary">Health checks, exports, and connectivity</p>
        </div>
        <button id="runChecksBtn" class="bg-brand px-4 py-2 rounded text-white">
          <ion-icon name="pulse-outline" class="mr-1"></ion-icon>Run Checks
        </button>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-4">System Checks</h3>
        <div class="grid gap-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-glass-secondary">Firebase App</span>
            <span id="checkFirebase">Pending</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-glass-secondary">Firestore Read</span>
            <span id="checkFirestore">Pending</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-glass-secondary">Storage Bucket</span>
            <span id="checkStorage">Pending</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-glass-secondary">Storage Bucket ID</span>
            <span id="storageBucketValue" class="text-glass-secondary">-</span>
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-4">Function Connectivity</h3>
        <div class="grid gap-3 text-sm" id="functionChecks">
          ${FUNCTION_ENDPOINTS.map(fn => `
            <div class="flex items-center justify-between">
              <span class="text-glass-secondary">${fn.label}</span>
              <span id="fn-${fn.id}">Pending</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-4">Data Exports</h3>
        <div class="flex flex-wrap gap-3">
          <button class="glass-button px-4 py-2 rounded" data-export="vendors">Export Vendors</button>
          <button class="glass-button px-4 py-2 rounded" data-export="attendees">Export Attendees</button>
          <button class="glass-button px-4 py-2 rounded" data-export="leads">Export Leads</button>
          <button class="glass-button px-4 py-2 rounded" data-export="ads">Export Ads</button>
          <button class="glass-button px-4 py-2 rounded" data-export="payments">Export Payments</button>
          <button class="glass-button px-4 py-2 rounded" data-export="shows">Export Shows</button>
        </div>
      </div>
    </div>
  `;

  const runChecksBtn = root.querySelector('#runChecksBtn');
  const firebaseEl = root.querySelector('#checkFirebase');
  const firestoreEl = root.querySelector('#checkFirestore');
  const storageEl = root.querySelector('#checkStorage');
  const storageBucketEl = root.querySelector('#storageBucketValue');

  const runChecks = async () => {
    setButtonLoading(runChecksBtn, true, 'Checking...');
    try {
      const { getApps } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js');
      const appsReady = getApps().length > 0;
      if (firebaseEl) firebaseEl.innerHTML = statusBadge(appsReady, appsReady ? 'Ready' : 'Not initialized');

      try {
        const db = await getAdminDb();
        const fsm = await getFirestoreModule();
        const snap = await fsm.getDocs(fsm.query(fsm.collection(db, 'shows'), fsm.limit(1)));
        if (firestoreEl) firestoreEl.innerHTML = statusBadge(true, `OK (${snap.size} docs)`);
      } catch (err) {
        if (firestoreEl) firestoreEl.innerHTML = statusBadge(false, 'Failed');
      }

      try {
        const storage = getStorageInstance();
        const bucket = storage?.app?.options?.storageBucket || '';
        if (storageBucketEl) storageBucketEl.textContent = bucket || '-';
        if (storageEl) storageEl.innerHTML = statusBadge(!!bucket, bucket ? 'Configured' : 'Missing');
      } catch {
        if (storageEl) storageEl.innerHTML = statusBadge(false, 'Failed');
      }

      await Promise.all(FUNCTION_ENDPOINTS.map(async (fn) => {
        const el = root.querySelector(`#fn-${fn.id}`);
        try {
          const res = await fetch(`/.netlify/functions/${fn.id}`, { method: 'OPTIONS' });
          const ok = res.ok || res.status === 200 || res.status === 204;
          if (el) el.innerHTML = statusBadge(ok, ok ? 'Reachable' : `HTTP ${res.status}`);
        } catch {
          if (el) el.innerHTML = statusBadge(false, 'Failed');
        }
      }));
    } finally {
      setButtonLoading(runChecksBtn, false);
    }
  };

  runChecksBtn?.addEventListener('click', runChecks);

  root.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const collectionName = btn.getAttribute('data-export');
      setButtonLoading(btn, true, 'Exporting...');
      try {
        await exportCollection(collectionName);
        Toast(`Exported ${collectionName}`);
      } catch (err) {
        console.error('[AdminDataManager] Export failed:', err);
        await AlertDialog('Export Failed', err.message || 'Could not export data', { type: 'error' });
      } finally {
        setButtonLoading(btn, false);
      }
    });
  });

  runChecks();
}
