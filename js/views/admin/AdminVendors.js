/**
 * Admin Vendors Module
 * Handles all vendor management functionality in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading, exportCsv, getPaymentStatusInfo, debounce } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';
import { SkeletonTableRows } from '../../utils/skeleton.js';
import { sendVendorApprovalEmail, sendVendorDenialEmail, sendVendorInviteEmail, sendVendorContractReminderEmail } from '../../utils/email.js';
import { getCurrentShowId, getCurrentShow } from '../../shows.js';
import { getAllCategories } from '../../brand.js';
import { getVendorContractUrl, VENDOR_CONTRACT_VERSION } from '../../utils/vendorContract.js';

// Module state
let lastVendors = [];
let allVendors = []; // Full filtered/sorted list
let currentPage = 1;
const PAGE_SIZE = 20; // Items per page

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

function parseBooths(vendor) {
  const list = [];
  if (Array.isArray(vendor?.booths)) {
    for (const booth of vendor.booths) {
      const normalized = String(booth || '').trim();
      if (normalized) list.push(normalized);
    }
  }
  if (typeof vendor?.booth === 'string' && vendor.booth.trim()) {
    for (const booth of vendor.booth.split(',')) {
      const normalized = String(booth || '').trim();
      if (normalized) list.push(normalized);
    }
  }
  if (!list.length && vendor?.boothNumber) {
    const normalized = String(vendor.boothNumber || '').trim();
    if (normalized) list.push(normalized);
  }
  return Array.from(new Set(list));
}

function statusRank(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 3;
  if (normalized === 'payment_sent') return 2;
  if (normalized === 'pending') return 1;
  return 0;
}

function inviteRank(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'claimed') return 3;
  if (normalized === 'sent') return 2;
  if (normalized === 'pending') return 1;
  return 0;
}

function choosePrimaryVendor(records = []) {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => {
    const aOwner = String(a.ownerUid || '').trim() ? 1 : 0;
    const bOwner = String(b.ownerUid || '').trim() ? 1 : 0;
    if (aOwner !== bOwner) return bOwner - aOwner;

    const aApproved = a.approved ? 1 : 0;
    const bApproved = b.approved ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;

    const aTime = asMillis(a.updatedAt || a.createdAt);
    const bTime = asMillis(b.updatedAt || b.createdAt);
    if (aTime !== bTime) return bTime - aTime;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return sorted[0];
}

function mergeDuplicateVendors(rawVendors = []) {
  const groups = new Map();

  for (const vendor of rawVendors) {
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    const ownerUid = String(vendor.ownerUid || '').trim();
    const showId = String(vendor.showId || 'putnam-spring-2026').trim().toLowerCase();
    const baseKey = email ? `email:${email}` : ownerUid ? `uid:${ownerUid}` : `doc:${vendor.id}`;
    const key = `${baseKey}|show:${showId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vendor);
  }

  const merged = [];
  let duplicatesCombined = 0;

  groups.forEach((records) => {
    if (!records.length) return;
    const primary = choosePrimaryVendor(records) || records[0];
    const sourceIds = Array.from(new Set(records.map(r => String(r.id || '').trim()).filter(Boolean)));
    if (sourceIds.length > 1) {
      duplicatesCombined += sourceIds.length - 1;
    }

    const booths = Array.from(new Set(records.flatMap(parseBooths)));
    const bestPaymentStatus = records.reduce((best, row) => {
      const current = String(row.paymentStatus || '').toLowerCase();
      return statusRank(current) > statusRank(best) ? current : best;
    }, String(primary.paymentStatus || '').toLowerCase());
    const bestInviteStatus = records.reduce((best, row) => {
      const current = String(row.inviteStatus || '').toLowerCase();
      return inviteRank(current) > inviteRank(best) ? current : best;
    }, String(primary.inviteStatus || '').toLowerCase());
    const contractSigned = records.some(r => r.contractSigned === true);
    const contractSignedAt = records.reduce((best, row) => (
      asMillis(row.contractSignedAt) > asMillis(best) ? row.contractSignedAt : best
    ), primary.contractSignedAt || null);
    const contractReminderSentAt = records.reduce((best, row) => (
      asMillis(row.contractReminderSentAt) > asMillis(best) ? row.contractReminderSentAt : best
    ), primary.contractReminderSentAt || null);
    const contractReminderCount = records.reduce((best, row) => (
      Math.max(best, Number(row.contractReminderCount || 0))
    ), Number(primary.contractReminderCount || 0));

    const approved = records.some(r => r.approved === true);
    const denied = !approved && records.some(r => r.denied === true);

    merged.push({
      ...primary,
      id: primary.id,
      name: bestString(records.flatMap(r => [r.name, r.companyName])) || primary.name || primary.companyName || '',
      companyName: bestString(records.flatMap(r => [r.companyName, r.name])) || primary.companyName || primary.name || '',
      contactEmail: normalizeEmail(bestString(records.flatMap(r => [r.contactEmail, r.email]))) || primary.contactEmail || '',
      category: bestString(records.map(r => r.category)) || primary.category || '',
      phone: bestString(records.map(r => r.phone)) || primary.phone || '',
      website: bestString(records.map(r => r.website)) || primary.website || '',
      approved,
      denied,
      denialReason: denied ? (bestString(records.map(r => r.denialReason)) || primary.denialReason || '') : '',
      paymentStatus: bestPaymentStatus || primary.paymentStatus || '',
      inviteStatus: bestInviteStatus || primary.inviteStatus || '',
      contractSigned,
      contractSignerName: bestString(records.map(r => r.contractSignerName)) || '',
      contractSignedAt,
      contractReminderSentAt,
      contractReminderCount,
      contractUrl: bestString(records.map(r => r.contractUrl)) || '',
      contractVersion: bestString(records.map(r => r.contractVersion)) || '',
      totalPrice: records.reduce((best, row) => Math.max(best, Number(row.totalPrice || 0)), Number(primary.totalPrice || 0)),
      booths,
      booth: booths.join(', '),
      boothNumber: bestString(records.map(r => r.boothNumber)) || booths[0] || '',
      boothCount: booths.length,
      ownerUid: bestString(records.map(r => r.ownerUid)) || primary.ownerUid || '',
      _sourceIds: sourceIds,
      _duplicateCount: sourceIds.length
    });
  });

  return { vendors: merged, duplicatesCombined };
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

function mergeProfileData(records = [], keepProfile = {}, mergeMissing = true) {
  const merged = { ...(keepProfile || {}) };
  if (!mergeMissing) return merged;

  const profiles = records
    .map((r) => (r && typeof r.profile === 'object' ? r.profile : null))
    .filter(Boolean);
  const keys = new Set(profiles.flatMap((profile) => Object.keys(profile)));

  keys.forEach((key) => {
    const keepValue = merged[key];
    if (!isBlank(keepValue)) return;

    const candidates = profiles
      .map((profile) => profile[key])
      .filter((value) => !isBlank(value));
    if (!candidates.length) return;

    if (Array.isArray(candidates[0])) {
      merged[key] = Array.from(new Set(candidates.flat().map((item) => String(item || '').trim()).filter(Boolean)));
      return;
    }
    if (typeof candidates[0] === 'boolean') {
      merged[key] = candidates.some(Boolean);
      return;
    }
    merged[key] = bestNonEmpty(candidates);
  });

  return merged;
}

function getVendorRecordSummary(record = {}) {
  const booths = parseBooths(record);
  return {
    id: String(record.id || ''),
    name: String(record.name || record.companyName || '').trim(),
    companyName: String(record.companyName || record.name || '').trim(),
    contactEmail: normalizeEmail(record.contactEmail || record.email),
    category: String(record.category || '').trim(),
    phone: String(record.phone || '').trim(),
    website: String(record.website || '').trim(),
    ownerUid: String(record.ownerUid || '').trim(),
    approved: !!record.approved,
    denied: !!record.denied,
    paymentStatus: String(record.paymentStatus || '').trim(),
    inviteStatus: String(record.inviteStatus || '').trim(),
    boothText: booths.join(', '),
    createdAt: asMillis(record.createdAt),
    updatedAt: asMillis(record.updatedAt || record.createdAt),
  };
}

function renderVendorDiffRows(records = []) {
  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'contactEmail', label: 'Email' },
    { key: 'category', label: 'Category' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'boothText', label: 'Booths' },
    { key: 'ownerUid', label: 'Owner UID' },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'inviteStatus', label: 'Invite Status' },
  ];

  const rows = [];
  for (const field of fields) {
    const values = records.map((record) => {
      const value = record[field.key];
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value || '').trim() || '—';
    });
    const unique = new Set(values);
    if (unique.size > 1) {
      rows.push(`
        <tr class="border-b border-glass-border/40">
          <td class="py-2 pr-3 text-glass-secondary">${field.label}</td>
          <td class="py-2 text-glass">${values.map((value, idx) => `Doc ${idx + 1}: ${escHtml(value)}`).join('<br/>')}</td>
        </tr>
      `);
    }
  }
  return rows.join('');
}

async function showVendorMergeModal(records = []) {
  if (!records.length) return null;

  return new Promise((resolve) => {
    const summaries = records.map(getVendorRecordSummary);
    const diffRows = renderVendorDiffRows(summaries);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-glass-surface border border-glass-border rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-5 border-b border-glass-border">
          <h3 class="text-xl font-bold text-glass">Merge Duplicate Vendors</h3>
          <p class="text-sm text-glass-secondary mt-1">Choose one record to keep, then purge the others.</p>
        </div>
        <div class="p-5 space-y-4">
          <div class="grid md:grid-cols-2 gap-3">
            ${summaries.map((record, idx) => `
              <label class="glass-card p-3 border border-glass-border cursor-pointer">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-glass font-medium">${escHtml(record.name || `Vendor ${idx + 1}`)}</p>
                    <p class="text-xs text-glass-secondary break-all">${escHtml(record.contactEmail || 'No email')}</p>
                    <p class="text-xs text-glass-secondary mt-1">Category: ${escHtml(record.category || '—')}</p>
                    <p class="text-xs text-glass-secondary">Booths: ${escHtml(record.boothText || '—')}</p>
                    <p class="text-xs text-glass-secondary">Payment: ${escHtml(record.paymentStatus || 'pending')}</p>
                    <p class="text-xs text-glass-secondary">Invite: ${escHtml(record.inviteStatus || 'pending')}</p>
                    <p class="text-[11px] text-glass-secondary mt-2 break-all">Doc: ${escHtml(record.id)}</p>
                  </div>
                  <input type="radio" name="keepVendorDoc" value="${escHtml(record.id)}" ${idx === 0 ? 'checked' : ''} class="accent-brand mt-1" />
                </div>
              </label>
            `).join('')}
          </div>
          ${diffRows ? `
            <div class="glass-card p-3 border border-yellow-500/30 bg-yellow-500/10">
              <p class="text-sm text-yellow-200 font-medium mb-2">Differences Found</p>
              <table class="w-full text-xs">
                <tbody>${diffRows}</tbody>
              </table>
            </div>
          ` : ''}
          <label class="inline-flex items-center gap-2 text-sm text-glass-secondary">
            <input id="mergeMissingVendorFields" type="checkbox" class="accent-brand" checked />
            Fill missing fields on kept record using data from purged copies
          </label>
        </div>
        <div class="p-5 border-t border-glass-border flex justify-end gap-3">
          <button id="cancelVendorMergeBtn" class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">Cancel</button>
          <button id="confirmVendorMergeBtn" class="px-4 py-2 bg-red-600 rounded text-white">Merge & Purge</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();

    overlay.querySelector('#cancelVendorMergeBtn')?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    overlay.querySelector('#confirmVendorMergeBtn')?.addEventListener('click', () => {
      const keepId = overlay.querySelector('input[name="keepVendorDoc"]:checked')?.value || '';
      const mergeMissing = !!overlay.querySelector('#mergeMissingVendorFields')?.checked;
      if (!keepId) {
        Toast('Select a record to keep');
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

async function fetchVendorSourceRecords(db, fsm, sourceIds = []) {
  const records = [];
  for (const id of sourceIds) {
    const snap = await fsm.getDoc(fsm.doc(db, 'vendors', id));
    if (snap.exists()) {
      records.push({ id: snap.id, ...snap.data() });
    }
  }
  return records;
}

function buildVendorMergePatch(records = [], keepId, mergeMissing = true) {
  const keep = records.find((record) => record.id === keepId) || records[0];
  const booths = Array.from(new Set(records.flatMap(parseBooths)));
  const mergedPatch = {
    mergedFromIds: records.map((record) => record.id).filter((id) => id !== keep.id),
    mergedAt: new Date().toISOString(),
  };

  const sourceName = bestNonEmpty(records.flatMap((record) => [record.name, record.companyName]));
  const sourceCompanyName = bestNonEmpty(records.flatMap((record) => [record.companyName, record.name]));
  const sourceEmail = normalizeEmail(bestNonEmpty(records.flatMap((record) => [record.contactEmail, record.email])));
  const sourceCategory = bestNonEmpty(records.map((record) => record.category));
  const sourcePhone = bestNonEmpty(records.flatMap((record) => [record.phone, record.contactPhone]));
  const sourceWebsite = bestNonEmpty(records.map((record) => record.website));
  const sourceOwner = bestNonEmpty(records.map((record) => record.ownerUid));
  const sourceDenialReason = bestNonEmpty(records.map((record) => record.denialReason));

  const bestPayment = records.reduce((best, row) => {
    const current = String(row.paymentStatus || '').toLowerCase();
    return statusRank(current) > statusRank(best) ? current : best;
  }, String(keep.paymentStatus || '').toLowerCase());
  const bestInvite = records.reduce((best, row) => {
    const current = String(row.inviteStatus || '').toLowerCase();
    return inviteRank(current) > inviteRank(best) ? current : best;
  }, String(keep.inviteStatus || '').toLowerCase());

  if (mergeMissing) {
    mergedPatch.name = String(keep.name || '').trim() || sourceName || '';
    mergedPatch.companyName = String(keep.companyName || '').trim() || sourceCompanyName || mergedPatch.name || '';
    mergedPatch.contactEmail = normalizeEmail(keep.contactEmail || keep.email) || sourceEmail || '';
    mergedPatch.category = String(keep.category || '').trim() || sourceCategory || '';
    mergedPatch.phone = String(keep.phone || keep.contactPhone || '').trim() || sourcePhone || '';
    mergedPatch.website = String(keep.website || '').trim() || sourceWebsite || '';
    mergedPatch.ownerUid = String(keep.ownerUid || '').trim() || sourceOwner || '';
    mergedPatch.denialReason = String(keep.denialReason || '').trim() || sourceDenialReason || '';
    mergedPatch.paymentStatus = String(keep.paymentStatus || '').trim() || bestPayment || '';
    mergedPatch.inviteStatus = String(keep.inviteStatus || '').trim() || bestInvite || '';
  }

  mergedPatch.approved = records.some((record) => record.approved === true) || !!keep.approved;
  mergedPatch.denied = !mergedPatch.approved && (records.some((record) => record.denied === true) || !!keep.denied);
  mergedPatch.totalPrice = records.reduce(
    (best, record) => Math.max(best, Number(record.totalPrice || 0)),
    Number(keep.totalPrice || 0)
  );
  mergedPatch.profile = mergeProfileData(records, keep.profile || {}, mergeMissing);

  if (booths.length) {
    mergedPatch.booths = booths;
    mergedPatch.booth = booths.join(', ');
    mergedPatch.boothCount = booths.length;
    mergedPatch.boothNumber = String(keep.boothNumber || '').trim() || booths[0];
  }

  return { keepRecord: keep, patch: mergedPatch };
}

async function relinkVendorReferences(db, fsm, keepId, purgeIds = [], keepRecord = {}) {
  let leadsUpdated = 0;
  let floorPlanBoothsUpdated = 0;

  for (const purgeId of purgeIds) {
    const leadsQuery = fsm.query(fsm.collection(db, 'leads'), fsm.where('vendorId', '==', purgeId));
    const leadsSnap = await fsm.getDocs(leadsQuery);
    if (!leadsSnap.empty) {
      await Promise.all(leadsSnap.docs.map((docSnap) =>
        fsm.updateDoc(docSnap.ref, {
          vendorId: keepId,
          vendorName: keepRecord.name || keepRecord.companyName || null,
        }).catch(() => null)
      ));
      leadsUpdated += leadsSnap.size;
    }
  }

  const floorSnap = await fsm.getDocs(fsm.collection(db, 'floorPlanConfigs'));
  for (const floorDoc of floorSnap.docs) {
    const data = floorDoc.data() || {};
    const booths = Array.isArray(data.booths) ? data.booths : [];
    let changed = false;
    const updatedBooths = booths.map((booth) => {
      if (!booth || typeof booth !== 'object') return booth;
      if (!purgeIds.includes(String(booth.vendorId || '').trim())) return booth;
      changed = true;
      floorPlanBoothsUpdated += 1;
      return {
        ...booth,
        vendorId: keepId,
        vendorName: keepRecord.name || booth.vendorName || '',
      };
    });

    if (changed) {
      await fsm.updateDoc(floorDoc.ref, {
        booths: updatedBooths,
        updatedAt: fsm.serverTimestamp(),
      }).catch(() => null);
    }
  }

  return { leadsUpdated, floorPlanBoothsUpdated };
}

async function mergeVendorDuplicateGroup(db, fsm, sourceIds = [], keepId, mergeMissing = true) {
  const records = await fetchVendorSourceRecords(db, fsm, sourceIds);
  if (records.length < 2) {
    throw new Error('Need at least two vendor records to merge');
  }
  const validKeepId = records.some((record) => record.id === keepId) ? keepId : records[0].id;
  const purgeIds = records.map((record) => record.id).filter((id) => id !== validKeepId);
  const { keepRecord, patch } = buildVendorMergePatch(records, validKeepId, mergeMissing);

  await fsm.updateDoc(fsm.doc(db, 'vendors', validKeepId), {
    ...patch,
    updatedAt: fsm.serverTimestamp(),
  });

  const relinkSummary = await relinkVendorReferences(db, fsm, validKeepId, purgeIds, {
    ...keepRecord,
    ...patch,
  });

  await Promise.all(purgeIds.map((id) =>
    fsm.deleteDoc(fsm.doc(db, 'vendors', id)).catch(() => null)
  ));

  return {
    keepId: validKeepId,
    purgedCount: purgeIds.length,
    ...relinkSummary,
  };
}

/**
 * Show a denial modal with reason input
 * @param {string} vendorName - The vendor's name for display
 * @returns {Promise<string|null>} - The denial reason or null if cancelled
 */
