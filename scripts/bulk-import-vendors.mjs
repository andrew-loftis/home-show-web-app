#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

const DEFAULT_SHOW_ID = 'putnam-spring-2026';
const DEFAULT_CONTRACT_URL = '/assets/contracts/Vendor-Contract-Source.docx';
const DEFAULT_CONTRACT_VERSION = '2026-03-04-v1';

function parseArgs(argv = []) {
  const out = {
    file: '',
    showId: DEFAULT_SHOW_ID,
    showName: '',
    dryRun: false,
    sendReset: false,
    resendExistingReset: false,
    sendContractReminders: false,
    autoApprove: true,
    limit: 0
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '').trim();
    if (!arg) continue;

    if (!arg.startsWith('--')) {
      if (!out.file) out.file = arg;
      continue;
    }

    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--send-reset') {
      out.sendReset = true;
      continue;
    }
    if (arg === '--no-send-reset') {
      out.sendReset = false;
      continue;
    }
    if (arg === '--resend-existing-reset') {
      out.resendExistingReset = true;
      continue;
    }
    if (arg === '--no-resend-existing-reset') {
      out.resendExistingReset = false;
      continue;
    }
    if (arg === '--send-contract-reminders') {
      out.sendContractReminders = true;
      continue;
    }
    if (arg === '--no-send-contract-reminders') {
      out.sendContractReminders = false;
      continue;
    }
    if (arg === '--auto-approve') {
      out.autoApprove = true;
      continue;
    }
    if (arg === '--no-auto-approve') {
      out.autoApprove = false;
      continue;
    }
    if (arg === '--file' && argv[i + 1]) {
      out.file = String(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--show-id' && argv[i + 1]) {
      out.showId = String(argv[i + 1]).trim() || DEFAULT_SHOW_ID;
      i += 1;
      continue;
    }
    if (arg === '--show-name' && argv[i + 1]) {
      out.showName = String(argv[i + 1]).trim();
      i += 1;
      continue;
    }
    if (arg === '--limit' && argv[i + 1]) {
      out.limit = Math.max(0, Number.parseInt(String(argv[i + 1]), 10) || 0);
      i += 1;
      continue;
    }
  }

  return out;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/bulk-import-vendors.mjs --file <vendors.csv> [options]',
    '',
    'Options:',
    '  --show-id <id>                   Show id (default: putnam-spring-2026)',
    '  --show-name <name>               Show display name override',
    '  --dry-run                        Parse and analyze only (no writes, no emails)',
    '  --send-reset / --no-send-reset   Send reset for newly created vendors (default: no-send)',
    '  --resend-existing-reset / --no-resend-existing-reset',
    '                                   For existing vendors, resend reset if no sign-in detected (default: no-resend)',
    '  --send-contract-reminders / --no-send-contract-reminders',
    '                                   Send contract reminder to unsigned vendors (default: no-send)',
    '  --auto-approve / --no-auto-approve',
    '                                   Mark newly imported vendors approved (default: approve)',
    '  --limit <n>                      Process first n parsed rows only',
    '',
    'Accepted CSV headers (aliases):',
    '  name|company|business_name, email|contact_email, category|vendor_category,',
    '  phone|contact_phone, booth|booth_number, website|url, description|bio, address'
  ].join('\n');
}

function stripAnsi(value) {
  return String(value || '').replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function sanitizeNetlifyEnvValue(value) {
  const output = stripAnsi(value).trim();
  if (!output) return '';
  if (/^no value set\b/i.test(output)) return '';
  if (/^no value currently set\b/i.test(output)) return '';
  // Netlify can return masked production values (e.g. ************ABCD).
  if (/^\*{4,}[A-Za-z0-9_-]{2,}$/.test(output)) return '';
  return output;
}

function netlifyEnvGet(key) {
  const contexts = ['production', 'dev'];
  for (const context of contexts) {
    const commands = [
      { cmd: 'netlify.cmd', args: ['env:get', key, '--context', context], options: { shell: false } },
      { cmd: 'netlify', args: ['env:get', key, '--context', context], options: { shell: true } },
      { cmd: 'powershell', args: ['-NoProfile', '-Command', `netlify env:get ${key} --context ${context}`], options: { shell: false } }
    ];

    for (const item of commands) {
      try {
        const result = spawnSync(item.cmd, item.args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          ...(item.options || {})
        });
        if (result.status === 0) {
          const output = sanitizeNetlifyEnvValue(result.stdout || '');
          if (output) return output;
        }
      } catch {}
    }
  }
  return '';
}

