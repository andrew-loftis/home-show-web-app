#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

const TARGETS = [
  { name: 'All American Matters', email: 'derrick@allamericanmatress.com' },
  { name: 'American Home Design', email: 'unknown@americanhomedesign.com' },
  { name: 'Bruck Contractors', email: 'info@bruckcontractors.com' },
  { name: 'Budget Blinds', email: 'itaylor@budgetblinds.com' },
  { name: 'Cumberland Cleaning Company', email: 'mail@cumberlandcleaning.com' },
  { name: 'Cutco', email: 'events@cutco.com' },
  { name: 'Innovative Home Services', email: 'uknown@innovativehomeservices.com' },
  { name: 'LeafHome Bath', email: 'events@leafhomeenhancements.com' },
  { name: 'LeafX of TN', email: 'tjholland.th@gmail.com' },
  { name: 'Upper Cumberland Generators', email: 'ucgenerators@gmail.com' },
  { name: 'USA Granite', email: 'help@theusagranite.com' }
];

function usage() {
  return [
    'Usage:',
    '  node scripts/remove-vendor-duplicates.mjs [options]',
    '',
    'Options:',
    '  --execute            Perform deletion (default is dry-run)',
    '  --output-dir <path>  Backup/report directory (default: current working directory)'
  ].join('\n');
}

function parseArgs(argv = []) {
  const out = {
    execute: false,
    outputDir: process.cwd()
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '').trim();
    if (!arg) continue;

    if (arg === '--execute') {
      out.execute = true;
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

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
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

function stampNow() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function mapVendor(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    refPath: docSnap.ref.path,
    name: normalizeText(data.name || data.companyName),
    email: normalizeEmail(data.contactEmail || data.email),
    showId: normalizeText(data.showId),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    data
  };
}

async function findMatches(db) {
  const allSnap = await db.collection('vendors').get();
  const allVendors = allSnap.docs.map(mapVendor);

  const targetIndex = new Map(
    TARGETS.map((target) => {
      const key = `${normalizeText(target.name)}|${normalizeEmail(target.email)}`;
      return [key, { ...target, key, matches: [] }];
    })
  );

  for (const vendor of allVendors) {
    const key = `${normalizeText(vendor.name)}|${normalizeEmail(vendor.email)}`;
    const target = targetIndex.get(key);
    if (target) {
      target.matches.push(vendor);
    }
  }

  return {
    allVendorCount: allVendors.length,
    targets: Array.from(targetIndex.values()),
    totalMatchedDocs: Array.from(targetIndex.values()).reduce((sum, item) => sum + item.matches.length, 0)
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await ensureFirebaseAdmin();
  const db = admin.firestore();

  const report = await findMatches(db);
  const timestamp = stampNow();
  const mode = args.execute ? 'execute' : 'dry-run';

  const outputDir = path.resolve(args.outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  const base = `vendor-duplicate-removal-${mode}-${timestamp}`;
  const reportPath = path.join(outputDir, `${base}.json`);

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    mode,
    allVendorCount: report.allVendorCount,
    totalMatchedDocs: report.totalMatchedDocs,
    targets: report.targets.map((item) => ({
      name: item.name,
      email: item.email,
      matchCount: item.matches.length,
      matches: item.matches.map((vendor) => ({
        id: vendor.id,
        refPath: vendor.refPath,
        showId: vendor.showId,
        name: vendor.name,
        email: vendor.email,
        createdAt: vendor.createdAt || null,
        updatedAt: vendor.updatedAt || null
      }))
    }))
  };

  await fs.writeFile(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');

  console.log('\nDuplicate cleanup scan');
  console.log(`- Mode: ${mode}`);
  console.log(`- Total vendor docs scanned: ${report.allVendorCount}`);
  console.log(`- Matched docs targeted: ${report.totalMatchedDocs}`);
  console.log(`- Report: ${reportPath}`);

  for (const item of report.targets) {
    console.log(`  * ${item.name} <${item.email}> -> ${item.matches.length} matches`);
    for (const vendor of item.matches) {
      console.log(`      - ${vendor.id} [show=${vendor.showId || 'n/a'}]`);
    }
  }

  if (!args.execute) {
    console.log('\nDry-run only. Re-run with --execute to delete matched docs.');
    return;
  }

  if (!report.totalMatchedDocs) {
    console.log('\nNo matched docs found, nothing deleted.');
    return;
  }

  const backupPath = path.join(outputDir, `${base}-backup.json`);
  const backupPayload = {
    generatedAt: new Date().toISOString(),
    matchedCount: report.totalMatchedDocs,
    vendors: report.targets.flatMap((item) =>
      item.matches.map((vendor) => ({
        targetName: item.name,
        targetEmail: item.email,
        id: vendor.id,
        refPath: vendor.refPath,
        showId: vendor.showId,
        data: vendor.data
      }))
    )
  };
  await fs.writeFile(backupPath, JSON.stringify(backupPayload, null, 2), 'utf8');

  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  const commitBatch = async () => {
    if (!batchCount) return;
    await batch.commit();
    deleted += batchCount;
    batch = db.batch();
    batchCount = 0;
  };

  for (const item of report.targets) {
    for (const vendor of item.matches) {
      batch.delete(db.collection('vendors').doc(vendor.id));
      batchCount += 1;
      if (batchCount >= 450) {
        await commitBatch();
      }
    }
  }
  await commitBatch();

  console.log('\nDeletion complete');
  console.log(`- Deleted vendor docs: ${deleted}`);
  console.log(`- Backup: ${backupPath}`);
}

main().catch((error) => {
  console.error('remove-vendor-duplicates failed:', error?.message || error);
  process.exit(1);
});
