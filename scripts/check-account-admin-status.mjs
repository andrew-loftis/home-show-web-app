#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import admin from 'firebase-admin';

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
    throw new Error('Firebase Admin credentials are missing.');
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

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/check-account-admin-status.mjs <email>');
    process.exit(1);
  }

  await ensureFirebaseAdmin();
  const db = admin.firestore();

  let authUser = null;
  try {
    authUser = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }

  const collections = ['adminEmails', 'admin-users', 'admin_users'];
  const registry = {};
  for (const coll of collections) {
    const lowerSnap = await db.collection(coll).doc(email).get().catch(() => null);
    registry[coll] = {
      hasLowerDoc: !!(lowerSnap && lowerSnap.exists),
      lowerData: lowerSnap?.exists ? lowerSnap.data() : null
    };
  }

  const envAllowlistRaw = [
    resolveEnv('ADMIN_EMAILS'),
    resolveEnv('ADMIN_EMAIL'),
    resolveEnv('ADMIN_EMAIL_LIST')
  ].filter(Boolean).join(',');
  const envAllowlist = envAllowlistRaw
    .split(/[\s,;]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const output = {
    checkedAt: new Date().toISOString(),
    email,
    auth: authUser
      ? {
          uid: authUser.uid,
          disabled: authUser.disabled === true,
          emailVerified: authUser.emailVerified === true,
          creationTime: authUser.metadata?.creationTime || '',
          lastSignInTime: authUser.metadata?.lastSignInTime || '',
          providers: (authUser.providerData || []).map((p) => ({
            providerId: p.providerId,
            email: p.email || '',
            uid: p.uid || ''
          }))
        }
      : null,
    adminRegistry: registry,
    adminEnvAllowlistContainsEmail: envAllowlist.includes(email),
    adminEnvAllowlistCount: envAllowlist.length
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('check-account-admin-status failed:', error?.message || error);
  process.exit(1);
});
