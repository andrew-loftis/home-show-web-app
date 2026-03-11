/**
 * Ensure Admin Netlify Function
 * Allows pre-approved emails to bootstrap admin access in Firestore.
 *
 * Requires:
 * - FIREBASE_SERVICE_ACCOUNT (or default credentials)
 * - ADMIN_EMAILS (comma-separated allowlist)
 */

const { verifyAuth, getAdmin, hasAdminRegistryMatch } = require('./utils/verify-admin');
const ADMIN_COLLECTION_IDS = ['adminEmails', 'admin-users', 'admin_users'];

function parseAdminEmails() {
  const raw = [
    process.env.ADMIN_EMAILS || '',
    process.env.ADMIN_EMAIL || '',
    process.env.ADMIN_EMAIL_LIST || ''
  ].filter(Boolean).join(',');

  return raw
    .split(/[\s,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error) {
    return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  }

  const allowed = parseAdminEmails();
  const tokenEmailRaw = String(auth.emailRaw || auth.email || '').trim();
  const tokenEmailLower = tokenEmailRaw.toLowerCase();
  if (!tokenEmailLower) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Missing email claim' }) };
  }

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    // Accept either:
    // 1) explicit Netlify allowlist env, OR
    // 2) an existing admin entry in any supported collection (legacy migration path).
    let isAllowed = allowed.includes(tokenEmailLower);
    if (!isAllowed) {
      isAllowed = await hasAdminRegistryMatch(db, tokenEmailRaw, auth.uid);
    }

    if (!isAllowed) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized for admin bootstrap' }) };
    }

    // Write both canonical lowercase and exact-case IDs so Firestore/Storage rules that
    // evaluate token email case still resolve admin status.
    const docIds = Array.from(new Set([tokenEmailLower, tokenEmailRaw].filter(Boolean)));

    await Promise.all(
      ADMIN_COLLECTION_IDS.flatMap((coll) =>
        docIds.map((docId) => (
          db.collection(coll).doc(docId).set({
            email: tokenEmailLower,
            emailRaw: tokenEmailRaw || tokenEmailLower,
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            addedBy: 'bootstrap'
          }, { merge: true })
        ))
      )
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email: tokenEmailLower,
        emailRaw: tokenEmailRaw,
        docIds
      })
    };
  } catch (error) {
    console.error('Ensure admin failed:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to ensure admin' }) };
  }
};
