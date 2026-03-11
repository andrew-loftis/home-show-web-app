#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

const DEFAULT_FALL_SHOW_ID = 'putnam-fall-2026';

function usage() {
  return [
    'Usage:',
    '  node scripts/report-login-and-fall-vendors.mjs [options]',
    '',
    'Options:',
    `  --fall-show-id <id>      Fall show id (default: ${DEFAULT_FALL_SHOW_ID})`,
    '  --output-prefix <name>   Output file prefix (default: vendor-login-fall-report)',
    '  --output-dir <path>      Output directory (default: current working directory)'
  ].join('\n');
}

function parseArgs(argv = []) {
  const out = {
    fallShowId: DEFAULT_FALL_SHOW_ID,
    outputPrefix: 'vendor-login-fall-report',
    outputDir: process.cwd()
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '').trim();
    if (!arg) continue;

    if (arg === '--fall-show-id' && argv[i + 1]) {
      out.fallShowId = String(argv[i + 1] || '').trim() || DEFAULT_FALL_SHOW_ID;
      i += 1;
      continue;
    }
    if (arg === '--output-prefix' && argv[i + 1]) {
      out.outputPrefix = String(argv[i + 1] || '').trim() || out.outputPrefix;
      i += 1;
      continue;
    }
    if (arg === '--output-dir' && argv[i + 1]) {
      out.outputDir = path.resolve(process.cwd(), String(argv[i + 1] || '').trim());
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
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

async function getAuthUserByEmail(email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function writeCsv(filePath, rows = [], columns = []) {
  const lines = [columns.join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((col) => csvEscape(row[col] ?? '')).join(','));
  });
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function stampNow() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function uniq(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await ensureFirebaseAdmin();
  const db = admin.firestore();

  const allSnap = await db.collection('vendors').get();
  const allVendors = allSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const fallVendors = allVendors.filter((vendor) => normalizeText(vendor.showId) === args.fallShowId);

  const authCache = new Map();
  const getCachedAuth = async (email) => {
    const key = normalizeEmail(email);
    if (!key) return null;
    if (authCache.has(key)) return authCache.get(key);
    const user = await getAuthUserByEmail(key).catch(() => null);
    authCache.set(key, user);
    return user;
  };

  // 1) Reset sent + has sign-in (interpreted as went through login after reset invite)
  const byEmailReset = new Map();
  for (const vendor of allVendors) {
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    if (!isValidEmail(email)) continue;
    if (!wasResetSent(vendor)) continue;

    if (!byEmailReset.has(email)) {
      byEmailReset.set(email, {
        email,
        vendorNames: new Set(),
        showIds: new Set(),
        vendorIds: new Set(),
        latestResetSentAtMs: 0
      });
    }

    const row = byEmailReset.get(email);
    const name = normalizeText(vendor.name || vendor.companyName);
    if (name) row.vendorNames.add(name);
    const showId = normalizeText(vendor.showId);
    if (showId) row.showIds.add(showId);
    row.vendorIds.add(vendor.id);
    row.latestResetSentAtMs = Math.max(row.latestResetSentAtMs, toMillis(gatherResetSentAt(vendor)));
  }

  const resetSentAndLoggedIn = [];
  for (const row of byEmailReset.values()) {
    const authUser = await getCachedAuth(row.email);
    const lastSignInTime = normalizeText(authUser?.metadata?.lastSignInTime);
    if (!lastSignInTime) continue;

    resetSentAndLoggedIn.push({
      email: row.email,
      vendorNames: uniq(Array.from(row.vendorNames)).join(' | '),
      showIds: uniq(Array.from(row.showIds)).join('|'),
      vendorDocCount: row.vendorIds.size,
      latestResetSentAt: row.latestResetSentAtMs ? new Date(row.latestResetSentAtMs).toISOString() : '',
      lastSignInTime
    });
  }

  resetSentAndLoggedIn.sort((a, b) => a.email.localeCompare(b.email));

  // 2) Full fall vendor roster list
  const fallRoster = [];
  for (const vendor of fallVendors) {
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    const authUser = isValidEmail(email) ? await getCachedAuth(email) : null;
    fallRoster.push({
      vendorId: vendor.id,
      name: normalizeText(vendor.name || vendor.companyName),
      email,
      category: normalizeText(vendor.category),
      contactPhone: normalizeText(vendor.contactPhone || vendor.phone),
      approved: vendor.approved === true ? 'yes' : 'no',
      status: normalizeText(vendor.status || ''),
      contractSigned: vendor.contractSigned === true ? 'yes' : 'no',
      inviteStatus: normalizeText(vendor.inviteStatus || ''),
      passwordResetStatus: normalizeText(vendor.passwordResetStatus || ''),
      latestResetSentAt: toIso(gatherResetSentAt(vendor)),
      ownerUid: normalizeText(vendor.ownerUid),
      authLastSignInTime: normalizeText(authUser?.metadata?.lastSignInTime),
      createdAt: toIso(vendor.createdAt),
      updatedAt: toIso(vendor.updatedAt || vendor.createdAt)
    });
  }

  fallRoster.sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.email.localeCompare(b.email);
  });

  const stamp = stampNow();
  const outputDir = path.resolve(args.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const base = `${args.outputPrefix}-${stamp}`;
  const jsonPath = path.join(outputDir, `${base}.json`);
  const resetLoggedInCsvPath = path.join(outputDir, `${base}-reset-sent-and-logged-in.csv`);
  const fallRosterCsvPath = path.join(outputDir, `${base}-fall-vendors.csv`);

  const payload = {
    generatedAt: new Date().toISOString(),
    fallShowId: args.fallShowId,
    totalVendorDocsAllShows: allVendors.length,
    totalVendorDocsFallShow: fallVendors.length,
    resetSentAndLoggedInCount: resetSentAndLoggedIn.length,
    resetSentAndLoggedIn,
    fallVendors: fallRoster
  };

  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  await writeCsv(
    resetLoggedInCsvPath,
    resetSentAndLoggedIn,
    ['email', 'vendorNames', 'showIds', 'vendorDocCount', 'latestResetSentAt', 'lastSignInTime']
  );
  await writeCsv(
    fallRosterCsvPath,
    fallRoster,
    ['vendorId', 'name', 'email', 'category', 'contactPhone', 'approved', 'status', 'contractSigned', 'inviteStatus', 'passwordResetStatus', 'latestResetSentAt', 'ownerUid', 'authLastSignInTime', 'createdAt', 'updatedAt']
  );

  console.log('\nReport summary');
  console.log(`- Fall show ID: ${args.fallShowId}`);
  console.log(`- Total vendor docs (all shows): ${allVendors.length}`);
  console.log(`- Total vendor docs (fall show): ${fallVendors.length}`);
  console.log(`- Reset sent + logged in: ${resetSentAndLoggedIn.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- CSV (reset sent + logged in): ${resetLoggedInCsvPath}`);
  console.log(`- CSV (fall vendors): ${fallRosterCsvPath}`);
}

main().catch((error) => {
  console.error('report-login-and-fall-vendors failed:', error?.message || error);
  process.exit(1);
});
