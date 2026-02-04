const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { invoiceId } = JSON.parse(event.body || '{}');

    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: invoiceId' }),
      };
    }

    // Retrieve first so we can return a helpful status
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Stripe only supports hard-deleting invoices while they are in draft.
    if (invoice.status === 'draft') {
      const deleted = await stripe.invoices.del(invoiceId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          invoiceId,
          status: 'deleted',
          deleted: !!deleted?.deleted,
          action: 'delete'
        }),
      };
    }

    // If already void/uncollectible/paid, no-op (but return success so UI can clean up)
    if (invoice.status === 'void' || invoice.status === 'uncollectible') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, invoiceId, status: invoice.status, message: 'Invoice already non-payable' }),
      };
    }

    if (invoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice is already paid and cannot be voided.', status: invoice.status }),
      };
    }

    // Stripe supports voiding open/unpaid invoices
    const voided = await stripe.invoices.voidInvoice(invoiceId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoiceId: voided.id,
        status: voided.status,
        action: 'void'
      }),
    };
  } catch (error) {
    console.error('Error voiding invoice:', error);

    if (error?.type === 'StripeInvalidRequestError') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to void invoice' }),
    };
  }
};
