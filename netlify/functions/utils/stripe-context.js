/**
 * Stripe context resolver.
 *
 * Production is intentionally pinned to the two global Netlify env vars only:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 *
 * Show-level, account-level, and Firestore-based Stripe overrides are ignored.
 */

const { getAdmin } = require('./verify-admin');

const MASTER_STRIPE_KEY = String(process.env.STRIPE_SECRET_KEY || '').trim();
const MASTER_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();

async function getVendorData(vendorId) {
  if (!vendorId) return null;

  try {
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collection('vendors').doc(String(vendorId)).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() || {}) };
  } catch (error) {
    console.warn('Failed to load vendor for Stripe context:', error.message);
    return null;
  }
}

function getWebhookSecretForAccount() {
  return MASTER_WEBHOOK_SECRET;
}

/**
 * Resolve a Stripe context for a request.
 *
 * Stripe is always initialized from STRIPE_SECRET_KEY only.
 * requestOptions is intentionally empty so no connected-account override is applied.
 *
 * @param {Object} options
 * @param {string} [options.showId]
 * @param {string} [options.vendorId]
 * @param {string} [options.vendorShowId]
 * @param {string} [options.fallbackShowId]
 * @returns {Promise<{stripe:any, requestOptions:Object, showConfig:Object, showId:string}>}
 */
async function getStripeContext(options = {}) {
  if (!MASTER_STRIPE_KEY) {
    throw new Error('Stripe secret key is not configured. Set STRIPE_SECRET_KEY in Netlify.');
  }

  const requestShowId = String(options.showId || '').trim();
  const fallbackShowId = String(options.fallbackShowId || '').trim();
  const vendorId = String(options.vendorId || '').trim();
  const vendorShowId = String(options.vendorShowId || '').trim();

  let vendorData = null;
  if (vendorId) {
    vendorData = await getVendorData(vendorId);
  }

  const resolvedShowId =
    requestShowId ||
    vendorShowId ||
    String(vendorData?.showId || '').trim() ||
    fallbackShowId ||
    '';

  return {
    stripe: require('stripe')(MASTER_STRIPE_KEY),
    requestOptions: {},
    showConfig: {},
    showId: resolvedShowId,
    vendor: vendorData || null,
    accountId: ''
  };
}

module.exports = {
  getStripeContext,
  getWebhookSecretForAccount,
};

