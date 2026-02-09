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

function getAdmin() {
  if (admin) return admin;
  const adminModule = require('firebase-admin');
  if (!adminModule.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.project_id) {
      adminModule.initializeApp({ credential: adminModule.credential.cert(serviceAccount) });
    } else {
      adminModule.initializeApp();
    }
  }
  admin = adminModule;
  return admin;
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
    const email = (decoded.email || '').toLowerCase();

    if (!email) {
      return { error: 'Token has no email claim', status: 403 };
    }

    // Check admin status in Firestore adminEmails collection
    const db = adminSdk.firestore();
    const adminDoc = await db.collection('adminEmails').doc(email).get();
    if (!adminDoc.exists) {
      return { error: 'Not authorized — admin access required', status: 403 };
    }

    return { uid: decoded.uid, email };
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
    return { uid: decoded.uid, email: (decoded.email || '').toLowerCase() };
  } catch (err) {
    console.error('Auth verification failed:', err.message);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

module.exports = { verifyAdmin, verifyAuth, getAdmin };
