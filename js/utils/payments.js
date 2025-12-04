/**
 * Stripe Payment Client
 * Frontend utility for Stripe checkout integration
 */

// Booth pricing display
export const BOOTH_TYPES = {
  standard: {
    name: 'Standard Booth',
    price: 500,
    size: '10x10',
    description: 'Standard booth space with basic setup'
  },
  premium: {
    name: 'Premium Booth',
    price: 850,
    size: '10x15',
    description: 'Premium corner booth with extra visibility'
  },
  double: {
    name: 'Double Booth',
    price: 950,
    size: '10x20',
    description: 'Double-wide booth for larger displays'
  },
  island: {
    name: 'Island Booth',
    price: 1500,
    size: '20x20',
    description: '4-sided island booth for maximum exposure'
  }
};

/**
 * Create a Stripe checkout session and redirect to payment
 * @param {object} options - Checkout options
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function createCheckoutSession(options) {
  const {
    vendorId,
    vendorEmail,
    vendorName,
    boothType = 'standard'
  } = options;

  try {
    const response = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vendorId,
        vendorEmail,
        vendorName,
        boothType
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create checkout session');
    }

    return {
      success: true,
      sessionId: result.sessionId,
      url: result.url,
      amount: result.amount
    };
  } catch (error) {
    console.error('Checkout session error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Redirect to Stripe Checkout
 * @param {object} options - Same as createCheckoutSession
 */
export async function redirectToCheckout(options) {
  const result = await createCheckoutSession(options);
  
  if (result.success && result.url) {
    window.location.href = result.url;
    return true;
  }
  
  throw new Error(result.error || 'Failed to create checkout session');
}

/**
 * Create a Stripe invoice (for admin-initiated payments)
 * @param {object} options - Invoice options
 */
export async function createInvoice(options) {
  const {
    vendorId,
    vendorEmail,
    vendorName,
    amount, // in dollars
    description,
    paymentType = 'booth_rental'
  } = options;

  try {
    const response = await fetch('/.netlify/functions/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerEmail: vendorEmail,
        amount: Math.round(amount * 100), // Convert to cents
        description,
        paymentType,
        vendorName,
        vendorId
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create invoice');
    }

    return {
      success: true,
      invoiceId: result.invoiceId,
      invoiceUrl: result.invoiceUrl,
      amount: result.amount
    };
  } catch (error) {
    console.error('Invoice creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check payment status from URL params after redirect
 * Call this on vendor dashboard load
 */
export function checkPaymentStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const payment = urlParams.get('payment');
  const sessionId = urlParams.get('session_id');

  if (payment === 'success') {
    // Clean up URL
    const cleanUrl = window.location.pathname + window.location.hash.split('?')[0];
    window.history.replaceState({}, '', cleanUrl);
    
    return {
      status: 'success',
      sessionId,
      message: 'Payment completed successfully!'
    };
  }
  
  if (payment === 'cancelled') {
    const cleanUrl = window.location.pathname + window.location.hash.split('?')[0];
    window.history.replaceState({}, '', cleanUrl);
    
    return {
      status: 'cancelled',
      message: 'Payment was cancelled.'
    };
  }

  return null;
}

/**
 * Render booth selection UI
 * @param {string} selectedType - Currently selected booth type
 * @param {function} onSelect - Callback when booth is selected
 */
export function renderBoothSelector(selectedType = 'standard', onSelect) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${Object.entries(BOOTH_TYPES).map(([type, booth]) => `
        <div 
          class="p-4 rounded-lg border-2 cursor-pointer transition-all ${
            type === selectedType 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-white/20 hover:border-white/40'
          }"
          data-booth-type="${type}"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-semibold text-white">${booth.name}</h4>
              <p class="text-sm text-gray-400">${booth.size}</p>
            </div>
            <div class="text-xl font-bold text-green-400">$${booth.price}</div>
          </div>
          <p class="text-sm text-gray-300">${booth.description}</p>
          ${type === selectedType ? `
            <div class="mt-2 flex items-center text-blue-400 text-sm">
              <ion-icon name="checkmark-circle" class="mr-1"></ion-icon>
              Selected
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render payment status badge
 * @param {string} status - Payment status
 */
export function renderPaymentBadge(status) {
  const badges = {
    paid: { text: 'Paid', class: 'bg-green-600' },
    pending: { text: 'Pending', class: 'bg-yellow-600' },
    failed: { text: 'Failed', class: 'bg-red-600' },
    refunded: { text: 'Refunded', class: 'bg-gray-600' },
    payment_failed: { text: 'Payment Failed', class: 'bg-red-600' }
  };

  const badge = badges[status] || { text: status || 'Unknown', class: 'bg-gray-600' };
  
  return `<span class="px-2 py-1 rounded text-xs font-medium text-white ${badge.class}">${badge.text}</span>`;
}
