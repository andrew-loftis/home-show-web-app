const { getAdmin } = require('./verify-admin');

const ADMIN_COLLECTION_IDS = ['adminEmails', 'admin-users', 'admin_users'];
const ADMIN_NOTIFICATION_ENV_KEYS = ['ADMIN_EMAILS', 'ADMIN_EMAIL', 'ADMIN_EMAIL_LIST'];

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
}

function parseAdminNotificationEmails() {
  const raw = ADMIN_NOTIFICATION_ENV_KEYS
    .map((key) => String(process.env[key] || ''))
    .filter(Boolean)
    .join(',');

  return raw
    .split(/[\s,;]+/)
    .map((value) => normalizeEmail(value))
    .filter(isValidEmail);
}

async function collectAdminEmails(options = {}) {
  const emails = new Set(parseAdminNotificationEmails());
  let db = options.db || null;

  if (!db) {
    try {
      db = getAdmin().firestore();
    } catch {
      db = null;
    }
  }

  if (db) {
    for (const coll of ADMIN_COLLECTION_IDS) {
      try {
        const snap = await db.collection(coll).limit(300).get();
        snap.forEach((docSnap) => {
          const idEmail = normalizeEmail(docSnap.id);
          if (isValidEmail(idEmail)) emails.add(idEmail);

          const rowEmail = normalizeEmail(docSnap.data()?.email);
          if (isValidEmail(rowEmail)) emails.add(rowEmail);
        });
      } catch {}
    }
  }

  return Array.from(emails).sort();
}

module.exports = {
  collectAdminEmails,
};
