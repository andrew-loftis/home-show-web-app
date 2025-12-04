/**
 * Email Service Client
 * Frontend utility for sending transactional emails via Netlify function
 */

// Use relative URL for Netlify functions (works in dev and production)
const EMAIL_FUNCTION_URL = '/.netlify/functions/send-email';

/**
 * Available email templates
 */
export const EmailTemplates = {
  VENDOR_APPROVED: 'vendorApproved',
  VENDOR_REJECTED: 'vendorRejected',
  NEW_LEAD: 'newLead',
  ATTENDEE_WELCOME: 'attendeeWelcome',
  PAYMENT_CONFIRMATION: 'paymentConfirmation',
  ADMIN_NOTIFICATION: 'adminNotification'
};

/**
 * Send an email using the email function
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} template - Template name from EmailTemplates
 * @param {object} data - Template-specific data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmail(to, template, data = {}) {
  try {
    const response = await fetch(EMAIL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, template, data })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send vendor approval notification
 */
export async function sendVendorApprovalEmail(vendorEmail, vendorData) {
  return sendEmail(vendorEmail, EmailTemplates.VENDOR_APPROVED, {
    businessName: vendorData.businessName || vendorData.companyName,
    boothNumber: vendorData.boothNumber,
    category: vendorData.category
  });
}

/**
 * Send vendor rejection notification
 */
export async function sendVendorRejectionEmail(vendorEmail, vendorData, reason = '') {
  return sendEmail(vendorEmail, EmailTemplates.VENDOR_REJECTED, {
    businessName: vendorData.businessName || vendorData.companyName,
    reason
  });
}

/**
 * Send new lead notification to vendor
 */
export async function sendNewLeadEmail(vendorEmail, leadData) {
  return sendEmail(vendorEmail, EmailTemplates.NEW_LEAD, {
    businessName: leadData.vendorBusinessName,
    attendeeName: leadData.attendeeName || leadData.name,
    attendeeEmail: leadData.attendeeEmail || leadData.email,
    attendeePhone: leadData.attendeePhone || leadData.phone,
    notes: leadData.notes
  });
}

/**
 * Send welcome email to new attendee
 */
export async function sendAttendeeWelcomeEmail(attendeeEmail, attendeeData) {
  return sendEmail(attendeeEmail, EmailTemplates.ATTENDEE_WELCOME, {
    attendeeName: attendeeData.name || attendeeData.displayName
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(vendorEmail, paymentData) {
  return sendEmail(vendorEmail, EmailTemplates.PAYMENT_CONFIRMATION, {
    businessName: paymentData.businessName,
    transactionId: paymentData.transactionId,
    packageName: paymentData.packageName,
    boothSize: paymentData.boothSize,
    amount: paymentData.amount
  });
}

/**
 * Send admin notification email
 */
export async function sendAdminNotificationEmail(adminEmails, notification) {
  return sendEmail(adminEmails, EmailTemplates.ADMIN_NOTIFICATION, {
    title: notification.title,
    message: notification.message,
    details: notification.details
  });
}

/**
 * Notify admins of new vendor registration
 */
export async function notifyAdminsNewVendor(adminEmails, vendorData) {
  return sendAdminNotificationEmail(adminEmails, {
    title: 'New Vendor Registration',
    message: `A new vendor has registered and is awaiting approval.`,
    details: `
      <strong>Business:</strong> ${vendorData.businessName || vendorData.companyName}<br>
      <strong>Email:</strong> ${vendorData.email}<br>
      <strong>Category:</strong> ${vendorData.category || 'Not specified'}<br>
      <strong>Booth Size:</strong> ${vendorData.boothSize || 'Not specified'}
    `
  });
}

/**
 * Notify admins of completed payment
 */
export async function notifyAdminsPayment(adminEmails, paymentData) {
  return sendAdminNotificationEmail(adminEmails, {
    title: 'Payment Received',
    message: `A payment has been successfully processed.`,
    details: `
      <strong>Vendor:</strong> ${paymentData.businessName}<br>
      <strong>Amount:</strong> $${paymentData.amount}<br>
      <strong>Transaction:</strong> ${paymentData.transactionId}
    `
  });
}