function resolveEnv(key, fallback = '') {
  const existing = String(process.env[key] || '').trim();
  if (existing) return existing;
  const fetched = netlifyEnvGet(key);
  if (fetched) {
    process.env[key] = fetched;
    return fetched;
  }
  return fallback;
}

function normalizePrivateKey(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';
  raw = raw.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
  raw = raw.replace(/\\n/g, '\n');
  const match = raw.match(/-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----/s);
  if (!match) return raw;
  const type = match[1];
  const body = String(match[2] || '').replace(/[\r\n\t ]+/g, '');
  if (!body) return raw;
  const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----\n`;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoothList(input) {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map((v) => normalizeText(v)).filter(Boolean)));
  }
  const raw = normalizeText(input);
  if (!raw) return [];
  return Array.from(new Set(raw.split(',').map((v) => normalizeText(v)).filter(Boolean)));
}

function normalizeCategory(value) {
  const raw = normalizeText(value);
  if (!raw) return 'Other';
  return raw;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && !inQuotes) {
      inQuotes = true;
      continue;
    }
    if (ch === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = false;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const rows = [];
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return rows;

  const headers = parseCsvLine(lines[0]).map((h) =>
    String(h || '')
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = String(values[idx] || '').trim().replace(/^["']|["']$/g, '');
    });
    rows.push(row);
  }

  return rows;
}

function pickField(row, candidates = []) {
  for (const key of candidates) {
    const value = normalizeText(row?.[key]);
    if (value) return value;
  }
  return '';
}

function randomPassword(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function showNameFromId(showId) {
  const id = normalizeText(showId).toLowerCase();
  if (!id) return 'WinnPro Home Show';
  if (id.includes('spring')) return 'WinnPro Spring Home Show';
  if (id.includes('fall')) return 'WinnPro Fall Home Show';
  return 'WinnPro Home Show';
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().getTime();
    } catch {
      return 0;
    }
  }
  return 0;
}

function isTruthySignedContract(vendorData = {}) {
  return vendorData.contractSigned === true;
}

function hasClaimedInvite(vendorData = {}) {
  return normalizeText(vendorData.inviteStatus).toLowerCase() === 'claimed';
}

function userHasSignedIn(authUser) {
  const lastSignIn = normalizeText(authUser?.metadata?.lastSignInTime);
  return !!lastSignIn;
}

function showMatches(docShowId, targetShowId) {
  const docShow = normalizeText(docShowId).toLowerCase();
  const target = normalizeText(targetShowId).toLowerCase();
  if (!target) return true;
  return !docShow || docShow === target;
}

function choosePrimaryVendorDoc(docSnaps = []) {
  if (!docSnaps.length) return null;
  const sorted = [...docSnaps].sort((a, b) => {
    const ad = a.data() || {};
    const bd = b.data() || {};
    const aOwner = normalizeText(ad.ownerUid) ? 1 : 0;
    const bOwner = normalizeText(bd.ownerUid) ? 1 : 0;
    if (aOwner !== bOwner) return bOwner - aOwner;
    const aApproved = ad.approved ? 1 : 0;
    const bApproved = bd.approved ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;
    const aUpdated = toMillis(ad.updatedAt || ad.createdAt);
    const bUpdated = toMillis(bd.updatedAt || bd.createdAt);
    return bUpdated - aUpdated;
  });
  return sorted[0];
}

async function ensureFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const serviceAccountRaw = resolveEnv('FIREBASE_SERVICE_ACCOUNT');
  if (serviceAccountRaw) {
    try {
      const parsed = JSON.parse(serviceAccountRaw);
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return admin;
    } catch {}
  }

  const projectId = resolveEnv('FIREBASE_PROJECT_ID');
  const clientEmail = resolveEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(resolveEnv('FIREBASE_PRIVATE_KEY'));

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_* vars.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

  return admin;
}

async function fetchVendorDocsByEmail(db, email, showId) {
  const variants = Array.from(new Set([normalizeEmail(email), normalizeText(email)].filter(Boolean)));
  const refs = new Map();
  const fields = ['contactEmail', 'email'];

  for (const field of fields) {
    for (const variant of variants) {
      const snap = await db.collection('vendors').where(field, '==', variant).limit(100).get();
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (!showMatches(data.showId, showId)) return;
        refs.set(docSnap.id, docSnap);
      });
    }
  }

  return Array.from(refs.values());
}

async function getAuthUserByEmail(email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
}

async function ensureAuthUser(email, displayName) {
  const existing = await getAuthUserByEmail(email);
  if (existing) return { user: existing, created: false };

  const created = await admin.auth().createUser({
    email,
    displayName: displayName || '',
    password: randomPassword(24),
    emailVerified: false
  });
  return { user: created, created: true };
}

async function sendTemplateEmailViaFunction({ appUrl, internalKey, to, template, data }) {
  if (!appUrl || !internalKey) {
    throw new Error('Missing APP_URL or INTERNAL_FUNCTIONS_KEY/STRIPE_WEBHOOK_SECRET for email dispatch');
  }

  const response = await fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Function-Key': internalKey
    },
    body: JSON.stringify({ to, template, data })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `send-email failed (${response.status})`);
  }
  return payload;
}

async function sendPasswordResetReminder({ appUrl, internalKey, email }) {
  const resetLink = await admin.auth().generatePasswordResetLink(email, {
    url: `${appUrl}/#/more`,
    handleCodeInApp: false
  });

  await sendTemplateEmailViaFunction({
    appUrl,
    internalKey,
    to: email,
    template: 'passwordReset',
    data: { resetLink }
  });
}

