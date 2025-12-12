/**
 * Stripe Webhook Handler
 * Handles Stripe events for payment completion, failures, and refunds
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook endpoint signing secret
 * - FIREBASE_SERVICE_ACCOUNT: JSON stringified Firebase service account (for Firestore updates)
 * - SENDGRID_API_KEY: For sending payment notification emails
 * - ADMIN_EMAILS: Comma-separated list of admin email addresses
 * 
 * Webhook Events to Configure in Stripe Dashboard:
 * - checkout.session.completed
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - invoice.paid
 * - invoice.payment_failed
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

// Initialize Firebase Admin SDK for Firestore updates
let admin = null;
let db = null;

async function initFirebase() {
  if (db) return db;
  
  try {
    const adminModule = await import('firebase-admin');
    admin = adminModule.default;
    
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
      
      if (serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Fallback: try default credentials (for local development)
        admin.initializeApp();
      }
    }
    
    db = admin.firestore();
    return db;
  } catch (error) {
    console.warn('Firebase initialization skipped:', error.message);
    return null;
  }
}

// Update vendor payment status in Firestore
async function updateVendorPaymentStatus(vendorId, status, paymentData = {}) {
  try {
    const firestore = await initFirebase();
    if (!firestore) {
      console.log('Firestore not available, skipping update');
      return false;
    }
    
    const vendorRef = firestore.collection('vendors').doc(vendorId);
    await vendorRef.update({
      paymentStatus: status,
      paymentDate: admin.firestore.FieldValue.serverTimestamp(),
      stripePaymentId: paymentData.paymentIntentId || null,
      stripeSessionId: paymentData.sessionId || null,
      amountPaid: paymentData.amount || 0,
      lastPaymentUpdate: new Date().toISOString(),
      ...paymentData.metadata
    });
    
    console.log(`Updated vendor ${vendorId} payment status to ${status}`);
    return true;
  } catch (error) {
    console.error('Failed to update vendor payment status:', error);
    return false;
  }
}

// Create payment record in Firestore
async function createPaymentRecord(data) {
  try {
    const firestore = await initFirebase();
    if (!firestore) return null;
    
    const paymentRef = firestore.collection('payments').doc();
    await paymentRef.set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return paymentRef.id;
  } catch (error) {
    console.error('Failed to create payment record:', error);
    return null;
  }
}

// Send payment notification emails
async function sendPaymentNotificationEmails(paymentData) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log('SENDGRID_API_KEY not set, skipping payment emails');
    return;
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@tn-shows.app';
  const appName = process.env.APP_NAME || 'Winn-Pro Show';
  const appUrl = process.env.APP_URL || 'https://tn-shows.app';
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

  try {
    // 1. Send confirmation email to vendor
    if (paymentData.vendorEmail) {
      console.log(`Sending payment confirmation to vendor: ${paymentData.vendorEmail}`);
      
      const vendorResponse = await fetch(`${appUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: paymentData.vendorEmail,
          template: 'paymentConfirmation',
          data: {
            businessName: paymentData.vendorName || 'Vendor',
            transactionId: paymentData.transactionId,
            packageName: paymentData.boothType || 'Vendor Booth',
            boothSize: paymentData.boothType || 'Standard',
            amount: paymentData.amount?.toFixed(2) || '0.00'
          }
        })
      });

      if (vendorResponse.ok) {
        console.log('✓ Vendor payment confirmation email sent');
      } else {
        console.error('Failed to send vendor email:', await vendorResponse.text());
      }
    }

    // 2. Send notification emails to admins
    if (adminEmails.length > 0) {
      console.log(`Sending payment notification to ${adminEmails.length} admin(s)`);
      
      for (const adminEmail of adminEmails) {
        const adminResponse = await fetch(`${appUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminEmail,
            template: 'adminPaymentNotification',
            data: {
              businessName: paymentData.vendorName || 'Unknown Vendor',
              vendorEmail: paymentData.vendorEmail || 'N/A',
              transactionId: paymentData.transactionId,
              packageName: paymentData.boothType || 'Vendor Booth',
              boothType: paymentData.boothType || 'Standard',
              amount: paymentData.amount?.toFixed(2) || '0.00'
            }
          })
        });

        if (adminResponse.ok) {
          console.log(`✓ Admin notification sent to ${adminEmail}`);
        } else {
          console.error(`Failed to send admin email to ${adminEmail}:`, await adminResponse.text());
        }
      }
    } else {
      console.log('No admin emails configured, skipping admin notification');
    }
  } catch (error) {
    console.error('Error sending payment notification emails:', error);
    // Don't throw - email failures shouldn't fail the webhook
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature if secret is configured
    if (webhookSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    } else {
      // For development/testing without signature verification
      stripeEvent = JSON.parse(event.body);
      console.warn('Webhook signature verification skipped');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        console.log('Checkout session completed:', session.id);
        
        const vendorId = session.metadata?.vendorId;
        if (vendorId) {
          await updateVendorPaymentStatus(vendorId, 'paid', {
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total / 100,
            metadata: {
              boothType: session.metadata?.boothType,
              paidAt: new Date().toISOString()
            }
          });
          
          await createPaymentRecord({
            vendorId,
            vendorEmail: session.metadata?.vendorEmail,
            vendorName: session.metadata?.vendorName,
            type: 'booth_payment',
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'completed',
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            boothType: session.metadata?.boothType,
            source: 'stripe_checkout'
          });

          // Send payment notification emails
          await sendPaymentNotificationEmails({
            vendorId,
            vendorEmail: session.metadata?.vendorEmail,
            vendorName: session.metadata?.vendorName,
            amount: session.amount_total / 100,
            boothType: session.metadata?.boothType,
            transactionId: session.payment_intent || session.id
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        
        const vendorId = paymentIntent.metadata?.vendorId;
        if (vendorId) {
          await updateVendorPaymentStatus(vendorId, 'paid', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object;
        console.log('Payment intent failed:', paymentIntent.id);
        
        const vendorId = paymentIntent.metadata?.vendorId;
        if (vendorId) {
          await updateVendorPaymentStatus(vendorId, 'failed', {
            paymentIntentId: paymentIntent.id,
            metadata: {
              failureReason: paymentIntent.last_payment_error?.message || 'Unknown error'
            }
          });
          
          await createPaymentRecord({
            vendorId,
            type: 'booth_payment',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: 'failed',
            stripePaymentIntentId: paymentIntent.id,
            failureReason: paymentIntent.last_payment_error?.message,
            source: 'stripe_payment_intent'
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = stripeEvent.data.object;
        console.log('Invoice paid:', invoice.id);
        
        const vendorId = invoice.metadata?.vendorId;
        if (vendorId) {
          await updateVendorPaymentStatus(vendorId, 'paid', {
            amount: invoice.amount_paid / 100,
            metadata: {
              stripeInvoiceId: invoice.id,
              invoicePaidAt: new Date().toISOString()
            }
          });
          
          await createPaymentRecord({
            vendorId,
            vendorEmail: invoice.customer_email,
            vendorName: invoice.metadata?.vendorName,
            type: 'invoice_payment',
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            status: 'completed',
            stripeInvoiceId: invoice.id,
            source: 'stripe_invoice'
          });

          // Send payment notification emails
          await sendPaymentNotificationEmails({
            vendorId,
            vendorEmail: invoice.customer_email,
            vendorName: invoice.metadata?.vendorName,
            amount: invoice.amount_paid / 100,
            boothType: invoice.metadata?.boothType,
            transactionId: invoice.id
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        console.log('Invoice payment failed:', invoice.id);
        
        const vendorId = invoice.metadata?.vendorId;
        if (vendorId) {
          await updateVendorPaymentStatus(vendorId, 'payment_failed', {
            metadata: {
              stripeInvoiceId: invoice.id,
              failedAt: new Date().toISOString()
            }
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object;
        console.log('Charge refunded:', charge.id);
        
        // Handle refunds if needed
        const paymentIntent = charge.payment_intent;
        if (paymentIntent) {
          const pi = await stripe.paymentIntents.retrieve(paymentIntent);
          const vendorId = pi.metadata?.vendorId;
          
          if (vendorId) {
            await updateVendorPaymentStatus(vendorId, 'refunded', {
              metadata: {
                refundedAt: new Date().toISOString(),
                refundAmount: charge.amount_refunded / 100
              }
            });
            
            await createPaymentRecord({
              vendorId,
              type: 'refund',
              amount: charge.amount_refunded / 100,
              currency: charge.currency,
              status: 'refunded',
              stripeChargeId: charge.id,
              source: 'stripe_refund'
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};
