/**
 * Stripe Checkout Session Creation
 * Creates a Stripe Checkout session for vendor booth payments
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - SITE_URL: Base URL for success/cancel redirects (e.g., https://yoursite.netlify.app)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Booth pricing tiers
const BOOTH_PRICES = {
  'standard': {
    name: 'Standard Booth',
    price: 50000, // $500 in cents
    description: '10x10 Standard Booth Space'
  },
  'premium': {
    name: 'Premium Booth',
    price: 85000, // $850 in cents
    description: '10x15 Premium Corner Booth'
  },
  'double': {
    name: 'Double Booth',
    price: 95000, // $950 in cents
    description: '10x20 Double Booth Space'
  },
  'island': {
    name: 'Island Booth',
    price: 150000, // $1500 in cents
    description: '20x20 Island Booth (4-sided)'
  }
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
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

  try {
    const { 
      vendorId,
      vendorEmail,
      vendorName,
      boothType = 'standard',
      customAmount, // Optional: override price (in cents)
      customDescription // Optional: override description
    } = JSON.parse(event.body);

    if (!vendorId || !vendorEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: vendorId, vendorEmail' })
      };
    }

    // Get booth pricing
    const booth = BOOTH_PRICES[boothType] || BOOTH_PRICES['standard'];
    const amount = customAmount || booth.price;
    const description = customDescription || booth.description;
    const productName = booth.name;

    // Site URL for redirects
    const siteUrl = process.env.SITE_URL || 'https://winnpro-shows.app';

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: vendorEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: vendorEmail,
        name: vendorName || 'Vendor',
        metadata: {
          vendorId,
          source: 'winnpro_app'
        }
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: description,
              metadata: {
                vendorId,
                boothType
              }
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${siteUrl}/#/vendor-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#/vendor-dashboard?payment=cancelled`,
      metadata: {
        vendorId,
        vendorEmail,
        vendorName: vendorName || '',
        boothType,
        source: 'winnpro_checkout'
      },
      payment_intent_data: {
        metadata: {
          vendorId,
          boothType
        }
      },
      // Allow promo codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'required'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        amount: amount / 100
      })
    };

  } catch (error) {
    console.error('Checkout session error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to create checkout session'
      })
    };
  }
};
