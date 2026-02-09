const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { verifyAdmin } = require('./utils/verify-admin');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Require admin authentication
  const auth = await verifyAdmin(event);
  if (auth.error) {
    return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    const { customerEmail, amount, description, paymentType, vendorName, vendorId, showId } = JSON.parse(event.body);

    // Validate required fields
    if (!customerEmail || !amount || !description) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: customerEmail, amount, description' }),
      };
    }

    // Validate amount is a positive integer (cents)
    const parsedAmount = parseInt(amount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100 || parsedAmount > 10000000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be between $1.00 and $100,000.00 (in cents)' }),
      };
    }

    // Normalize email
    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    // Create or get customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: normalizedEmail,
        name: vendorName || 'Vendor',
        metadata: {
          vendorId: vendorId || '',
          showId: showId || '',
          paymentType: paymentType || 'booth_rental',
        },
      });
    }

    // Create invoice with idempotency key to prevent duplicates on retry
    const idempotencyKey = `invoice_${vendorId}_${parsedAmount}_${Date.now()}`;

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      description: description,
      metadata: {
        vendorId: vendorId || '',
        vendorName: vendorName || '',
        showId: showId || '',
        paymentType: paymentType || 'booth_rental',
        createdByAdmin: auth.email,
      },
    }, { idempotencyKey });

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: parsedAmount,
      currency: 'usd',
      description: description,
    });

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Try to send — if this fails, invoice still exists (admin can resend from Stripe dashboard)
    try {
      await stripe.invoices.sendInvoice(invoice.id);
    } catch (sendErr) {
      console.warn('Invoice created and finalized but send failed:', sendErr.message);
      // Don't fail the whole request — invoice exists, admin can resend
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url,
        amount: parsedAmount / 100,
        customerEmail: normalizedEmail,
      }),
    };

  } catch (error) {
    console.error('Error creating invoice:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to create invoice',
      }),
    };
  }
};
