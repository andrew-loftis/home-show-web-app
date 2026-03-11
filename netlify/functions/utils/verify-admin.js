/**
 * Shared Firebase Admin auth verification for Netlify functions.
 * Verifies a Firebase ID token and checks admin status.
 *
 * Usage in a function:
 *   const { verifyAdmin } = require('./utils/verify-admin');
 *   const auth = await verifyAdmin(event);
 *   if (auth.error) return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
 *   // auth.uid and auth.email are available
 */

let admin = null;
const ADMIN_COLLECTION_IDS = ['adminEmails', 'admin-users', 'admin_users'];
const ADMIN_ALLOWLIST_ENV_KEYS = ['ADMIN_EMAILS', 'ADMIN_EMAIL', 'ADMIN_EMAIL_LIST'];

function normalizePrivateKey(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';

  // Remove accidental wrapping quotes from env editors.
  raw = raw.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
  // Convert escaped newlines to actual newlines.
  raw = raw.replace(/\\n/g, '\n');

  const match = raw.match(/-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----/s);
  if (!match) return raw;

  const type = match[1];
  const body = String(match[2] || '').replace(/[\r\n\t ]+/g, '');
  if (!body) return raw;

  // Re-wrap key body to standard 64-char PEM lines.
  const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----\n`;
}

function parseAdminAllowlist() {
  const raw = ADMIN_ALLOWLIST_ENV_KEYS
    .map((key) => String(process.env[key] || ''))
    .filter(Boolean)
    .join(',');

  return raw
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlistedAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return parseAdminAllowlist().includes(normalized);
}

function getAdmin() {
  if (admin) return admin;
  const adminModule = require('firebase-admin');
  if (!adminModule.apps.length) {
    let credential = null;
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountRaw) {
      try {
        const serviceAccount = JSON.parse(serviceAccountRaw);
        if (serviceAccount && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
        }
        if (serviceAccount.project_id) {
          credential = adminModule.credential.cert(serviceAccount);
        }
      } catch (error) {
        console.warn('Invalid FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
      }
    }

    if (!credential && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const normalizedPrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      credential = adminModule.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizedPrivateKey
      });
    }

    if (credential) {
      adminModule.initializeApp({ credential });
    } else {
      adminModule.initializeApp();
    }
  }
  admin = adminModule;
  return admin;
}

async function hasAdminRegistryMatch(db, email, uid = '') {
  const rawEmail = String(email || '').trim();
  const normalizedEmail = rawEmail.toLowerCase();
  const emailVariants = Array.from(new Set([normalizedEmail, rawEmail].filter(Boolean)));
  const normalizedUid = String(uid || '').trim();
  if (!emailVariants.length) return false;

  for (const coll of ADMIN_COLLECTION_IDS) {
    for (const variant of emailVariants) {
      try {
        const direct = await db.collection(coll).doc(variant).get();
        if (direct.exists) return true;
      } catch {}
    }

    for (const variant of emailVariants) {
      try {
        const byEmail = await db.collection(coll).where('email', '==', variant).limit(1).get();
        if (!byEmail.empty) return true;
      } catch {}
    }

    if (normalizedUid) {
      try {
        const byUid = await db.collection(coll).where('uid', '==', normalizedUid).limit(1).get();
        if (!byUid.empty) return true;
      } catch {}
    }
  }

  return false;
}

/**
 * Verify that the request comes from an authenticated admin user.
 * Expects Authorization: Bearer <firebase-id-token> header.
 * Returns { uid, email } on success or { error, status } on failure.
 */
async function verifyAdmin(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: 'Missing Authorization header', status: 401 };
  }

  try {
    const adminSdk = getAdmin();
    const decoded = await adminSdk.auth().verifyIdToken(token);
    const emailRaw = String(decoded.email || '').trim();
    const email = emailRaw.toLowerCase();

    if (!email) {
      return { error: 'Token has no email claim', status: 403 };
    }

    let isAdmin = isAllowlistedAdminEmail(emailRaw);
    if (!isAdmin) {
      const db = adminSdk.firestore();
      isAdmin = await hasAdminRegistryMatch(db, email, decoded.uid);
    }

    if (!isAdmin) {
      return { error: 'Not authorized - admin access required', status: 403 };
    }

    return { uid: decoded.uid, email, emailRaw };
  } catch (err) {
    console.error('Auth verification failed:', err.message);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

/**
 * Lightweight version: just verify the user is signed in (any role).
 * Returns { uid, email } on success or { error, status } on failure.
 */
async function verifyAuth(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: 'Missing Authorization header', status: 401 };
  }

  try {
    const adminSdk = getAdmin();
    const decoded = await adminSdk.auth().verifyIdToken(token);
    const emailRaw = String(decoded.email || '').trim();
    return { uid: decoded.uid, email: emailRaw.toLowerCase(), emailRaw };
  } catch (err) {
    console.error('Auth verification failed:', err.message);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

module.exports = { verifyAdmin, verifyAuth, getAdmin, hasAdminRegistryMatch };