async function showDenialModal(vendorName) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-glass-surface border border-glass-border rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold text-glass mb-2">Deny Vendor Application</h3>
        <p class="text-glass-secondary text-sm mb-4">Please provide a reason for denying <strong>${vendorName}</strong>'s application. This will be sent to the vendor.</p>
        <textarea id="denialReason" class="w-full bg-glass-surface border border-glass-border rounded p-3 text-glass text-sm min-h-[100px]" placeholder="Enter reason for denial..."></textarea>
        <div class="flex gap-3 mt-4 justify-end">
          <button id="cancelDenial" class="px-4 py-2 bg-gray-600 rounded text-white text-sm">Cancel</button>
          <button id="confirmDenial" class="px-4 py-2 bg-yellow-600 rounded text-white text-sm">Deny Application</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const reasonInput = overlay.querySelector('#denialReason');
    const cancelBtn = overlay.querySelector('#cancelDenial');
    const confirmBtn = overlay.querySelector('#confirmDenial');
    
    reasonInput.focus();
    
    const cleanup = () => {
      overlay.remove();
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    confirmBtn.addEventListener('click', () => {
      const reason = reasonInput.value.trim();
      if (!reason) {
        reasonInput.classList.add('border-red-500');
        reasonInput.focus();
        return;
      }
      cleanup();
      resolve(reason);
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Get invite status badge HTML for a vendor row
 */
function getInviteStatusBadge(vendor) {
  const status = vendor.inviteStatus || '';
  if (status === 'claimed') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
      <ion-icon name="checkmark-circle-outline" style="font-size:12px"></ion-icon>Active
    </span>`;
  }
  if (status === 'sent') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
      <ion-icon name="mail-outline" style="font-size:12px"></ion-icon>Invite Sent
    </span>`;
  }
  // pending or no status — only show if admin-created (no ownerUid)
  if (!vendor.ownerUid) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
      <ion-icon name="person-add-outline" style="font-size:12px"></ion-icon>Not Invited
    </span>`;
  }
  return '';
}

/**
 * Get invite action button HTML for a vendor row
 */
function getInviteActionButton(vendor) {
  const sourceIdsAttr = (vendor._sourceIds || [vendor.id]).join(',');
  if (vendor.inviteStatus === 'claimed') return '';
  if (!vendor.contactEmail) return '';
  if (vendor.inviteStatus === 'sent') {
    return `<button class="bg-yellow-600 px-3 py-1 rounded text-white text-sm" data-action="resend-invite" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}" data-source-ids="${sourceIdsAttr}">
      <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Resend
    </button>`;
  }
  // Show invite button for admin-created vendors (no ownerUid) or anyone not yet invited
  if (!vendor.ownerUid) {
    return `<button class="bg-teal-600 px-3 py-1 rounded text-white text-sm" data-action="send-invite" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}" data-source-ids="${sourceIdsAttr}">
      <ion-icon name="mail-outline" class="mr-1"></ion-icon>Invite
    </button>`;
  }
  return '';
}

function getPasswordResetActionButton(vendor) {
  const sourceIdsAttr = (vendor._sourceIds || [vendor.id]).join(',');
  if (!vendor.contactEmail) return '';
  return `<button class="bg-blue-700 px-3 py-1 rounded text-white text-sm" data-action="send-password-reset" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}" data-source-ids="${sourceIdsAttr}">
    <ion-icon name="key-outline" class="mr-1"></ion-icon>Reset Password
  </button>`;
}

/**
 * Show the Create Vendor modal
 */
async function showCreateVendorModal(root, reloadFn) {
  const categories = getAllCategories();
  const currentShow = getCurrentShow();
  const showId = getCurrentShowId();

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-glass-surface border border-glass-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="p-6 border-b border-glass-border">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-glass">Create Vendor Profile</h3>
          <button id="closeCreateVendor" class="text-glass-secondary hover:text-glass p-2">
            <ion-icon name="close-outline" class="text-2xl pointer-events-none"></ion-icon>
          </button>
        </div>
        <p class="text-glass-secondary text-sm mt-1">Create a profile on behalf of a vendor. You can invite them by email afterward.</p>
      </div>
      <form id="createVendorForm" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Required fields -->
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Company Name <span class="text-red-400">*</span></label>
            <input type="text" name="name" required class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="Acme Home Services" />
          </div>
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Category <span class="text-red-400">*</span></label>
            <select name="category" required class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass">
              <option value="">Select category...</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Contact Email <span class="text-red-400">*</span></label>
            <input type="email" name="contactEmail" required class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="vendor@email.com" />
          </div>
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Contact Phone</label>
            <input type="tel" name="phone" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="(555) 123-4567" />
          </div>
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Website</label>
            <input type="url" name="website" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="https://example.com" />
          </div>
          <div>
            <label class="block text-glass-secondary text-sm mb-1">Booth Assignment</label>
            <input type="text" name="booth" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="e.g. B-101, B-102" />
          </div>
        </div>
        <div>
          <label class="block text-glass-secondary text-sm mb-1">Bio / Tagline</label>
          <input type="text" name="bio" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="Short description of the business" />
        </div>
        <div>
          <label class="block text-glass-secondary text-sm mb-1">Full Description</label>
          <textarea name="description" rows="3" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="Detailed business description..."></textarea>
        </div>
        <div>
          <label class="block text-glass-secondary text-sm mb-1">Special Offer</label>
          <input type="text" name="specialOffer" class="w-full p-2 bg-glass-surface border border-glass-border rounded text-glass" placeholder="Show-exclusive deal or promotion" />
        </div>
        <div class="flex items-center gap-3">
          <label class="inline-flex items-center gap-2 text-glass">
            <input type="checkbox" name="sendInvite" class="accent-brand" checked>
            <span class="text-sm">Send invite email after creation</span>
          </label>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-glass-border">
          <button type="button" id="cancelCreateVendor" class="px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-green-600 rounded text-white hover:bg-green-700">
            <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Create Vendor
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => overlay.remove();
  overlay.querySelector('#closeCreateVendor').addEventListener('click', cleanup);
  overlay.querySelector('#cancelCreateVendor').addEventListener('click', cleanup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

  overlay.querySelector('#createVendorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Creating...');

    try {
      const fd = new FormData(form);
      const name = fd.get('name').trim();
      const category = fd.get('category');
      const contactEmail = fd.get('contactEmail').trim().toLowerCase();
      const phone = fd.get('phone')?.trim() || '';
      const website = fd.get('website')?.trim() || '';
      const booth = fd.get('booth')?.trim() || '';
      const bio = fd.get('bio')?.trim() || '';
      const description = fd.get('description')?.trim() || '';
      const specialOffer = fd.get('specialOffer')?.trim() || '';
      const sendInvite = form.querySelector('[name="sendInvite"]').checked;

      if (!name || !category || !contactEmail) {
        Toast('Please fill in all required fields');
        setButtonLoading(submitBtn, false);
        return;
      }

      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      // Parse booth assignments
      const boothsList = booth ? booth.split(',').map(b => b.trim()).filter(Boolean) : [];

      // Create vendor document
      const vendorData = {
        name,
        category,
        contactEmail,
        phone,
        website,
        booth: boothsList.join(', '),
        booths: boothsList,
        boothCount: boothsList.length,
        ownerUid: null,
        invitedEmail: contactEmail,
        inviteStatus: 'pending',
        approved: true,
        showId,
        showName: currentShow?.shortName || '',
        contractRequired: true,
        contractSigned: false,
        contractSignerName: '',
        contractVersion: VENDOR_CONTRACT_VERSION,
        contractUrl: getVendorContractUrl(),
        contractReminderCount: 0,
        profile: {
          bio,
          description,
          specialOffer
        },
        createdAt: fsm.serverTimestamp(),
        createdBy: 'admin'
      };

      const docRef = await fsm.addDoc(fsm.collection(db, 'vendors'), vendorData);
      const vendorId = docRef.id;

      Toast(`Vendor "${name}" created successfully!`, 'success');

      // Send invite email if checked
      if (sendInvite) {
        try {
          await sendInviteToVendor(vendorId, name, contactEmail);
        } catch (inviteErr) {
          console.warn('[AdminVendors] Invite send failed (vendor still created):', inviteErr);
          Toast('Vendor created but invite email failed. You can resend from the vendor list.', 'warning');
        }
      }

      cleanup();
      if (reloadFn) reloadFn();
    } catch (err) {
      console.error('[AdminVendors] Create vendor failed:', err);
      setButtonLoading(submitBtn, false);
      Toast('Failed to create vendor: ' + err.message, 'error');
    }
  });
}

/**
 * Send invite email to a vendor (create account + send email + update status)
 */
async function sendInviteToVendor(vendorId, vendorName, vendorEmail, sourceIds = null) {
  // 1. Create Firebase Auth account and get password reset link
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
  const idToken = await getAuth().currentUser?.getIdToken();

  const accountRes = await fetch('/.netlify/functions/create-vendor-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify({
      email: vendorEmail,
      displayName: vendorName,
      sendPasswordReset: true
    })
  });

  const accountData = await accountRes.json();
  if (!accountRes.ok && accountRes.status !== 200) {
    throw new Error(accountData.error || 'Failed to create account');
  }

  // 2. Send the invite email via SendGrid
  const resetLink = accountData.resetLink || '';
  await sendVendorInviteEmail(vendorEmail, {
    businessName: vendorName,
    resetLink
  });

  // 3. Update vendor doc with invite status
  const db = await getAdminDb();
  const fsm = await getFirestoreModule();
  const targetIds = parseSourceIds(sourceIds, vendorId);
  await Promise.all(targetIds.map((id) =>
    fsm.updateDoc(fsm.doc(db, 'vendors', id), {
      inviteStatus: 'sent',
      inviteSentAt: new Date().toISOString(),
      passwordResetStatus: resetLink ? 'included_in_invite' : 'unknown',
      passwordResetSentAt: resetLink ? new Date().toISOString() : null,
      firebaseUid: accountData.uid || null,
      inviteError: null
    }).catch(() => null)
  ));

  Toast(`Invite sent to ${vendorEmail}`, 'success');
}

async function getCurrentAdminIdToken() {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
  const auth = getAuth();
  return auth.currentUser?.getIdToken?.() || '';
}

async function sendVendorPasswordResetEmail(vendorEmail) {
  const idToken = await getCurrentAdminIdToken();
  const response = await fetch('/.netlify/functions/send-password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify({ email: vendorEmail })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Password reset email failed (${response.status})`);
  }
  return payload;
}

