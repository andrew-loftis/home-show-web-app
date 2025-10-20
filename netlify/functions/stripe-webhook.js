// Netlify Function (CommonJS): Stripe Webhook
// - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
// - On invoice.payment_succeeded, updates Firestore vendors/{vendorId} with paid status
// Required env vars:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (Admin SDK)
const Stripe = require('stripe');
const admin = require('firebase-admin');

let adminInitialized = false;
function initAdmin() {
  if (adminInitialized) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  // Netlify env may need newlines restored
  if (privateKey && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin env vars');
    throw new Error('Firebase Admin not configured');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  adminInitialized = true;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!process.env.STRIPE_SECRET_KEY || !endpointSecret) {
    console.error('Missing Stripe env vars');
    return { statusCode: 500, body: 'Stripe not configured' };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  // Stripe requires the exact raw body for signature verification. Handle base64 if present.
  const rawBody = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

  try {
    const evt = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    const type = evt.type;

    // Handle successful invoice payment
    if (type === 'invoice.payment_succeeded') {
      const invoice = evt.data.object || {};
      const vendorId = invoice.metadata && invoice.metadata.vendorId;
      if (!vendorId) {
        console.warn('invoice.payment_succeeded without vendorId metadata; invoice', invoice.id);
      } else {
        try {
          initAdmin();
          const db = admin.firestore();
          const vendorRef = db.collection('vendors').doc(vendorId);
          const now = admin.firestore.FieldValue.serverTimestamp();

          const updates = {
            paymentStatus: 'paid',
            paid: true,
            paymentPaidAt: now,
            lastInvoiceId: invoice.id,
            lastInvoiceStatus: invoice.status || 'paid',
            paymentProvider: 'stripe',
          };
          if (invoice.hosted_invoice_url) updates.paymentLink = invoice.hosted_invoice_url;
          if (typeof invoice.amount_paid === 'number') updates.invoicePaidAmount = invoice.amount_paid / 100;

          await vendorRef.set(updates, { merge: true });

          // When paid, mark assigned booths as taken (sold)
          try {
            const vendorSnap = await vendorRef.get();
            const vendor = vendorSnap.exists ? vendorSnap.data() : null;
            if (vendor) {
              const boothIds = Array.isArray(vendor.booths) && vendor.booths.length
                ? vendor.booths
                : (vendor.booth ? [vendor.booth] : []);
              if (boothIds.length) {
                const batch = db.batch();
                boothIds.forEach(bn => {
                  const num = String(bn || '').trim();
                  if (!num) return;
                  // Find booth by number
                  // Note: Firestore Admin SDK supports queries
                  // If multiple matches, update all
                  // We'll execute queries sequentially to keep code simple
                  // (Counts are tiny here.)
                });
                // Execute queries and batch updates
                for (const bn of boothIds) {
                  const num = String(bn || '').trim(); if (!num) continue;
                  const snap = await db.collection('booths').where('number', '==', num).get();
                  snap.forEach(doc => {
                    batch.set(doc.ref, {
                      status: 'sold',
                      vendorId: vendorId,
                      updatedAt: now,
                    }, { merge: true });
                  });
                }
                await batch.commit();
              }
            }
          } catch (boothErr) {
            console.warn('Failed to mark booths taken for vendor', vendorId, boothErr?.message || boothErr);
          }

          // Optional: create a notification for the vendor owner that payment was received
          try {
            const vendorSnap = await vendorRef.get();
            const vendor = vendorSnap.exists ? vendorSnap.data() : null;
            if (vendor && vendor.ownerUid) {
              await db.collection('notifications').add({
                userId: vendor.ownerUid,
                kind: 'payment_received',
                vendorId,
                invoiceId: invoice.id,
                amount: typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : undefined,
                createdAt: now,
                read: false,
              });
            }
          } catch (nErr) {
            console.warn('Notification creation failed (non-fatal):', nErr?.message || nErr);
          }
        } catch (fbErr) {
          console.error('Failed to update Firestore for vendorId', vendorId, fbErr);
          // Still return 200 to acknowledge webhook; retries would duplicate updates.
        }
      }
    }

    // Optionally handle other events to keep state in sync
    if (type === 'invoice.finalized') {
      // Could update paymentStatus: 'sent' here if desired.
    }
    if (type === 'invoice.payment_failed' || type === 'invoice.voided' || type === 'invoice.marked_uncollectible') {
      const invoice = evt.data.object || {};
      const vendorId = invoice.metadata && invoice.metadata.vendorId;
      if (vendorId) {
        try {
          initAdmin();
          const db = admin.firestore();
            const vendorRef = db.collection('vendors').doc(vendorId);
            await vendorRef.set({
            paymentStatus: 'not_paid',
            lastInvoiceId: invoice.id,
            lastInvoiceStatus: invoice.status || (type === 'invoice.payment_failed' ? 'payment_failed' : type.replace('invoice.', '')),
          }, { merge: true });
            // Optionally revert any booths previously marked sold by this vendor back to available
            try {
              const vendorSnap = await vendorRef.get();
              const vendor = vendorSnap.exists ? vendorSnap.data() : null;
              const boothIds = vendor && Array.isArray(vendor.booths) && vendor.booths.length
                ? vendor.booths
                : (vendor && vendor.booth ? [vendor.booth] : []);
              if (boothIds.length) {
                const batch = db.batch();
                for (const bn of boothIds) {
                  const num = String(bn || '').trim(); if (!num) continue;
                  const snap = await db.collection('booths').where('number', '==', num).get();
                  snap.forEach(doc => {
                    // Only clear if currently sold by this vendor
                    const data = doc.data() || {};
                    const shouldClear = (data.status === 'sold' && (data.vendorId === vendorId));
                    if (shouldClear) {
                      batch.set(doc.ref, { status: 'available', vendorId: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                    }
                  });
                }
                await batch.commit();
              }
            } catch (revertErr) {
              console.warn('Failed to revert booths after failed/voided invoice', vendorId, revertErr?.message || revertErr);
            }
        } catch (fbErr) {
          console.error('Failed to update Firestore on failed/voided invoice', vendorId, fbErr);
        }
      }
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Webhook error', err);
    return { statusCode: 400, body: 'Webhook Error' };
  }
}
