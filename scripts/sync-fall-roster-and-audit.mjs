#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

const DEFAULT_SPRING_SHOW_ID = 'putnam-spring-2026';
const DEFAULT_FALL_SHOW_ID = 'putnam-fall-2026';
const DEFAULT_CONTRACT_URL = '/assets/contracts/Vendor-Contract-Source.docx';
const DEFAULT_CONTRACT_VERSION = '2026-03-04-v1';

function usage() {
  return [
    'Usage:',
    '  node scripts/sync-fall-roster-and-audit.mjs --csv <vendors.csv> [options]',
    '',
    'Options:',
    `  --spring-show-id <id>      Spring source show id (default: ${DEFAULT_SPRING_SHOW_ID})`,
    `  --fall-show-id <id>        Fall target show id (default: ${DEFAULT_FALL_SHOW_ID})`,
    '  --fall-show-name <name>    Fall show display name override',
    '  --dry-run                  Analyze only, do not write vendor docs',
    '  --skip-create-auth         Do not create missing Firebase Auth users',
    '  --output <path>            Optional report JSON path',
    '',
    'CSV headers accepted:',
    '  emailAddress|email|contact_email, name|company|business_name, category, phone, website'
  ].join('\n');
}

function parseArgs(argv = []) {
  const out = {
    csv: '',
    springShowId: DEFAULT_SPRING_SHOW_ID,
    fallShowId: DEFAULT_FALL_SHOW_ID,
    fallShowName: '',
    dryRun: false,
    skipCreateAuth: false,
    output: ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '').trim();
    if (!arg) continue;

    if (!arg.startsWith('--')) {
      if (!out.csv) out.csv = arg;
      continue;
    }

    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--skip-create-auth') {
      out.skipCreateAuth = true;
      continue;
    }
    if (arg === '--csv' && argv[i + 1]) {
      out.csv = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg === '--spring-show-id' && argv[i + 1]) {
      out.springShowId = String(argv[i + 1] || '').trim() || DEFAULT_SPRING_SHOW_ID;
      i += 1;
      continue;
    }
    if (arg === '--fall-show-id' && argv[i + 1]) {
      out.fallShowId = String(argv[i + 1] || '').trim() || DEFAULT_FALL_SHOW_ID;
      i += 1;
      continue;
    }
    if (arg === '--fall-show-name' && argv[i + 1]) {
      out.fallShowName = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg === '--output' && argv[i + 1]) {
      out.output = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
  }

  return out;
}

