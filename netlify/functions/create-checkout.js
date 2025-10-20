// Netlify Function (CommonJS): Create Stripe Checkout Session
// Expects JSON body: { vendorId: string, price: number, name?: string, email?: string }
// Returns: { url, id }
const Stripe = require('stripe');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY');
      return { statusCode: 500, body: 'Stripe not configured' };
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const data = JSON.parse(event.body || '{}');
    const { vendorId, price, name, email } = data;
    if (!vendorId || !price) {
      return { statusCode: 400, body: 'vendorId and price are required' };
    }

    const siteUrl = process.env.URL || process.env.DEPLOY_URL || (event.headers && (event.headers.origin || (event.headers.referer ? new URL(event.headers.referer).origin : ''))) || 'https://scintillating-youtiao-b7581b.netlify.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // In production, use a predefined Price ID instead of passing dollars; this demo uses amount in cents
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: name || 'Home Show Vendor Invoice' },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { vendorId },
      customer_email: email || undefined,
      success_url: `${siteUrl}/#/admin?checkout=success`,
      cancel_url: `${siteUrl}/#/admin?checkout=cancel`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (e) {
    console.error('Create checkout failed', e?.message || e);
    return { statusCode: 500, body: `Failed to create checkout: ${e?.message || 'unknown error'}` };
  }
}
