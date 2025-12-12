/**
 * Get Stripe Invoices
 * Fetches invoice data from Stripe for admin dashboard
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST to prevent caching and allow body params
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, invoiceId, vendorEmail, limit = 100 } = JSON.parse(event.body || '{}');

    // Action: Get single invoice status
    if (action === 'getInvoice' && invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
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
    if (action === 'getCustomerInvoices' && vendorEmail) {
      // First find the customer
      const customers = await stripe.customers.list({
        email: vendorEmail,
        limit: 1
      });

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
      });

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
      const invoices = await stripe.invoices.list({
        limit: limit,
        expand: ['data.customer']
      });

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
      const paymentIntents = await stripe.paymentIntents.list({
        limit: limit
      });

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
      const balance = await stripe.balance.retrieve();
      
      // Get recent successful charges
      const charges = await stripe.charges.list({
        limit: 10
      });

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
    
    // Check if it's a Stripe error
    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch Stripe data', details: error.message })
    };
  }
};