function stripAnsi(value) {
  return String(value || '').replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function sanitizeNetlifyEnvValue(value) {
  const output = stripAnsi(value).trim();
  if (!output) return '';
  if (/^no value set\b/i.test(output)) return '';
  if (/^no value currently set\b/i.test(output)) return '';
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

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
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

function safeShowName(showId, explicitName = '') {
  if (normalizeText(explicitName)) return normalizeText(explicitName);
  const id = normalizeText(showId).toLowerCase();
  if (id.includes('fall')) return 'Putnam County Fall Home Show';
  if (id.includes('spring')) return '2026 Spring Home Show';
  return 'WinnPro Home Show';
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

function pickField(row, keys = []) {
  for (const key of keys) {
    const value = normalizeText(row?.[key]);
    if (value) return value;
  }
  return '';
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function writeCsv(filePath, rows = [], columns = []) {
  const header = columns.join(',');
  const lines = [header];
  rows.forEach((row) => {
    lines.push(columns.map((col) => escapeCsv(row[col] ?? '')).join(','));
  });
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function randomPassword(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
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

function reportPath(defaultNamePrefix = 'fall-roster-sync-report') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(process.cwd(), `${defaultNamePrefix}-${stamp}.json`);
}

function toIso(value) {
  const ms = toMillis(value);
  if (!ms) return '';
  try {
    return new Date(ms).toISOString();
  } catch {
    return '';
  }
}

function gatherResetSentAt(vendor = {}) {
  return vendor.passwordResetSentAt || vendor.inviteSentAt || null;
}

function wasResetSent(vendor = {}) {
  const passwordStatus = normalizeText(vendor.passwordResetStatus).toLowerCase();
  const inviteStatus = normalizeText(vendor.inviteStatus).toLowerCase();
  if (passwordStatus === 'sent') return true;
  if (inviteStatus === 'sent') return true;
  if (gatherResetSentAt(vendor)) return true;
  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv) {
    console.log(usage());
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), args.csv);
  const csvText = await fs.readFile(csvPath, 'utf8');
  const csvRows = parseCsv(csvText);
  await ensureFirebaseAdmin();
  const db = admin.firestore();

  const springShowId = normalizeText(args.springShowId) || DEFAULT_SPRING_SHOW_ID;
  const fallShowId = normalizeText(args.fallShowId) || DEFAULT_FALL_SHOW_ID;
  const fallShowName = safeShowName(fallShowId, args.fallShowName);

  const springSnap = await db.collection('vendors').where('showId', '==', springShowId).get();
  const fallSnap = await db.collection('vendors').where('showId', '==', fallShowId).get();
  const allVendorsSnap = await db.collection('vendors').get();

  const springVendors = springSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const fallVendors = fallSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const allVendors = allVendorsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const fallEmailMap = new Map();
  for (const vendor of fallVendors) {
    const emails = [
      normalizeEmail(vendor.contactEmail),
      normalizeEmail(vendor.email)
    ].filter(Boolean);
    for (const email of emails) {
      if (!fallEmailMap.has(email)) fallEmailMap.set(email, []);
      fallEmailMap.get(email).push(vendor);
    }
  }

  const candidates = new Map();

  const upsertCandidate = (email, patch = {}, source = '') => {
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) return;

    if (!candidates.has(key)) {
      candidates.set(key, {
        email: key,
        name: '',
        category: '',
        phone: '',
        website: '',
        profile: {},
        ownerUid: '',
        approved: true,
        status: 'approved',
        sourceTypes: new Set(),
        springVendorIds: []
      });
    }

    const row = candidates.get(key);
    if (source) row.sourceTypes.add(source);
    if (patch.name && !row.name) row.name = patch.name;
    if (patch.category && !row.category) row.category = patch.category;
    if (patch.phone && !row.phone) row.phone = patch.phone;
    if (patch.website && !row.website) row.website = patch.website;
    if (patch.profile && Object.keys(row.profile || {}).length === 0) row.profile = patch.profile;
    if (patch.ownerUid && !row.ownerUid) row.ownerUid = patch.ownerUid;
    if (typeof patch.approved === 'boolean') row.approved = patch.approved;
    if (patch.status) row.status = patch.status;
    if (patch.springVendorId) row.springVendorIds.push(patch.springVendorId);
  };

  for (const vendor of springVendors) {
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    if (!isValidEmail(email)) continue;
    upsertCandidate(email, {
      name: normalizeText(vendor.name || vendor.companyName),
      category: normalizeText(vendor.category),
      phone: normalizeText(vendor.contactPhone || vendor.phone),
      website: normalizeText(vendor.website),
      profile: vendor.profile && typeof vendor.profile === 'object' ? vendor.profile : {},
      ownerUid: normalizeText(vendor.ownerUid),
      approved: vendor.approved !== false,
      status: normalizeText(vendor.status || (vendor.approved ? 'approved' : 'pending')),
      springVendorId: vendor.id
    }, 'spring');
  }

  for (const row of csvRows) {
    const email = normalizeEmail(pickField(row, ['emailaddress', 'email_address', 'email', 'contact_email']));
    if (!isValidEmail(email)) continue;
    upsertCandidate(email, {
      name: pickField(row, ['name', 'company', 'business_name']),
      category: pickField(row, ['category', 'vendor_category']),
      phone: pickField(row, ['phone', 'contact_phone']),
      website: pickField(row, ['website', 'url'])
    }, 'csv');
  }

  const missingBeforeAdd = [];
  const alreadyInFall = [];
  for (const candidate of candidates.values()) {
    if (fallEmailMap.has(candidate.email)) {
      alreadyInFall.push(candidate);
    } else {
      missingBeforeAdd.push(candidate);
    }
  }

  const addedToFall = [];
  const failedToAdd = [];
  let authUsersCreated = 0;

  for (const candidate of missingBeforeAdd) {
    const displayName = normalizeText(candidate.name) || candidate.email.split('@')[0];
    let ownerUid = normalizeText(candidate.ownerUid);

    try {
      if (!args.skipCreateAuth) {
        const authResult = await ensureAuthUser(candidate.email, displayName);
        if (authResult.created) authUsersCreated += 1;
        ownerUid = ownerUid || normalizeText(authResult.user?.uid);
      }

      if (!args.dryRun) {
        await db.collection('vendors').add({
          name: displayName,
          companyName: displayName,
          contactEmail: candidate.email,
          category: normalizeText(candidate.category) || 'Other',
          phone: normalizeText(candidate.phone),
          contactPhone: normalizeText(candidate.phone),
          website: normalizeText(candidate.website),
          approved: candidate.approved !== false,
          status: normalizeText(candidate.status) || (candidate.approved !== false ? 'approved' : 'pending'),
          ownerUid: ownerUid || null,
          showId: fallShowId,
          showName: fallShowName,
          imported: true,
          importSource: 'fall_roster_sync',
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          profile: candidate.profile && typeof candidate.profile === 'object' ? candidate.profile : {},
          contractRequired: true,
          contractSigned: false,
          contractSignerName: '',
          contractSignerEmail: candidate.email,
          contractVersion: DEFAULT_CONTRACT_VERSION,
          contractUrl: DEFAULT_CONTRACT_URL,
          contractReminderCount: 0,
          sourceSpringShowId: springShowId,
          sourceSpringVendorIds: Array.from(new Set(candidate.springVendorIds)),
          sourceTypes: Array.from(candidate.sourceTypes),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      addedToFall.push({
        email: candidate.email,
        name: displayName,
        sourceTypes: Array.from(candidate.sourceTypes).join('|'),
        approved: candidate.approved !== false ? 'yes' : 'no',
        ownerUid: ownerUid || ''
      });
    } catch (error) {
      failedToAdd.push({
        email: candidate.email,
        name: displayName,
        sourceTypes: Array.from(candidate.sourceTypes).join('|'),
        error: String(error?.message || error || 'unknown_error')
      });
    }
  }

  // Password reset sent but still no sign-in
  const byEmailAll = new Map();
  for (const vendor of allVendors) {
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    if (!isValidEmail(email)) continue;
    if (!byEmailAll.has(email)) byEmailAll.set(email, []);
    byEmailAll.get(email).push(vendor);
  }

  const resetSentNoLogin = [];
  for (const [email, records] of byEmailAll.entries()) {
    const sentRecords = records.filter((row) => wasResetSent(row));
    if (!sentRecords.length) continue;

    let authUser = null;
    try {
      authUser = await getAuthUserByEmail(email);
    } catch {}

    const lastSignInTime = normalizeText(authUser?.metadata?.lastSignInTime);
    if (lastSignInTime) continue;

    const latestSent = sentRecords.reduce((best, row) => {
      const current = toMillis(gatherResetSentAt(row));
      return current > best ? current : best;
    }, 0);

    const shows = Array.from(new Set(records.map((row) => normalizeText(row.showId)).filter(Boolean))).join('|');
    const names = Array.from(new Set(records.map((row) => normalizeText(row.name || row.companyName)).filter(Boolean))).slice(0, 3).join(' | ');

    resetSentNoLogin.push({
      email,
      vendorNames: names,
      showIds: shows,
      authUserExists: authUser ? 'yes' : 'no',
      lastSignInTime: '',
      latestResetSentAt: latestSent ? new Date(latestSent).toISOString() : ''
    });
  }

  resetSentNoLogin.sort((a, b) => a.email.localeCompare(b.email));

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    csvPath,
    springShowId,
    fallShowId,
    fallShowName,
    csvRowsParsed: csvRows.length,
    springVendors: springVendors.length,
    fallVendors: fallVendors.length,
    requiredUniqueVendorsForFall: candidates.size,
    alreadyInFall: alreadyInFall.length,
    missingBeforeAdd: missingBeforeAdd.length,
    addedToFall: addedToFall.length,
    failedToAdd: failedToAdd.length,
    authUsersCreated,
    resetSentNoLoginCount: resetSentNoLogin.length,
    missingBeforeAddList: missingBeforeAdd.map((row) => ({
      email: row.email,
      name: row.name || '',
      sourceTypes: Array.from(row.sourceTypes).join('|')
    })),
    addedToFallList: addedToFall,
    failedToAddList: failedToAdd,
    resetSentNoLoginList: resetSentNoLogin
  };

  const outputJson = args.output
    ? path.resolve(process.cwd(), args.output)
    : reportPath('fall-roster-sync-report');
  const outputDir = path.dirname(outputJson);
  const stem = path.basename(outputJson, path.extname(outputJson));

  const missingCsvPath = path.join(outputDir, `${stem}-missing-before-add.csv`);
  const addedCsvPath = path.join(outputDir, `${stem}-added-to-fall.csv`);
  const resetCsvPath = path.join(outputDir, `${stem}-reset-sent-no-login.csv`);

  await fs.writeFile(outputJson, JSON.stringify(report, null, 2), 'utf8');
  await writeCsv(
    missingCsvPath,
    report.missingBeforeAddList,
    ['email', 'name', 'sourceTypes']
  );
  await writeCsv(
    addedCsvPath,
    report.addedToFallList,
    ['email', 'name', 'sourceTypes', 'approved', 'ownerUid']
  );
  await writeCsv(
    resetCsvPath,
    report.resetSentNoLoginList,
    ['email', 'vendorNames', 'showIds', 'authUserExists', 'lastSignInTime', 'latestResetSentAt']
  );

  console.log('\nFall roster sync summary');
  console.log(`- Spring show vendors: ${report.springVendors}`);
  console.log(`- Fall show vendors (before sync): ${report.fallVendors}`);
  console.log(`- CSV rows parsed: ${report.csvRowsParsed}`);
  console.log(`- Required unique fall vendors: ${report.requiredUniqueVendorsForFall}`);
  console.log(`- Already in fall: ${report.alreadyInFall}`);
  console.log(`- Missing before add: ${report.missingBeforeAdd}`);
  console.log(`- Added to fall: ${report.addedToFall}`);
  console.log(`- Failed to add: ${report.failedToAdd}`);
  console.log(`- Auth users created: ${report.authUsersCreated}`);
  console.log(`- Reset sent + no login: ${report.resetSentNoLoginCount}`);
  console.log(`- Report JSON: ${outputJson}`);
  console.log(`- Missing list CSV: ${missingCsvPath}`);
  console.log(`- Added list CSV: ${addedCsvPath}`);
  console.log(`- Reset no-login CSV: ${resetCsvPath}`);
}

main().catch((error) => {
  console.error('sync-fall-roster-and-audit failed:', error?.message || error);
  process.exit(1);
});