function showInviteResendOptionsModal(vendorName, vendorEmail) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-glass-surface border border-glass-border rounded-lg max-w-md w-full p-5" onclick="event.stopPropagation()">
        <h3 class="text-lg font-semibold text-glass mb-2">Resend Options</h3>
        <p class="text-sm text-glass-secondary mb-1">Vendor: <span class="text-glass">${escHtml(vendorName || 'Vendor')}</span></p>
        <p class="text-xs text-glass-secondary mb-4">${escHtml(vendorEmail || '')}</p>
        <p class="text-sm text-glass-secondary mb-4">Choose what you want to send:</p>
        <div class="grid grid-cols-1 gap-2">
          <button id="resendInviteBtn" class="w-full px-4 py-2 bg-yellow-600 rounded text-white hover:bg-yellow-700">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Resend Invite Email
          </button>
          <button id="sendResetBtn" class="w-full px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700">
            <ion-icon name="key-outline" class="mr-1"></ion-icon>Send Password Reset
          </button>
          <button id="cancelResendBtn" class="w-full px-4 py-2 border border-glass-border rounded text-glass-secondary hover:text-glass">
            Cancel
          </button>
        </div>
      </div>
    `;

    const cleanup = (result = null) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#resendInviteBtn')?.addEventListener('click', () => cleanup('invite'));
    overlay.querySelector('#sendResetBtn')?.addEventListener('click', () => cleanup('password-reset'));
    overlay.querySelector('#cancelResendBtn')?.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });

    document.body.appendChild(overlay);
  });
}

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
              <option value="denied">Denied</option>
              <option value="paid">Paid</option>
              <option value="payment_sent">Payment Sent</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="invite_pending">Not Invited</option>
              <option value="invite_sent">Invite Sent</option>
              <option value="invite_claimed">Claimed / Active</option>
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
          <button class="bg-green-600 px-4 py-2 rounded text-white" id="createVendorBtn">
            <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Create Vendor
          </button>
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
 * @param {Object} options - Filter, search, sort options (includes showId for show filtering)
 * @param {Function} showVendorModal - Callback to show vendor profile modal
 * @param {Function} showPaymentModal - Callback to show payment modal
 */
export async function loadVendors(root, options = {}, showVendorModal, showPaymentModal) {
  const { filterType = 'all', searchTerm = '', sortBy = 'default', resetPage = true, showId = null } = options;
  
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
    console.log('[AdminVendors] Loading vendors...', showId ? `for show: ${showId}` : '(all shows)');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const vendorsSnap = await fsm.getDocs(fsm.collection(db, 'vendors'));
    console.log('[AdminVendors] Vendors loaded:', vendorsSnap.size);
    let vendors = [];
    vendorsSnap.forEach(doc => vendors.push({ id: doc.id, ...doc.data() }));
    const rawCount = vendors.length;
    const merged = mergeDuplicateVendors(vendors);
    vendors = merged.vendors;
    console.log('[AdminVendors] Vendors merged:', rawCount, `-> ${vendors.length}`);

    // Vendors tab is global by design: include all vendor applications and approved vendors.

    // Apply filter
    if (filterType !== 'all') {
      vendors = vendors.filter(vendor => {
        switch (filterType) {
          case 'approved': return vendor.approved === true;
          case 'pending': return vendor.approved !== true && vendor.denied !== true;
          case 'denied': return vendor.denied === true;
          case 'paid': return vendor.paymentStatus === 'paid';
          case 'payment_sent': return vendor.paymentStatus === 'payment_sent';
          case 'payment_pending': return vendor.approved === true && (!vendor.paymentStatus || vendor.paymentStatus === 'pending');
          case 'invite_pending': return !vendor.inviteStatus || vendor.inviteStatus === 'pending';
          case 'invite_sent': return vendor.inviteStatus === 'sent';
          case 'invite_claimed': return vendor.inviteStatus === 'claimed';
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
      sourceCount: Number(v._duplicateCount || 1),
      sourceIds: (v._sourceIds || [v.id]).join(','),
      name: v.name || '',
      contactEmail: v.contactEmail || '',
      phone: v.phone || '',
      category: v.category || '',
      approved: !!v.approved,
      paymentStatus: v.paymentStatus || '',
      totalPrice: v.totalPrice || 0,
      booths: (v.booths || []).join(' '),
      contractSigned: !!v.contractSigned,
      contractSignerName: v.contractSignerName || '',
      contractSignedAt: v.contractSignedAt || '',
      contractReminderCount: Number(v.contractReminderCount || 0),
      contractReminderSentAt: v.contractReminderSentAt || '',
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
        ${merged.duplicatesCombined > 0 ? `
          <div class="glass-card p-3 border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm">
            Combined ${merged.duplicatesCombined} duplicate vendor record${merged.duplicatesCombined === 1 ? '' : 's'} by email + show.
          </div>
        ` : ''}
        ${paginatedVendors.length === 0 ? `
          <div class="glass-card p-8 text-center">
            <div class="text-glass-secondary">
              <ion-icon name="search-outline" class="text-2xl mb-2"></ion-icon>
              <p>No vendors match the selected filter</p>
            </div>
          </div>
        ` : paginatedVendors.map(vendor => {
          const statusInfo = getPaymentStatusInfo(vendor);
          const sourceIdsAttr = (vendor._sourceIds || [vendor.id]).join(',');
          return `
          <div class="glass-card p-4 border ${statusInfo.color}">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                  <input type="checkbox" class="vendor-select accent-brand" data-vendor-id="${vendor.id}" data-source-ids="${sourceIdsAttr}">
                  <h3 class="text-lg font-semibold text-glass">${vendor.name}</h3>
                </div>
                <p class="text-glass-secondary">${vendor.contactEmail}</p>
                <div class="flex items-center gap-4 mt-2 flex-wrap">
                  <p class="text-sm text-glass-secondary">Status: ${vendor.denied ? '❌ Denied' : vendor.approved ? '✅ Approved' : '⏳ Pending'}</p>
                  <p class="text-sm ${statusInfo.statusColor}">${statusInfo.status}</p>
                  ${getInviteStatusBadge(vendor)}
                  <p class="text-sm ${vendor.contractSigned ? 'text-emerald-300' : 'text-red-300'}">
                    Contract: ${vendor.contractSigned ? 'Signed' : 'Missing'}
                  </p>
                  ${Number(vendor._duplicateCount || 1) > 1 ? `
                    <span class="inline-flex items-center gap-1 text-xs text-yellow-300">
                      <ion-icon name="layers-outline"></ion-icon>
                      Merged ${Number(vendor._duplicateCount || 1)} records
                    </span>
                  ` : ''}
                </div>
                ${vendor.denied && vendor.denialReason ? `<p class="text-sm text-red-400">Denial Reason: ${vendor.denialReason}</p>` : ''}
                <p class="text-sm text-glass-secondary">Category: ${vendor.category || 'N/A'}</p>
                <p class="text-sm text-glass-secondary">Phone: ${vendor.phone || 'N/A'}</p>
                ${vendor.booths ? `<p class="text-sm text-glass-secondary">Booths: ${vendor.booths.join(', ')}</p>` : ''}
                ${vendor.totalPrice ? `<p class="text-sm text-green-400">Total: $${vendor.totalPrice.toLocaleString()}</p>` : ''}
                ${!vendor.contractSigned && Number(vendor.contractReminderCount || 0) > 0 ? `<p class="text-sm text-red-300">Contract reminders sent: ${Number(vendor.contractReminderCount || 0)}</p>` : ''}
              </div>
              <div class="flex flex-col gap-2">
                <button class="bg-blue-600 px-3 py-1 rounded text-white text-sm" data-action="view" data-vendor-id="${vendor.id}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                </button>
                <button class="bg-purple-600 px-3 py-1 rounded text-white text-sm" data-action="edit" data-vendor-id="${vendor.id}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="create-outline" class="mr-1"></ion-icon>Edit
                </button>
                ${Number(vendor._duplicateCount || 1) > 1 ? `<button class="bg-yellow-600 px-3 py-1 rounded text-white text-sm" data-action="merge-duplicates" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="git-merge-outline" class="mr-1"></ion-icon>Merge
                </button>` : ''}
                ${vendor.approved ? `<button class="bg-orange-600 px-3 py-1 rounded text-white text-sm" data-action="pay" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-vendor-email="${vendor.contactEmail}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="card-outline" class="mr-1"></ion-icon>Payment
                </button>` : ''}
                ${vendor.approved && vendor.paymentStatus !== 'paid' ? `<button class="bg-emerald-600 px-3 py-1 rounded text-white text-sm" data-action="mark-paid" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="checkmark-circle-outline" class="mr-1"></ion-icon>Mark Paid
                </button>` : ''}
                ${vendor.approved && vendor.paymentStatus === 'paid' ? `<button class="bg-slate-600 px-3 py-1 rounded text-white text-sm" data-action="mark-unpaid" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Mark Unpaid
                </button>` : ''}
                ${vendor.stripeInvoiceUrl ? `<a href="${vendor.stripeInvoiceUrl}" target="_blank" rel="noopener" class="text-center px-3 py-1 bg-orange-700 rounded text-white text-sm">
                  <ion-icon name="open-outline" class="mr-1"></ion-icon>Invoice
                </a>` : ''}
                ${!vendor.approved ? `
                  <button class="bg-green-600 px-3 py-1 rounded text-white text-sm" data-action="approve" data-vendor-id="${vendor.id}" data-vendor-email="${vendor.contactEmail}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                    <ion-icon name="checkmark-outline" class="mr-1"></ion-icon>Approve
                  </button>
                  <button class="bg-yellow-600 px-3 py-1 rounded text-white text-sm" data-action="deny" data-vendor-id="${vendor.id}" data-vendor-email="${vendor.contactEmail}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                    <ion-icon name="close-outline" class="mr-1"></ion-icon>Deny
                  </button>
                ` : ''}
                ${getInviteActionButton(vendor)}
                ${getPasswordResetActionButton(vendor)}
                ${!vendor.contractSigned && vendor.contactEmail ? `<button class="bg-red-700 px-3 py-1 rounded text-white text-sm" data-action="send-contract-reminder" data-vendor-id="${vendor.id}" data-vendor-email="${vendor.contactEmail}" data-vendor-name="${vendor.name}" data-source-ids="${sourceIdsAttr}">
                  <ion-icon name="mail-outline" class="mr-1"></ion-icon>Contract Reminder
                </button>` : ''}
                <button class="bg-red-600 px-3 py-1 rounded text-white text-sm" data-action="delete" data-vendor-id="${vendor.id}" data-source-ids="${sourceIdsAttr}">
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

  // Create vendor button
  const createVendorBtn = root.querySelector('#createVendorBtn');
  if (createVendorBtn && !createVendorBtn._listenerAdded) {
    createVendorBtn._listenerAdded = true;
    createVendorBtn.addEventListener('click', () => {
      showCreateVendorModal(root, reloadVendors);
    });
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
    
    const ids = Array.from(new Set(checked.flatMap((cb) =>
      parseSourceIds(cb.getAttribute('data-source-ids'), cb.getAttribute('data-vendor-id'))
    )));
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
    const sourceIds = parseSourceIds(el.getAttribute('data-source-ids'), vendorId);
    const vendorName = el.getAttribute('data-vendor-name') || '';
    const vendorEmail = el.getAttribute('data-vendor-email') || '';
    
    setButtonLoading(
      el,
      true,
      action === 'approve'
        ? 'Approving...'
        : action === 'delete'
          ? 'Deleting...'
          : action === 'merge-duplicates'
            ? 'Preparing...'
          : action === 'send-invite'
            ? 'Sending...'
            : action === 'resend-invite'
              ? 'Resending...'
          : action === 'send-password-reset'
            ? 'Sending reset...'
          : action === 'send-contract-reminder'
            ? 'Sending reminder...'
          : action === 'mark-paid'
            ? 'Saving...'
            : action === 'mark-unpaid'
              ? 'Saving...'
              : 'Loading...'
    );
    
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      
      if (action === 'view' || action === 'edit') {
        setButtonLoading(el, false);
        const snap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
        if (snap.exists()) {
          showVendorModal(vendorId, snap.data(), action === 'edit');
        }
      } else if (action === 'merge-duplicates') {
        setButtonLoading(el, false);
        const records = await fetchVendorSourceRecords(db, fsm, sourceIds);
        if (records.length < 2) {
          Toast('No duplicate records found for this vendor');
          return;
        }

        const choice = await showVendorMergeModal(records);
        if (!choice) return;

        const keepRecord = records.find((record) => record.id === choice.keepId) || records[0];
        const purgeCount = records.length - 1;
        const confirmed = await ConfirmDialog(
          'Confirm Merge',
          `Keep "${keepRecord.name || keepRecord.companyName || keepRecord.contactEmail || keepRecord.id}" and purge ${purgeCount} duplicate record${purgeCount === 1 ? '' : 's'}?`,
          { danger: true, confirmText: 'Merge & Purge' }
        );
        if (!confirmed) return;

        setButtonLoading(el, true, 'Merging...');
        const mergeResult = await mergeVendorDuplicateGroup(db, fsm, sourceIds, choice.keepId, choice.mergeMissing);
        Toast(
          `Merged vendor duplicates: kept 1, purged ${mergeResult.purgedCount}, relinked ${mergeResult.leadsUpdated} lead${mergeResult.leadsUpdated === 1 ? '' : 's'}.`
        );
        reloadVendors();
      } else if (action === 'approve') {
        const vendorSnap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
        const vendorData = vendorSnap.exists() ? vendorSnap.data() : {};
        
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), { approved: true }).catch(() => null)
        ));
        
        // Best-effort role update
        if (vendorEmail) {
          const q = fsm.query(fsm.collection(db, 'attendees'), fsm.where('email', '==', vendorEmail));
          const asnap = await fsm.getDocs(q);
          if (!asnap.empty) {
            await Promise.all(asnap.docs.map((docSnap) =>
              fsm.updateDoc(docSnap.ref, { role: 'vendor' }).catch(() => null)
            ));
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
      } else if (action === 'send-invite') {
        if (!vendorEmail) {
          setButtonLoading(el, false);
          Toast('Vendor is missing an email address');
          return;
        }
        await sendInviteToVendor(vendorId, vendorName, vendorEmail, sourceIds.join(','));
        reloadVendors();
      } else if (action === 'resend-invite') {
        if (!vendorEmail) {
          setButtonLoading(el, false);
          Toast('Vendor is missing an email address');
          return;
        }

        setButtonLoading(el, false);
        const choice = await showInviteResendOptionsModal(vendorName, vendorEmail);
        if (!choice) return;

        if (choice === 'invite') {
          setButtonLoading(el, true, 'Resending...');
          await sendInviteToVendor(vendorId, vendorName, vendorEmail, sourceIds.join(','));
          reloadVendors();
          return;
        }

        setButtonLoading(el, true, 'Sending reset...');
        await sendVendorPasswordResetEmail(vendorEmail);
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), {
            inviteStatus: 'sent',
            passwordResetStatus: 'sent',
            passwordResetSentAt: new Date().toISOString(),
            inviteError: null
          }).catch(() => null)
        ));
        Toast(`Password reset sent to ${vendorEmail}`, 'success');
        reloadVendors();
      } else if (action === 'send-password-reset') {
        if (!vendorEmail) {
          setButtonLoading(el, false);
          Toast('Vendor is missing an email address');
          return;
        }
        await sendVendorPasswordResetEmail(vendorEmail);
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), {
            inviteStatus: 'sent',
            passwordResetStatus: 'sent',
            passwordResetSentAt: new Date().toISOString(),
            inviteError: null
          }).catch(() => null)
        ));
        Toast(`Password reset sent to ${vendorEmail}`, 'success');
        reloadVendors();
      } else if (action === 'send-contract-reminder') {
        if (!vendorEmail) {
          setButtonLoading(el, false);
          Toast('Vendor is missing an email address');
          return;
        }

        const vendorSnap = await fsm.getDoc(fsm.doc(db, 'vendors', vendorId));
        const vendorData = vendorSnap.exists() ? vendorSnap.data() : {};
        const contractUrl = String(vendorData.contractUrl || getVendorContractUrl()).trim() || getVendorContractUrl();
        const reminderCount = Number(vendorData.contractReminderCount || 0) + 1;

        await sendVendorContractReminderEmail(vendorEmail, {
          businessName: vendorName || vendorData.name || vendorData.companyName || 'Vendor',
          showName: vendorData.showName || getCurrentShow()?.shortName || '',
          contractUrl,
          vendorId
        });

        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), {
            contractUrl,
            contractReminderSentAt: new Date().toISOString(),
            contractReminderCount: reminderCount,
            contractReminderBy: 'admin'
          }).catch(() => null)
        ));

        Toast(`Contract reminder sent to ${vendorEmail}`, 'success');
        reloadVendors();
      } else if (action === 'mark-paid') {
        setButtonLoading(el, false);
        const confirmed = await ConfirmDialog('Mark Vendor Paid', `Mark ${vendorName || 'this vendor'} as paid?`, { confirmText: 'Mark Paid' });
        if (!confirmed) return;

        setButtonLoading(el, true, 'Saving...');
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), {
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            paidBy: 'admin_manual'
          }).catch(() => null)
        ));
        Toast('Vendor marked as paid');
        reloadVendors();
      } else if (action === 'mark-unpaid') {
        setButtonLoading(el, false);
        const confirmed = await ConfirmDialog('Mark Vendor Unpaid', `Set ${vendorName || 'this vendor'} back to unpaid?`, { confirmText: 'Mark Unpaid' });
        if (!confirmed) return;

        setButtonLoading(el, true, 'Saving...');
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), {
            paymentStatus: 'pending',
            paidAt: null,
            paidBy: null
          }).catch(() => null)
        ));
        Toast('Vendor marked as unpaid');
        reloadVendors();
      } else if (action === 'deny') {
        setButtonLoading(el, false);
        
        // Show denial modal with reason input
        const reason = await showDenialModal(vendorName);
        if (!reason) return; // User cancelled
        
        setButtonLoading(el, true, 'Denying...');
        
        await Promise.all(sourceIds.map((id) =>
          fsm.updateDoc(fsm.doc(db, 'vendors', id), { 
            approved: false,
            denied: true,
            denialReason: reason,
            deniedAt: new Date().toISOString()
          }).catch(() => null)
        ));
        
        // Send denial email (non-blocking)
        if (vendorEmail) {
          sendVendorDenialEmail(vendorEmail, {
            businessName: vendorName,
            reason: reason
          }).catch(err => console.warn('Denial email send failed:', err));
        }
        
        Toast('Vendor application denied');
        reloadVendors();
      } else if (action === 'delete') {
        setButtonLoading(el, false);
        const confirmed = await ConfirmDialog(
          'Delete Vendor',
          `Are you sure you want to delete this vendor${sourceIds.length > 1 ? ` and ${sourceIds.length - 1} duplicate record${sourceIds.length - 1 === 1 ? '' : 's'}` : ''}? This action cannot be undone.`,
          { danger: true, confirmText: 'Delete' }
        );
        if (!confirmed) return;
        
        setButtonLoading(el, true, 'Deleting...');
        await Promise.all(sourceIds.map((id) =>
          fsm.deleteDoc(fsm.doc(db, 'vendors', id)).catch(() => null)
        ));
        Toast(`Vendor deleted (${sourceIds.length} record${sourceIds.length === 1 ? '' : 's'})`);
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