async function sendContractReminder({ appUrl, internalKey, email, businessName, showName, contractUrl, vendorId }) {
  await sendTemplateEmailViaFunction({
    appUrl,
    internalKey,
    to: email,
    template: 'vendorContractReminder',
    data: {
      businessName: businessName || 'Vendor',
      showName: showName || '',
      contractUrl: contractUrl || DEFAULT_CONTRACT_URL,
      vendorId: vendorId || ''
    }
  });
}

async function patchVendorDocs(docSnaps, patchBuilder) {
  if (!docSnaps.length) return;
  const db = admin.firestore();
  const batch = db.batch();
  docSnaps.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const patch = patchBuilder(data, docSnap.id) || null;
    if (!patch) return;
    batch.set(docSnap.ref, patch, { merge: true });
  });
  await batch.commit();
}

function reportFilePath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(process.cwd(), `import-report-${stamp}.json`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.log(usage());
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args.file);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = parseCsv(raw);
  const rows = args.limit > 0 ? parsed.slice(0, args.limit) : parsed;

  if (!rows.length) {
    throw new Error('No rows parsed from CSV file.');
  }

  await ensureFirebaseAdmin();
  const db = admin.firestore();

  const showId = normalizeText(args.showId) || DEFAULT_SHOW_ID;
  const showName = normalizeText(args.showName) || showNameFromId(showId);
  const appUrl = resolveEnv('APP_URL', resolveEnv('SITE_URL', 'https://winnpro-shows.app'));
  const internalKey = resolveEnv('STRIPE_WEBHOOK_SECRET', resolveEnv('INTERNAL_FUNCTIONS_KEY'));

  if (!args.dryRun && (args.sendReset || args.sendContractReminders) && (!appUrl || !internalKey)) {
    throw new Error('APP_URL and INTERNAL_FUNCTIONS_KEY (or STRIPE_WEBHOOK_SECRET) are required for email sending.');
  }

  const report = {
    startedAt: new Date().toISOString(),
    filePath,
    totalParsed: parsed.length,
    totalProcessed: rows.length,
    showId,
    showName,
    dryRun: args.dryRun,
    sendReset: args.sendReset,
    resendExistingReset: args.resendExistingReset,
    sendContractReminders: args.sendContractReminders,
    autoApprove: args.autoApprove,
    created: 0,
    existing: 0,
    skippedDuplicateInput: 0,
    failed: 0,
    authUsersCreated: 0,
    existingSignedIn: 0,
    existingNotSignedIn: 0,
    resetEmailsSent: 0,
    resetEmailsSentNew: 0,
    resetEmailsSentExisting: 0,
    contractRemindersSent: 0,
    contractRemindersSentNew: 0,
    contractRemindersSentExisting: 0,
    details: []
  };

  const processedEmails = new Set();
  const vendorDocCache = new Map();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const businessName = pickField(row, ['name', 'company', 'business_name', 'vendor_name']);
    const email = normalizeEmail(pickField(row, ['email', 'contact_email', 'emailaddress', 'email_address']));
    const category = normalizeCategory(pickField(row, ['category', 'vendor_category', 'vendor_type', 'service_category']));
    const phone = pickField(row, ['phone', 'contact_phone', 'telephone']);
    const boothRaw = pickField(row, ['booth', 'booth_number', 'booths']);
    const website = pickField(row, ['website', 'url', 'site']);
    const description = pickField(row, ['description', 'bio', 'notes']);
    const address = pickField(row, ['address', 'location']);

    const item = {
      row: i + 1,
      name: businessName,
      email,
      status: 'pending',
      vendorIds: [],
      hasSignedIn: false,
      actions: [],
      error: ''
    };

    if (!businessName || !email) {
      item.status = 'failed';
      item.error = 'Missing required name/email';
      report.failed += 1;
      report.details.push(item);
      continue;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      item.status = 'failed';
      item.error = 'Invalid email';
      report.failed += 1;
      report.details.push(item);
      continue;
    }

    if (processedEmails.has(email)) {
      item.status = 'skipped_duplicate_input';
      report.skippedDuplicateInput += 1;
      report.details.push(item);
      continue;
    }
    processedEmails.add(email);

    let existingVendorDocs = vendorDocCache.get(email) || null;
    if (!existingVendorDocs) {
      existingVendorDocs = await fetchVendorDocsByEmail(db, email, showId);
      vendorDocCache.set(email, existingVendorDocs);
    }

    if (existingVendorDocs.length > 0) {
      report.existing += 1;
      const primaryDoc = choosePrimaryVendorDoc(existingVendorDocs);
      const primaryData = primaryDoc?.data() || {};
      item.vendorIds = existingVendorDocs.map((docSnap) => docSnap.id);

      const authUser = await getAuthUserByEmail(email);
      const signedIn = userHasSignedIn(authUser);
      item.hasSignedIn = signedIn;
      if (signedIn) report.existingSignedIn += 1;
      else report.existingNotSignedIn += 1;

      const contractSigned = existingVendorDocs.some((docSnap) => isTruthySignedContract(docSnap.data() || {}));
      const needsResetReminder = args.sendReset && args.resendExistingReset && !signedIn;
      const needsContractReminder = args.sendContractReminders && !contractSigned;

      if (args.dryRun) {
        item.status = 'existing_reviewed';
        if (needsResetReminder) item.actions.push('would_send_password_reset');
        if (needsContractReminder) item.actions.push('would_send_contract_reminder');
        report.details.push(item);
        continue;
      }

      try {
        if (needsResetReminder) {
          await sendPasswordResetReminder({ appUrl, internalKey, email });
          await patchVendorDocs(existingVendorDocs, (docData) => ({
            inviteStatus: hasClaimedInvite(docData) ? 'claimed' : 'sent',
            inviteSentAt: admin.firestore.FieldValue.serverTimestamp(),
            inviteError: null,
            passwordResetStatus: 'sent',
            passwordResetSentAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
          item.actions.push('sent_password_reset');
          report.resetEmailsSent += 1;
          report.resetEmailsSentExisting += 1;
        }

        if (needsContractReminder) {
          const currentCount = existingVendorDocs.reduce((best, docSnap) => {
            const n = Number(docSnap.data()?.contractReminderCount || 0);
            return Math.max(best, Number.isFinite(n) ? n : 0);
          }, 0);
          const nextCount = currentCount + 1;
          const contractUrl = normalizeText(primaryData.contractUrl) || DEFAULT_CONTRACT_URL;
          await sendContractReminder({
            appUrl,
            internalKey,
            email,
            businessName: primaryData.name || primaryData.companyName || businessName,
            showName: primaryData.showName || showName,
            contractUrl,
            vendorId: primaryDoc?.id || ''
          });
          await patchVendorDocs(existingVendorDocs, () => ({
            contractRequired: true,
            contractUrl,
            contractVersion: normalizeText(primaryData.contractVersion) || DEFAULT_CONTRACT_VERSION,
            contractReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            contractReminderCount: nextCount,
            contractReminderBy: 'bulk_import_script',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
          item.actions.push('sent_contract_reminder');
          report.contractRemindersSent += 1;
          report.contractRemindersSentExisting += 1;
        }

        item.status = item.actions.length ? 'existing_updated' : 'existing_no_action';
        report.details.push(item);
        console.log(`[${i + 1}/${rows.length}] EXISTING ${email} :: ${item.status}`);
      } catch (error) {
        item.status = 'failed';
        item.error = String(error?.message || error || 'unknown_error');
        report.failed += 1;
        report.details.push(item);
        console.error(`[${i + 1}/${rows.length}] FAILED ${email} :: ${item.error}`);
      }
      continue;
    }

    const booths = normalizeBoothList(boothRaw);
    const primaryBooth = booths[0] || '';

    if (args.dryRun) {
      item.status = 'would_create';
      if (args.sendReset) item.actions.push('would_send_password_reset');
      if (args.sendContractReminders) item.actions.push('would_send_contract_reminder');
      report.created += 1;
      report.details.push(item);
      continue;
    }

    try {
      const authResult = await ensureAuthUser(email, businessName);
      if (authResult.created) report.authUsersCreated += 1;
      const ownerUid = authResult.user?.uid || null;

      const vendorRef = await db.collection('vendors').add({
        name: businessName,
        companyName: businessName,
        contactEmail: email,
        category,
        phone,
        contactPhone: phone,
        booth: booths.join(', '),
        booths,
        boothNumber: primaryBooth,
        boothCount: booths.length,
        website,
        approved: !!args.autoApprove,
        imported: true,
        importSource: 'bulk-script',
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
        showId,
        showName,
        ownerUid,
        status: args.autoApprove ? 'approved' : 'pending',
        profile: {
          description,
          bio: description,
          address
        },
        contractRequired: true,
        contractSigned: false,
        contractSignerName: '',
        contractSignerEmail: email,
        contractVersion: DEFAULT_CONTRACT_VERSION,
        contractUrl: DEFAULT_CONTRACT_URL,
        contractReminderCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      item.vendorIds = [vendorRef.id];
      report.created += 1;

      if (args.sendReset) {
        await sendPasswordResetReminder({ appUrl, internalKey, email });
        await vendorRef.set({
          inviteStatus: 'sent',
          inviteSentAt: admin.firestore.FieldValue.serverTimestamp(),
          inviteError: null,
          passwordResetStatus: 'sent',
          passwordResetSentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        item.actions.push('sent_password_reset');
        report.resetEmailsSent += 1;
        report.resetEmailsSentNew += 1;
      }

      if (args.sendContractReminders) {
        await sendContractReminder({
          appUrl,
          internalKey,
          email,
          businessName,
          showName,
          contractUrl: DEFAULT_CONTRACT_URL,
          vendorId: vendorRef.id
        });
        await vendorRef.set({
          contractRequired: true,
          contractReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          contractReminderCount: 1,
          contractReminderBy: 'bulk_import_script',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        item.actions.push('sent_contract_reminder');
        report.contractRemindersSent += 1;
        report.contractRemindersSentNew += 1;
      }

      item.status = 'created';
      report.details.push(item);
      vendorDocCache.set(email, [await vendorRef.get()]);
      console.log(`[${i + 1}/${rows.length}] CREATED ${email}`);
    } catch (error) {
      item.status = 'failed';
      item.error = String(error?.message || error || 'unknown_error');
      report.failed += 1;
      report.details.push(item);
      console.error(`[${i + 1}/${rows.length}] FAILED ${email} :: ${item.error}`);
    }
  }

  report.completedAt = new Date().toISOString();
  const outPath = reportFilePath();
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\nImport summary');
  console.log(`- Parsed rows: ${report.totalParsed}`);
  console.log(`- Processed rows: ${report.totalProcessed}`);
  console.log(`- Created vendors: ${report.created}`);
  console.log(`- Existing vendors reviewed: ${report.existing}`);
  console.log(`- Duplicate input rows skipped: ${report.skippedDuplicateInput}`);
  console.log(`- Existing signed-in: ${report.existingSignedIn}`);
  console.log(`- Existing not signed-in: ${report.existingNotSignedIn}`);
  console.log(`- Password reset emails sent: ${report.resetEmailsSent}`);
  console.log(`  - New vendors: ${report.resetEmailsSentNew}`);
  console.log(`  - Existing vendors: ${report.resetEmailsSentExisting}`);
  console.log(`- Contract reminder emails sent: ${report.contractRemindersSent}`);
  console.log(`  - New vendors: ${report.contractRemindersSentNew}`);
  console.log(`  - Existing vendors: ${report.contractRemindersSentExisting}`);
  console.log(`- Auth users created: ${report.authUsersCreated}`);
  console.log(`- Failed: ${report.failed}`);
  console.log(`- Report file: ${outPath}`);
}

main().catch((error) => {
  console.error('Bulk import failed:', error?.message || error);
  process.exit(1);
});
