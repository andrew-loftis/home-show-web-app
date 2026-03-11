#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

const UNCATEGORIZED_VALUES = new Set(['', 'other', 'n/a', 'na', 'unknown', 'uncategorized']);
const FALLBACK_CATEGORY = 'General Contractor';

const EMAIL_OVERRIDES = new Map([
  ['derrick@allamericanmattress.com', 'Furniture'],
  ['allenslanddevelopment@gmail.com', 'Landscaping'],
  ['gayle.edmiston@yahoo.com', 'General Contractor'],
  ['jbrezeale@americashomeplace.com', 'General Contractor'],
  ['mgoodchild@americanhomedesign.com', 'Interior Design'],
  ['canglin@axenrealty.com', 'Real Estate'],
  ['bandhshelters@yahoo.com', 'Security'],
  ['b&hshelters@yahoo.com', 'Security'],
  ['barrieroftn@gmail.com', 'Insulation'],
  ['marshellia.johnson@bathfitter.com', 'Bath'],
  ['curbappealoftn@gmail.com', 'Decks & Patios'],
  ['zeke@bruckcontractors.com', 'General Contractor'],
  ['jwilliams@budgetblinds.com', 'Windows'],
  ['russell@campbellpestsolutions.com', 'Pest Control'],
  ['canaeventbackdrops@gmail.com', 'Interior Design'],
  ['nathaliaskincare@gmail.com', 'Interior Design'],
  ['rick@crafthealth.com', 'Home Improvement'],
  ['vwinneccs@gmail.com', 'General Contractor'],
  ['pat@custombathandshower.com', 'Bath'],
  ['jcoley22@gmail.com', 'Kitchen'],
  ['erieevents@leafhome.com', 'Roofing'],
  ['rob@tnshield.com', 'Gutters'],
  ['wwatson@garageforce.com', 'Garage'],
  ['dennis@h20waterbiz.com', 'Water Treatment'],
  ['granvilletnoffice@gmail.com', 'Home Improvement'],
  ['james.blair@home-stretch.com', 'General Contractor'],
  ['ihrshowmanager@improveitusa.com', 'Remodeling'],
  ['moriah@irtn.co', 'General Contractor'],
  ['ims@ibyfax.com', 'Roofing'],
  ['kpresley1@gmail.com', 'Home Cleaning'],
  ['events@leaffilter.com', 'Gutters'],
  ['kschwarz@leafguard.com', 'Gutters'],
  ['natalie.bloomer@leafhome.com', 'Bath'],
  ['tjholland1.th@gmail.com', 'Gutters'],
  ['mike@middletennesseecleaners.com', 'Home Cleaning'],
  ['jaden@moderndevelopment.co', 'General Contractor'],
  ['jasonbo1462@gmail.com', 'Painting'],
  ['allison@meetinthemiddle.club', 'HVAC'],
  ['jenna@homefoodservices.com', 'Kitchen'],
  ['shanautica.sales@greatdayimprovements.com', 'Decks & Patios'],
  ['joe.patriotcontractors@gmail.com', 'General Contractor'],
  ['events@pelladirect.com', 'Windows'],
  ['aloft2@gmail.com', 'Smart Home'],
  ['putnamcountytreeservice@yahoo.com', 'Landscaping'],
  ['garry@putnamplumbing.com', 'Plumbing'],
  ['nashevents@windowsbyrba.com', 'Windows'],
  ['robertsexcavationllc@gmail.com', 'Concrete'],
  ['admin@rollingthundercarts.com', 'Outdoor Living'],
  ['sayheatingandcooling@gmail.com', 'HVAC'],
  ['amber@selksolutions.com', 'Home Improvement'],
  ['events@southernshowers.com', 'Bath'],
  ['heather@sullivanwalter.com', 'General Contractor'],
  ['patrice@supsleep.com', 'Furniture'],
  ['contact@thecrawlspacekings.com', 'Insulation'],
  ['thomas.surratt1@t-mobile.com', 'Smart Home'],
  ['shannon@truemetalsupply.com', 'Roofing'],
  ['kevin.christensen@twomen.com', 'General Contractor'],
  ['jen.christensen@twomen.com', 'General Contractor'],
  ['marketing@stabledry.com', 'Insulation'],
  ['amy@uppercumberlandgenerators.com', 'Electrical'],
  ['dunn2676@gmail.com', 'Remodeling'],
  ['deshaun@theusagranite.com', 'Countertops'],
  ['931window1@gmail.com', 'Windows'],
  ['events@wilsonbank.com', 'Mortgage'],
  ['ashlyn.windowdepot@gmail.com', 'Windows'],
  ['bredding@windownation.com', 'Windows']
]);

