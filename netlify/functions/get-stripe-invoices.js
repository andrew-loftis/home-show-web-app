/**
 * Get Stripe Invoices
 * Fetches invoice data from Stripe for admin dashboard
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - FIREBASE_SERVICE_ACCOUNT: JSON Firebase service account (for auth verification)
 */

const { verifyAdmin, verifyAuth, getAdmin } = require('./utils/verify-admin');
const { getStripeContext } = require('./utils/stripe-context');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Require admin authentication — this endpoint exposes financial data
  try {
    const auth = await verifyAuth(event);
    if (auth.error) {
      return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
    }

    const { action, invoiceId, vendorEmail, vendorId, limit: rawLimit = 100, showId = '' } = JSON.parse(event.body || '{}');
    let { stripe, requestOptions, showId: resolvedShowId } = await getStripeContext({
      showId: showId || '',
      vendorId: vendorId || '',
      vendorShowId: '',
      fallbackShowId: ''
    });
    const normalizedEmail = String(vendorEmail || '').trim().toLowerCase();

    // Cap limit to prevent abuse
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 10, 1), 100);

    // Action: Get single invoice status
    if (action === 'getInvoice' && invoiceId) {
      const adminCheck = await verifyAdmin(event);
      if (adminCheck.error) {
        return { statusCode: adminCheck.status, headers, body: JSON.stringify({ error: adminCheck.error }) };
      }
      const invoice = await stripe.invoices.retrieve(invoiceId, requestOptions);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          invoice: {
            id: invoice.id,
            status: invoice.status,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            amount_remaining: invoice.amount_remaining,
            currency: invoice.currency,
            customer_email: invoice.customer_email,
            hosted_invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            created: invoice.created,
            due_date: invoice.due_date,
            paid: invoice.paid,
            metadata: invoice.metadata
          }
        })
      };
    }

    // Action: Get invoices for a specific customer email
    if (action === 'getCustomerInvoices') {
      let emailToUse = normalizedEmail;

      if (vendorId) {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const vendorDoc = await db.collection('vendors').doc(String(vendorId)).get();
        if (!vendorDoc.exists) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vendor not found' }) };
        }
        const vendor = vendorDoc.data() || {};
        const resolvedShowIdFromVendor = String(vendor.showId || '').trim();
        if (resolvedShowIdFromVendor && resolvedShowIdFromVendor !== resolvedShowId) {
          // Keep returned metadata aligned with the vendor's current show assignment.
          const route = await getStripeContext({
            showId: resolvedShowIdFromVendor,
            vendorId: vendorId || '',
            vendorShowId: ''
          });
          stripe = route.stripe;
          requestOptions = route.requestOptions;
          resolvedShowId = route.showId || resolvedShowIdFromVendor;
        }
        const ownerUid = vendor.ownerUid || null;
        const vendorContactEmail = String(vendor.contactEmail || '').trim().toLowerCase();
        emailToUse = vendorContactEmail || emailToUse;

        if (ownerUid !== auth.uid) {
          const adminCheck = await verifyAdmin(event);
          if (adminCheck.error) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized for vendor invoices' }) };
          }
        }
      } else if (emailToUse && emailToUse !== auth.email) {
        const adminCheck = await verifyAdmin(event);
        if (adminCheck.error) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized for vendor invoices' }) };
        }
      }

      if (!emailToUse) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Vendor email required' }) };
      }

      const customers = await stripe.customers.list({
        email: emailToUse,
        limit: 1
      }, requestOptions);

      if (customers.data.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, invoices: [] })
        };
      }

      const customer = customers.data[0];
      const invoices = await stripe.invoices.list({
        customer: customer.id,
        limit: limit
      }, requestOptions);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          customer: {
            id: customer.id,
            email: customer.email,
            name: customer.name
          },
          invoices: invoices.data.map(inv => ({
            id: inv.id,
            status: inv.status,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            amount_remaining: inv.amount_remaining,
            currency: inv.currency,
            hosted_invoice_url: inv.hosted_invoice_url,
            created: inv.created,
            due_date: inv.due_date,
            paid: inv.paid,
            description: inv.description,
            metadata: inv.metadata
          }))
        })
      };
    }

    // Action: Get all recent invoices (for admin dashboard)
    if (action === 'listAll') {
      const adminCheck = await verifyAdmin(event);
      if (adminCheck.error) {
        return { statusCode: adminCheck.status, headers, body: JSON.stringify({ error: adminCheck.error }) };
      }
      const invoices = await stripe.invoices.list({
        limit: limit,
        expand: ['data.customer']
      }, requestOptions);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          invoices: invoices.data.map(inv => ({
            id: inv.id,
            status: inv.status,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            amount_remaining: inv.amount_remaining,
            currency: inv.currency,
            customer_email: inv.customer?.email || inv.customer_email,
            customer_name: inv.customer?.name || null,
            hosted_invoice_url: inv.hosted_invoice_url,
            created: inv.created,
            due_date: inv.due_date,
            paid: inv.paid,
            description: inv.description,
            metadata: inv.metadata
          })),
          has_more: invoices.has_more
        })
      };
    }

    // Action: Get payment intents (for checkout payments)
    if (action === 'listPayments') {
      const adminCheck = await verifyAdmin(event);
      if (adminCheck.error) {
        return { statusCode: adminCheck.status, headers, body: JSON.stringify({ error: adminCheck.error }) };
      }
      const paymentIntents = await stripe.paymentIntents.list({
        limit: limit
      }, requestOptions);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          payments: paymentIntents.data.map(pi => ({
            id: pi.id,
            status: pi.status,
            amount: pi.amount,
            amount_received: pi.amount_received,
            currency: pi.currency,
            customer: pi.customer,
            description: pi.description,
            created: pi.created,
            metadata: pi.metadata
          })),
          has_more: paymentIntents.has_more
        })
      };
    }

    // Action: Get balance/summary
    if (action === 'getBalance') {
      const adminCheck = await verifyAdmin(event);
      if (adminCheck.error) {
        return { statusCode: adminCheck.status, headers, body: JSON.stringify({ error: adminCheck.error }) };
      }
      const balance = await stripe.balance.retrieve({}, requestOptions);

      const charges = await stripe.charges.list({ limit: 10 }, requestOptions);

      const recentRevenue = charges.data
        .filter(c => c.status === 'succeeded')
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          balance: {
            available: balance.available,
            pending: balance.pending
          },
          recentRevenue: recentRevenue / 100,
          recentChargesCount: charges.data.filter(c => c.status === 'succeeded').length
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action. Use: getInvoice, getCustomerInvoices, listAll, listPayments, or getBalance'
      })
    };

  } catch (error) {
    console.error('Stripe API error:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch Stripe data' })
    };
  }
};