const NAME_OVERRIDES = new Map([
  ['all american mattress llc', 'Furniture'],
  ["allen's land development", 'Landscaping'],
  ['american home', 'General Contractor'],
  ["america's home place", 'General Contractor'],
  ['american home design', 'Interior Design'],
  ['axen realty', 'Real Estate'],
  ['b&h storm shelters', 'Security'],
  ['barrier waterproofing', 'Insulation'],
  ['bath fitter', 'Bath'],
  ['beautiful homes and decks', 'Decks & Patios'],
  ['bruck contractors llc', 'General Contractor'],
  ['budget blinds', 'Windows'],
  ['campbell pest solutions', 'Pest Control'],
  ['cana event backdrops', 'Interior Design'],
  ['clinic shape', 'Interior Design'],
  ['craft body scan', 'Home Improvement'],
  ['creative log cabins', 'General Contractor'],
  ['custom bath & shower', 'Bath'],
  ['cutco', 'Kitchen'],
  ['erie home', 'Roofing'],
  ['flowshield gutter protection', 'Gutters'],
  ['garage force of nashville', 'Garage'],
  ['h20 waterbiz southeast llc', 'Water Treatment'],
  ['historic granville', 'Home Improvement'],
  ['home stretch', 'General Contractor'],
  ['improveit home remodeling', 'Remodeling'],
  ['innovative home services', 'General Contractor'],
  ['integrity metal sales & lumber', 'Roofing'],
  ['karen’s cleaning', 'Home Cleaning'],
  ["karen's cleaning", 'Home Cleaning'],
  ['leaffilter gutter protection', 'Gutters'],
  ['leafguard', 'Gutters'],
  ['leafhome bath', 'Bath'],
  ['leafx of tn', 'Gutters'],
  ['middle tennessee cleaners', 'Home Cleaning'],
  ['modern development', 'General Contractor'],
  ['nxt generation painting, llc', 'Painting'],
  ['olympic air llc', 'HVAC'],
  ["passanante's home food services", 'Kitchen'],
  ['patio enclosures', 'Decks & Patios'],
  ['patriot contractors, llc', 'General Contractor'],
  ['pella windows and doors', 'Windows'],
  ['pixl', 'Smart Home'],
  ['putnam county tree service', 'Landscaping'],
  ['putnam plumbing', 'Plumbing'],
  ['renewal by andersen', 'Windows'],
  ['roberts excavation llc', 'Concrete'],
  ['rolling thunder carts', 'Outdoor Living'],
  ['say heating and cooling', 'HVAC'],
  ['selk solutions', 'Home Improvement'],
  ['southern showers', 'Bath'],
  ['sullivan walter homes', 'General Contractor'],
  ['superior sleep', 'Furniture'],
  ['the crawlspace kings', 'Insulation'],
  ['t-mobile', 'Smart Home'],
  ['true metal supply', 'Roofing'],
  ['two men and a truck', 'General Contractor'],
  ['united structural systems (uss)', 'Insulation'],
  ['upper cumberland generators', 'Electrical'],
  ['upper cumberland remodeling llc', 'Remodeling'],
  ['usa granite', 'Countertops'],
  ['willow window', 'Windows'],
  ['wilson bank & trust', 'Mortgage'],
  ['window depot & bath team', 'Windows'],
  ['window nation', 'Windows']
]);

const KEYWORD_RULES = [
  { category: 'Mortgage', regex: /\b(bank|mortgage|loan|lender|credit union|trust)\b/i },
  { category: 'Insurance', regex: /\binsurance\b/i },
  { category: 'Real Estate', regex: /\b(realty|real estate|realtor)\b/i },
  { category: 'Pest Control', regex: /\bpest\b/i },
  { category: 'Home Cleaning', regex: /\b(clean|cleaning|janitorial)\b/i },
  { category: 'Painting', regex: /\b(paint|coating)\b/i },
  { category: 'Plumbing', regex: /\bplumb(ing)?\b/i },
  { category: 'HVAC', regex: /\b(hvac|heating|cooling|air[- ]?conditioning|mechanical)\b/i },
  { category: 'Electrical', regex: /\b(electrical?|generator)\b/i },
  { category: 'Water Treatment', regex: /\b(water|waterproof)\b/i },
  { category: 'Gutters', regex: /\b(gutter|leafguard|leaffilter|leafx|flowshield)\b/i },
  { category: 'Bath', regex: /\b(bath|shower)\b/i },
  { category: 'Windows', regex: /\b(window|windows|doors?|blinds|pella|andersen)\b/i },
  { category: 'Countertops', regex: /\b(granite|countertop)\b/i },
  { category: 'Cabinets', regex: /\bcabinet\b/i },
  { category: 'Flooring', regex: /\bfloor(ing)?\b/i },
  { category: 'Pools & Spas', regex: /\b(pool|spa)\b/i },
  { category: 'Decks & Patios', regex: /\b(deck|patio|enclosure)\b/i },
  { category: 'Landscaping', regex: /\b(landscap|tree service|nursery|lawn|land development)\b/i },
  { category: 'Solar', regex: /\bsolar\b/i },
  { category: 'Smart Home', regex: /\b(security|smart home|t-mobile|network|wireless)\b/i },
  { category: 'Garage', regex: /\bgarage\b/i },
  { category: 'Interior Design', regex: /\b(interior|design|decor|backdrop)\b/i },
  { category: 'Furniture', regex: /\b(mattress|sleep|furniture)\b/i },
  { category: 'Kitchen', regex: /\b(kitchen|cutco|food services)\b/i },
  { category: 'Concrete', regex: /\b(concrete|excavat)\b/i },
  { category: 'Insulation', regex: /\b(insulation|crawlspace|structural|stable dry)\b/i },
  { category: 'Remodeling', regex: /\b(remodel|renovat)\b/i },
  { category: 'General Contractor', regex: /\b(contractor|construction|builder|development|home place|log cabins?)\b/i },
  { category: 'Outdoor Living', regex: /\b(outdoor|cart)\b/i }
];

function usage() {
  return [
    'Usage:',
    '  node scripts/normalize-vendor-categories.mjs [options]',
    '',
    'Options:',
    '  --execute            Write category updates to Firestore (default: dry-run)',
    '  --output-dir <path>  Report directory (default: current working directory)'
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

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value) {
  return normalizeLower(value);
}

function isUncategorized(value) {
  return UNCATEGORIZED_VALUES.has(normalizeLower(value));
}

function toIso(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return '';
    }
  }
  return '';
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function writeCsv(filePath, rows = [], columns = []) {
  const lines = [columns.join(',')];
  rows.forEach((row) => lines.push(columns.map((col) => csvEscape(row[col])).join(',')));
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function stampNow() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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

function inferCategory(vendor) {
  const rawName = normalizeText(vendor.name || vendor.companyName);
  const name = normalizeLower(rawName);
  const email = normalizeEmail(vendor.contactEmail || vendor.email);
  const website = normalizeLower(vendor.website || vendor.url || '');
  const description = normalizeLower(vendor.description || vendor.bio || '');
  const haystack = `${name} ${email} ${website} ${description}`.trim();

  if (email && EMAIL_OVERRIDES.has(email)) {
    return { category: EMAIL_OVERRIDES.get(email), reason: 'email-override' };
  }
  if (name && NAME_OVERRIDES.has(name)) {
    return { category: NAME_OVERRIDES.get(name), reason: 'name-override' };
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.regex.test(haystack)) {
      return { category: rule.category, reason: `keyword:${rule.regex.source}` };
    }
  }

  return { category: FALLBACK_CATEGORY, reason: 'fallback' };
}

function mapVendor(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    ref: docSnap.ref,
    name: normalizeText(data.name || data.companyName),
    email: normalizeEmail(data.contactEmail || data.email),
    showId: normalizeText(data.showId),
    category: normalizeText(data.category),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    data
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await ensureFirebaseAdmin();
  const db = admin.firestore();

  const allSnap = await db.collection('vendors').get();
  const allVendors = allSnap.docs.map(mapVendor);

  const uncategorized = allVendors.filter((vendor) => isUncategorized(vendor.category));
  const updates = uncategorized.map((vendor) => {
    const inferred = inferCategory(vendor);
    return {
      vendor,
      oldCategory: vendor.category || '',
      newCategory: inferred.category,
      reason: inferred.reason
    };
  });

  const outputDir = path.resolve(args.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const stamp = stampNow();
  const mode = args.execute ? 'execute' : 'dry-run';
  const base = `vendor-category-normalization-${mode}-${stamp}`;
  const jsonPath = path.join(outputDir, `${base}.json`);
  const csvPath = path.join(outputDir, `${base}.csv`);

  const summaryByCategory = {};
  const summaryByReason = {};
  updates.forEach((item) => {
    summaryByCategory[item.newCategory] = (summaryByCategory[item.newCategory] || 0) + 1;
    summaryByReason[item.reason] = (summaryByReason[item.reason] || 0) + 1;
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    mode,
    totalVendorDocs: allVendors.length,
    uncategorizedCount: uncategorized.length,
    updatesCount: updates.length,
    summaryByCategory,
    summaryByReason,
    updates: updates.map((item) => ({
      id: item.vendor.id,
      name: item.vendor.name,
      email: item.vendor.email,
      showId: item.vendor.showId,
      oldCategory: item.oldCategory,
      newCategory: item.newCategory,
      reason: item.reason,
      createdAt: toIso(item.vendor.createdAt),
      updatedAt: toIso(item.vendor.updatedAt)
    }))
  };
  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  await writeCsv(
    csvPath,
    payload.updates,
    ['id', 'name', 'email', 'showId', 'oldCategory', 'newCategory', 'reason', 'createdAt', 'updatedAt']
  );

  console.log('\nVendor category normalization');
  console.log(`- Mode: ${mode}`);
  console.log(`- Total vendor docs: ${allVendors.length}`);
  console.log(`- Uncategorized docs: ${uncategorized.length}`);
  console.log(`- Updates planned: ${updates.length}`);
  console.log(`- Report JSON: ${jsonPath}`);
  console.log(`- Report CSV: ${csvPath}`);

  Object.entries(summaryByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  * ${category}: ${count}`);
    });

  if (!args.execute) {
    console.log('\nDry-run only. Re-run with --execute to write updates.');
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let committed = 0;

  const commitBatch = async () => {
    if (!batchCount) return;
    await batch.commit();
    committed += batchCount;
    batch = db.batch();
    batchCount = 0;
  };

  for (const item of updates) {
    batch.update(item.vendor.ref, {
      category: item.newCategory,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batchCount += 1;

    if (batchCount >= 450) {
      await commitBatch();
    }
  }
  await commitBatch();

  console.log('\nCategory updates complete');
  console.log(`- Documents updated: ${committed}`);
}

main().catch((error) => {
  console.error('normalize-vendor-categories failed:', error?.message || error);
  process.exit(1);
});
