/**
 * SendGrid Email Function
 * Netlify serverless function for transactional emails
 * 
 * Environment Variables Required:
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - FROM_EMAIL: Verified sender email address
 * - APP_NAME: Application name for branding (default: "WinnPro Shows")
 * - APP_URL: Base URL for links in emails
 */

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const { verifyAdmin, verifyAuth } = require('./utils/verify-admin');

const ADMIN_ONLY_TEMPLATES = new Set([
  'vendorApproved',
  'vendorRejected',
  'paymentConfirmation',
  'adminPaymentNotification',
  'adminNotification',
  'passwordReset',
  'vendorContractReminder',
  'vendorContractSignedVendor',
  'vendorContractSignedAdmin',
  'vendorImported',
  'appInvite'
]);

const SIGNED_IN_TEMPLATES = new Set([
  'newLead',
  'attendeeWelcome'
]);

function getHeader(event, key) {
  if (!event || !event.headers) return '';
  const lower = String(key || '').toLowerCase();
  if (!lower) return '';
  const headers = event.headers;
  const direct = headers[lower];
  if (typeof direct === 'string') return direct;
  const alt = Object.keys(headers).find((k) => String(k).toLowerCase() === lower);
  if (alt) return String(headers[alt] || '');
  return '';
}

function hasValidInternalKey(event) {
  const keys = [
    process.env.INTERNAL_FUNCTIONS_KEY,
    process.env.STRIPE_WEBHOOK_SECRET
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!keys.length) return false;
  const received = String(getHeader(event, 'x-internal-function-key') || '').trim();
  return !!received && keys.includes(received);
}

async function authorizeTemplateRequest(event, template) {
  if (hasValidInternalKey(event)) {
    return { ok: true, scope: 'internal' };
  }

  if (ADMIN_ONLY_TEMPLATES.has(template)) {
    const adminAuth = await verifyAdmin(event);
    if (adminAuth.error) {
      return { ok: false, status: adminAuth.status, error: adminAuth.error };
    }
    return { ok: true, scope: 'admin', ...adminAuth };
  }

  if (SIGNED_IN_TEMPLATES.has(template)) {
    const signedInAuth = await verifyAuth(event);
    if (signedInAuth.error) {
      return { ok: false, status: signedInAuth.status, error: signedInAuth.error };
    }
    return { ok: true, scope: 'signed_in', ...signedInAuth };
  }

  // Unknown templates are validated separately. Default to admin for safety.
  const adminAuth = await verifyAdmin(event);
  if (adminAuth.error) {
    return { ok: false, status: adminAuth.status, error: adminAuth.error };
  }
  return { ok: true, scope: 'admin', ...adminAuth };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeRecipients(to) {
  const values = Array.isArray(to) ? to : [to];
  const unique = new Set();
  const recipients = [];

  values.forEach((item) => {
    const email = String(item || '').trim().toLowerCase();
    if (!isValidEmail(email) || unique.has(email)) return;
    unique.add(email);
    recipients.push(email);
  });

  return recipients;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function safeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {}
  return '';
}

function joinAppUrl(appUrl, path) {
  const base = String(appUrl || '').replace(/\/+$/, '');
  const suffix = String(path || '');
  if (!suffix) return base;
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

// Email templates
const templates = {
  vendorApproved: (data) => ({
    subject: `🎉 Your ${data.appName} Vendor Registration is Approved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${data.appName}!</h1>
          </div>
          <div class="content">
            <h2>Congratulations, ${data.businessName}! 🎉</h2>
            <p>Great news! Your vendor registration has been approved. You're now officially part of the ${data.appName}!</p>
            
            <div class="info-box">
              <strong>Your Booth Information:</strong><br>
              Booth Number: ${data.boothNumber || 'To be assigned'}<br>
              Category: ${data.category || 'General'}
            </div>
            
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your vendor profile with photos and description</li>
              <li>Upload your business logo and gallery images</li>
              <li>Set up lead capture for the event</li>
              <li>Share your vendor page with your customers</li>
            </ul>
            
            <center>
              <a href="${data.appUrl}/#/vendor-dashboard" class="button">Go to Your Dashboard →</a>
            </center>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>See you at the show!</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
            <p>You're receiving this because you registered as a vendor.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Congratulations, ${data.businessName}!

Your vendor registration for ${data.appName} has been approved!

Booth Number: ${data.boothNumber || 'To be assigned'}
Category: ${data.category || 'General'}

Next steps:
- Complete your vendor profile with photos and description
- Upload your business logo and gallery images
- Set up lead capture for the event
- Share your vendor page with your customers

Go to your dashboard: ${data.appUrl}/#/vendor-dashboard

See you at the show!

${data.appName}
${data.appUrl}
    `
  }),

  vendorRejected: (data) => ({
    subject: `${data.appName} Vendor Registration Update`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.appName}</h1>
          </div>
          <div class="content">
            <h2>Registration Update</h2>
            <p>Hello ${data.businessName},</p>
            <p>Thank you for your interest in being a vendor at ${data.appName}. Unfortunately, we are unable to approve your registration at this time.</p>
            
            ${data.reason ? `
            <div class="info-box">
              <strong>Reason:</strong><br>
              ${data.reason}
            </div>
            ` : ''}
            
            <p>If you believe this was a mistake or would like more information, please contact our team.</p>
            <p>We appreciate your understanding.</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${data.businessName},

Thank you for your interest in being a vendor at ${data.appName}. Unfortunately, we are unable to approve your registration at this time.

${data.reason ? `Reason: ${data.reason}` : ''}

If you believe this was a mistake or would like more information, please contact our team.

We appreciate your understanding.

${data.appName}
${data.appUrl}
    `
  }),

  newLead: (data) => ({
    subject: `🔔 New Lead: ${data.attendeeName} visited your booth at ${data.appName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .lead-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .lead-card h3 { margin: 0 0 15px 0; color: #333; }
          .lead-item { display: flex; margin-bottom: 10px; }
          .lead-label { color: #888; width: 100px; flex-shrink: 0; }
          .lead-value { color: #333; font-weight: 500; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Lead Captured! 🎯</h1>
          </div>
          <div class="content">
            <h2>Great news, ${data.businessName}!</h2>
            <p>Someone just scanned your booth QR code at ${data.appName}. Here are their details:</p>
            
            <div class="lead-card">
              <h3>Lead Details</h3>
              <div class="lead-item">
                <span class="lead-label">Name:</span>
                <span class="lead-value">${data.attendeeName}</span>
              </div>
              <div class="lead-item">
                <span class="lead-label">Email:</span>
                <span class="lead-value">${data.attendeeEmail || 'Not provided'}</span>
              </div>
              <div class="lead-item">
                <span class="lead-label">Phone:</span>
                <span class="lead-value">${data.attendeePhone || 'Not provided'}</span>
              </div>
              ${data.notes ? `
              <div class="lead-item">
                <span class="lead-label">Notes:</span>
                <span class="lead-value">${data.notes}</span>
              </div>
              ` : ''}
              <div class="lead-item">
                <span class="lead-label">Captured:</span>
                <span class="lead-value">${new Date().toLocaleString()}</span>
              </div>
            </div>
            
            <center>
              <a href="${data.appUrl}/#/vendor-leads" class="button">View All Leads →</a>
            </center>
            
            <p style="color: #888; font-size: 14px;">💡 Pro tip: Follow up within 24 hours for the best conversion rates!</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
            <p>You're receiving this because you're a registered vendor.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Great news, ${data.businessName}!

Someone just scanned your booth QR code at ${data.appName}. Here are their details:

Name: ${data.attendeeName}
Email: ${data.attendeeEmail || 'Not provided'}
Phone: ${data.attendeePhone || 'Not provided'}
${data.notes ? `Notes: ${data.notes}` : ''}
Captured: ${new Date().toLocaleString()}

View all leads: ${data.appUrl}/#/vendor-leads

Pro tip: Follow up within 24 hours for the best conversion rates!

${data.appName}
${data.appUrl}
    `
  }),

  attendeeWelcome: (data) => ({
    subject: `Welcome to ${data.appName}! 🏠`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
          .feature { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .feature-icon { font-size: 24px; margin-bottom: 5px; }
          .feature-text { color: #555; font-size: 14px; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${data.appName}! 🏠</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.attendeeName}!</h2>
            <p>Thanks for creating your digital Lead Pass! You're all set to make the most of the trade show experience.</p>
            
            <div class="feature-grid">
              <div class="feature">
                <div class="feature-icon">📱</div>
                <div class="feature-text">Digital Lead Pass</div>
              </div>
              <div class="feature">
                <div class="feature-icon">🏪</div>
                <div class="feature-text">Browse Vendors</div>
              </div>
              <div class="feature">
                <div class="feature-icon">💾</div>
                <div class="feature-text">Save Favorites</div>
              </div>
              <div class="feature">
                <div class="feature-icon">📍</div>
                <div class="feature-text">Interactive Map</div>
              </div>
            </div>
            
            <p><strong>How to use your Lead Pass:</strong></p>
            <ul>
              <li>Show vendors your QR code to quickly share your info</li>
              <li>Save vendor cards you want to follow up with later</li>
              <li>Use the interactive map to find booths</li>
              <li>Check the schedule for special events</li>
            </ul>
            
            <center>
              <a href="${data.appUrl}/#/lead-pass" class="button">View My Lead Pass →</a>
            </center>
            
            <p>Enjoy the show!</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
            <p>You're receiving this because you signed up at ${data.appName}.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${data.attendeeName}!

Thanks for creating your digital Lead Pass! You're all set to make the most of the trade show experience.

Features available to you:
- Digital Lead Pass - Show vendors your QR code
- Browse Vendors - Find companies you're interested in
- Save Favorites - Keep track of vendors to follow up with
- Interactive Map - Find booth locations

How to use your Lead Pass:
- Show vendors your QR code to quickly share your info
- Save vendor cards you want to follow up with later
- Use the interactive map to find booths
- Check the schedule for special events

View your Lead Pass: ${data.appUrl}/#/lead-pass

Enjoy the show!

${data.appName}
${data.appUrl}
    `
  }),

  appInvite: (data) => {
    const attendeeNameRaw = String(data.attendeeName || data.name || 'there').trim();
    const roleRaw = String(data.role || 'attendee').trim().toLowerCase();
    const roleLabel = roleRaw === 'admin' ? 'admin' : (roleRaw === 'vendor' ? 'vendor' : 'attendee');
    const resetLink = safeHttpUrl(data.resetLink);
    const hasResetLink = resetLink.length > 0;
    const signInUrl = joinAppUrl(data.appUrl, '/#/more');
    const homeUrl = joinAppUrl(data.appUrl, '/#/home');

    const attendeeName = escapeHtml(attendeeNameRaw);
    const safeSignInUrl = escapeHtml(signInUrl);
    const safeHomeUrl = escapeHtml(homeUrl);
    const safeResetLink = escapeHtml(resetLink);

    return {
      subject: `You're invited to join ${data.appName}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { max-width: 640px; margin: 0 auto; padding: 24px 12px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; padding: 28px 24px; }
          .header h1 { margin: 0; font-size: 24px; line-height: 1.2; }
          .header p { margin: 10px 0 0 0; opacity: 0.92; font-size: 14px; }
          .content { padding: 24px; }
          .content h2 { margin: 0 0 12px 0; font-size: 20px; }
          .content p { margin: 0 0 14px 0; line-height: 1.6; color: #374151; }
          .button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; margin: 8px 8px 8px 0; }
          .button.alt { background: #0f172a; }
          .footer { padding: 18px 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
          .footer a { color: #2563eb; text-decoration: none; }
          .badge { display: inline-block; font-size: 12px; background: #e5e7eb; color: #1f2937; border-radius: 999px; padding: 4px 10px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="header">
              <h1>${escapeHtml(data.appName)}</h1>
              <p>Your account invitation is ready</p>
            </div>
            <div class="content">
              <span class="badge">${escapeHtml(roleLabel)}</span>
              <h2>Hello ${attendeeName},</h2>
              <p>An administrator invited you to join <strong>${escapeHtml(data.appName)}</strong> as an ${escapeHtml(roleLabel)}.</p>
              <a href="${safeSignInUrl}" class="button alt">Open App</a>
              <a href="${safeHomeUrl}" class="button">Go to Home</a>

              ${hasResetLink ? `
                <p>Set your password to activate your account:</p>
                <a href="${safeResetLink}" class="button">Set Password</a>
              ` : `
                <p>If you already have an account, sign in with your existing login. If not, use the password reset option on the sign-in screen.</p>
              `}
            </div>
            <div class="footer">
              <div>${escapeHtml(data.appName)} - <a href="${escapeHtml(data.appUrl)}">${escapeHtml(data.appUrl)}</a></div>
              <div style="margin-top: 8px;">You are receiving this because an administrator created an account for you.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Hello ${attendeeNameRaw},

You were invited to join ${data.appName} as a ${roleLabel}.

Open app: ${signInUrl}
Home: ${homeUrl}

${hasResetLink ? `Set password: ${resetLink}` : 'Use password reset on the sign-in page if needed.'}

${data.appName}
${data.appUrl}
      `
    };
  },

  paymentConfirmation: (data) => ({
    subject: `Payment Confirmed - ${data.appName} Vendor Registration`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .receipt { background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; }
          .receipt-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px; }
          .receipt-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .receipt-label { color: #888; }
          .receipt-value { color: #333; font-weight: 500; }
          .receipt-total { border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px; font-size: 18px; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed ✓</h1>
          </div>
          <div class="content">
            <h2>Thank you, ${data.businessName}!</h2>
            <p>Your payment has been successfully processed. Here's your receipt:</p>
            
            <div class="receipt">
              <div class="receipt-header">
                <strong>Receipt</strong>
                <div style="color: #888; font-size: 14px;">Transaction ID: ${data.transactionId || 'N/A'}</div>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Package:</span>
                <span class="receipt-value">${data.packageName || 'Vendor Booth'}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Booth Size:</span>
                <span class="receipt-value">${data.boothSize || 'Standard'}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Date:</span>
                <span class="receipt-value">${new Date().toLocaleDateString()}</span>
              </div>
              <div class="receipt-row receipt-total">
                <span class="receipt-label"><strong>Total Paid:</strong></span>
                <span class="receipt-value"><strong>$${data.amount || '0.00'}</strong></span>
              </div>
            </div>
            
            <p>Your registration is now pending admin approval. We'll notify you once approved.</p>
            
            <center>
              <a href="${data.appUrl}/#/vendor-dashboard" class="button">Go to Dashboard →</a>
            </center>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
            <p>Please save this email for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Thank you, ${data.businessName}!

Your payment has been successfully processed.

RECEIPT
-----------------
Transaction ID: ${data.transactionId || 'N/A'}
Package: ${data.packageName || 'Vendor Booth'}
Booth Size: ${data.boothSize || 'Standard'}
Date: ${new Date().toLocaleDateString()}
Total Paid: $${data.amount || '0.00'}

Your registration is now pending admin approval. We'll notify you once approved.

Go to Dashboard: ${data.appUrl}/#/vendor-dashboard

Please save this email for your records.

${data.appName}
${data.appUrl}
    `
  }),

  adminPaymentNotification: (data) => ({
    subject: `💰 Vendor Payment Received: ${data.businessName} - ${data.appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
          .payment-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .payment-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .payment-label { color: #6b7280; }
          .payment-value { color: #111827; font-weight: 500; }
          .payment-total { border-top: 2px solid #10b981; padding-top: 10px; margin-top: 10px; font-size: 18px; }
          .footer { background: #f4f4f7; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Received!</h1>
          </div>
          <div class="content">
            <h2>Vendor Payment Confirmation</h2>
            <p>A vendor has successfully completed their payment:</p>
            
            <div class="payment-card">
              <div class="payment-row">
                <span class="payment-label">Vendor:</span>
                <span class="payment-value">${data.businessName}</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Email:</span>
                <span class="payment-value">${data.vendorEmail}</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Package:</span>
                <span class="payment-value">${data.packageName || 'Vendor Booth'}</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Booth Type:</span>
                <span class="payment-value">${data.boothType || 'Standard'}</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Transaction ID:</span>
                <span class="payment-value">${data.transactionId || 'N/A'}</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Date:</span>
                <span class="payment-value">${new Date().toLocaleDateString()}</span>
              </div>
              <div class="payment-row payment-total">
                <span class="payment-label"><strong>Amount Paid:</strong></span>
                <span class="payment-value"><strong>$${data.amount || '0.00'}</strong></span>
              </div>
            </div>
            
            <p>The vendor's status has been automatically updated to "paid" in the system.</p>
            
            <center>
              <a href="${data.appUrl}/#/admin?tab=vendors" class="button">View Vendor in Admin →</a>
            </center>
          </div>
          <div class="footer">
            <p>This is an automated admin notification from ${data.appName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
VENDOR PAYMENT RECEIVED

A vendor has successfully completed their payment:

Vendor: ${data.businessName}
Email: ${data.vendorEmail}
Package: ${data.packageName || 'Vendor Booth'}
Booth Type: ${data.boothType || 'Standard'}
Transaction ID: ${data.transactionId || 'N/A'}
Date: ${new Date().toLocaleDateString()}
Amount Paid: $${data.amount || '0.00'}

The vendor's status has been automatically updated to "paid" in the system.

View in Admin Dashboard: ${data.appUrl}/#/admin?tab=vendors

This is an automated admin notification from ${data.appName}
    `
  }),

  adminNotification: (data) => ({
    subject: `[Admin] ${data.title} - ${data.appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
          .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; }
          .footer { background: #f4f4f7; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Admin Alert</h1>
          </div>
          <div class="content">
            <h2>${data.title}</h2>
            <p>${data.message}</p>
            
            ${data.details ? `
            <div class="info-box">
              ${data.details}
            </div>
            ` : ''}
            
            <center>
              <a href="${data.appUrl}/#/admin" class="button">View in Admin Dashboard →</a>
            </center>
          </div>
          <div class="footer">
            <p>This is an automated admin notification from ${data.appName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ADMIN ALERT: ${data.title}

${data.message}

${data.details || ''}

View in Admin Dashboard: ${data.appUrl}/#/admin

This is an automated admin notification from ${data.appName}
    `
  }),

  passwordReset: (data) => ({
    subject: `Reset Your ${data.appName} Password`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; }
          .content p { color: #555; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; }
          .footer { background: #f4f4f7; padding: 30px; text-align: center; color: #888; font-size: 14px; }
          .footer a { color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You've requested to reset your password for your ${data.appName} account.</p>
            <p>Click the button below to create a new password:</p>
            
            <center>
              <a href="${data.resetLink}" class="button">Reset Password →</a>
            </center>
            
            <div class="info-box">
              <strong>Security Notice:</strong><br>
              This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </div>
            
            <p>If you have trouble opening the button, reply to this email and we will help you reset your password.</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Reset Your Password

You've requested to reset your password for your ${data.appName} account.

Click this link to create a new password:
${data.resetLink}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

${data.appName}
${data.appUrl}
    `
  }),

  vendorContractReminder: (data) => {
    const businessNameRaw = String(data.businessName || 'Vendor').trim() || 'Vendor';
    const showNameRaw = String(data.showName || data.appName || 'WinnPro Shows').trim();
    const providedContract = String(data.contractUrl || '/assets/contracts/Vendor-Contract-Source.docx').trim();
    const contractUrl = safeHttpUrl(providedContract) || safeHttpUrl(joinAppUrl(data.appUrl, providedContract)) || joinAppUrl(data.appUrl, '/assets/contracts/Vendor-Contract-Source.docx');
    const signContractUrl = joinAppUrl(data.appUrl, '/#/vendor-contract');
    const dashboardUrl = joinAppUrl(data.appUrl, '/#/vendor-dashboard');
    const safeBusinessName = escapeHtml(businessNameRaw);
    const safeShowName = escapeHtml(showNameRaw);
    const safeContractUrl = escapeHtml(contractUrl);
    const safeSignContractUrl = escapeHtml(signContractUrl);
    const safeDashboardUrl = escapeHtml(dashboardUrl);

    return {
      subject: `Action Required: Sign Vendor Contract for ${showNameRaw}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { max-width: 640px; margin: 0 auto; padding: 24px 12px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff; padding: 28px 24px; }
          .header h1 { margin: 0; font-size: 24px; line-height: 1.2; }
          .header p { margin: 10px 0 0 0; opacity: 0.92; font-size: 14px; }
          .content { padding: 24px; }
          .content h2 { margin: 0 0 12px 0; font-size: 20px; }
          .content p { margin: 0 0 14px 0; line-height: 1.6; color: #374151; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; padding: 14px 16px; margin: 18px 0; }
          .button { display: inline-block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; margin: 8px 8px 8px 0; }
          .button.alt { background: #0f172a; }
          .footer { padding: 18px 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="header">
              <h1>Vendor Contract Required</h1>
              <p>Please complete your contract to stay compliant for ${safeShowName}</p>
            </div>
            <div class="content">
              <h2>Hello ${safeBusinessName},</h2>
              <p>Our records show your vendor contract is still missing. This contract is required for all participating vendors.</p>

              <div class="warning">
                Complete this as soon as possible to avoid delays in your vendor onboarding and show readiness.
              </div>

              <a href="${safeSignContractUrl}" class="button">Sign In App</a>
              <a href="${safeContractUrl}" class="button alt">View Source Contract</a>

              <p>You can also review your account in the vendor dashboard:</p>
              <a href="${safeDashboardUrl}" class="button alt">Open Vendor Dashboard</a>

              <p>If you already completed this, no action is needed.</p>
            </div>
            <div class="footer">
              <div>${escapeHtml(data.appName)} - <a href="${escapeHtml(data.appUrl)}">${escapeHtml(data.appUrl)}</a></div>
              <div style="margin-top: 8px;">This is an automated reminder from show administration.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Action Required: Vendor Contract Needed

Hello ${businessNameRaw},

Our records show your vendor contract is still missing for ${showNameRaw}.
This contract is required for all participating vendors.

Open contract:
${contractUrl}

Sign in app:
${signContractUrl}

Vendor dashboard:
${dashboardUrl}

If you already completed the contract, please update your profile so your status is marked signed.

${data.appName}
${data.appUrl}
      `
    };
  },

  vendorContractSignedVendor: (data) => {
    const businessNameRaw = String(data.businessName || 'Vendor').trim() || 'Vendor';
    const showNameRaw = String(data.showName || data.appName || 'WinnPro Shows').trim();
    const signerNameRaw = String(data.signerName || businessNameRaw).trim();
    const signedAtRaw = String(data.signedAt || '').trim();
    const contractUrlRaw = String(data.contractUrl || '/assets/contracts/Vendor-Contract-Source.docx').trim();
    const dashboardUrlRaw = String(data.dashboardUrl || '/#/vendor-dashboard').trim();

    const contractUrl = safeHttpUrl(contractUrlRaw) || safeHttpUrl(joinAppUrl(data.appUrl, contractUrlRaw)) || joinAppUrl(data.appUrl, '/assets/contracts/Vendor-Contract-Source.docx');
    const dashboardUrl = safeHttpUrl(dashboardUrlRaw) || safeHttpUrl(joinAppUrl(data.appUrl, dashboardUrlRaw)) || joinAppUrl(data.appUrl, '/#/vendor-dashboard');

    const safeBusinessName = escapeHtml(businessNameRaw);
    const safeShowName = escapeHtml(showNameRaw);
    const safeSignerName = escapeHtml(signerNameRaw);
    const safeSignedAt = escapeHtml(signedAtRaw || new Date().toISOString());
    const safeContractUrl = escapeHtml(contractUrl);
    const safeDashboardUrl = escapeHtml(dashboardUrl);

    return {
      subject: `Contract Confirmation - ${showNameRaw}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { max-width: 640px; margin: 0 auto; padding: 24px 12px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 28px 24px; }
          .header h1 { margin: 0; font-size: 24px; line-height: 1.2; }
          .header p { margin: 10px 0 0 0; opacity: 0.92; font-size: 14px; }
          .content { padding: 24px; }
          .content p { margin: 0 0 14px 0; line-height: 1.6; color: #374151; }
          .details { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 16px; margin: 18px 0; }
          .details p { margin: 0 0 8px 0; color: #1f2937; }
          .details p:last-child { margin-bottom: 0; }
          .button { display: inline-block; background: #047857; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; margin: 8px 8px 8px 0; }
          .button.alt { background: #0f172a; }
          .footer { padding: 18px 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="header">
              <h1>Contract Signed</h1>
              <p>Your vendor contract has been recorded for ${safeShowName}</p>
            </div>
            <div class="content">
              <p>Hello ${safeBusinessName},</p>
              <p>We received your digital contract signature. Your contract record is now on file.</p>

              <div class="details">
                <p><strong>Show:</strong> ${safeShowName}</p>
                <p><strong>Signer:</strong> ${safeSignerName}</p>
                <p><strong>Signed At:</strong> ${safeSignedAt}</p>
              </div>

              <a href="${safeContractUrl}" class="button">View Contract</a>
              <a href="${safeDashboardUrl}" class="button alt">Open Vendor Dashboard</a>
            </div>
            <div class="footer">
              <div>${escapeHtml(data.appName)} - <a href="${escapeHtml(data.appUrl)}">${escapeHtml(data.appUrl)}</a></div>
              <div style="margin-top: 8px;">This is an automated confirmation from show administration.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Contract Confirmation

Hello ${businessNameRaw},

We received your digital vendor contract signature for ${showNameRaw}.

Signer: ${signerNameRaw}
Signed At: ${signedAtRaw || new Date().toISOString()}

View contract:
${contractUrl}

Vendor dashboard:
${dashboardUrl}

${data.appName}
${data.appUrl}
      `
    };
  },

  vendorContractSignedAdmin: (data) => {
    const businessNameRaw = String(data.businessName || 'Vendor').trim() || 'Vendor';
    const showNameRaw = String(data.showName || data.appName || 'WinnPro Shows').trim();
    const signerNameRaw = String(data.signerName || businessNameRaw).trim();
    const signerEmailRaw = String(data.signerEmail || '').trim();
    const signedAtRaw = String(data.signedAt || '').trim();
    const contractUrlRaw = String(data.contractUrl || '/assets/contracts/Vendor-Contract-Source.docx').trim();
    const adminUrlRaw = String(data.vendorDashboardUrl || '/#/admin').trim();
    const vendorIdRaw = String(data.vendorId || '').trim();

    const contractUrl = safeHttpUrl(contractUrlRaw) || safeHttpUrl(joinAppUrl(data.appUrl, contractUrlRaw)) || joinAppUrl(data.appUrl, '/assets/contracts/Vendor-Contract-Source.docx');
    const adminUrl = safeHttpUrl(adminUrlRaw) || safeHttpUrl(joinAppUrl(data.appUrl, adminUrlRaw)) || joinAppUrl(data.appUrl, '/#/admin');

    const safeBusinessName = escapeHtml(businessNameRaw);
    const safeShowName = escapeHtml(showNameRaw);
    const safeSignerName = escapeHtml(signerNameRaw);
    const safeSignerEmail = escapeHtml(signerEmailRaw || 'not provided');
    const safeSignedAt = escapeHtml(signedAtRaw || new Date().toISOString());
    const safeContractUrl = escapeHtml(contractUrl);
    const safeAdminUrl = escapeHtml(adminUrl);
    const safeVendorId = escapeHtml(vendorIdRaw || 'n/a');

    return {
      subject: `[Admin] Vendor Contract Signed - ${businessNameRaw}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { max-width: 640px; margin: 0 auto; padding: 24px 12px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%); color: #ffffff; padding: 28px 24px; }
          .header h1 { margin: 0; font-size: 24px; line-height: 1.2; }
          .content { padding: 24px; }
          .content p { margin: 0 0 14px 0; line-height: 1.6; color: #374151; }
          .details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 16px; margin: 18px 0; }
          .details p { margin: 0 0 8px 0; color: #1f2937; }
          .details p:last-child { margin-bottom: 0; }
          .button { display: inline-block; background: #1d4ed8; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; margin: 8px 8px 8px 0; }
          .button.alt { background: #0f172a; }
          .footer { padding: 18px 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="header">
              <h1>Vendor Contract Signed</h1>
            </div>
            <div class="content">
              <p>A vendor contract has just been signed in-app.</p>
              <div class="details">
                <p><strong>Business:</strong> ${safeBusinessName}</p>
                <p><strong>Show:</strong> ${safeShowName}</p>
                <p><strong>Signer:</strong> ${safeSignerName}</p>
                <p><strong>Signer Email:</strong> ${safeSignerEmail}</p>
                <p><strong>Signed At:</strong> ${safeSignedAt}</p>
                <p><strong>Vendor ID:</strong> ${safeVendorId}</p>
              </div>
              <a href="${safeContractUrl}" class="button">View Contract</a>
              <a href="${safeAdminUrl}" class="button alt">Open Admin Dashboard</a>
            </div>
            <div class="footer">
              <div>${escapeHtml(data.appName)} - <a href="${escapeHtml(data.appUrl)}">${escapeHtml(data.appUrl)}</a></div>
              <div style="margin-top: 8px;">This is an automated admin confirmation email.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `,
      text: `
Vendor Contract Signed

Business: ${businessNameRaw}
Show: ${showNameRaw}
Signer: ${signerNameRaw}
Signer Email: ${signerEmailRaw || 'not provided'}
Signed At: ${signedAtRaw || new Date().toISOString()}
Vendor ID: ${vendorIdRaw || 'n/a'}

Contract:
${contractUrl}

Admin Dashboard:
${adminUrl}

${data.appName}
${data.appUrl}
      `
    };
  },

  vendorImported: (data) => {
    const showNameRaw = String(data.showName || data.appName || 'WinnPro Home Show').trim();
    const businessNameRaw = String(data.businessName || 'Vendor').trim();
    const boothNumbersRaw = String(data.boothNumbers || data.boothNumber || 'TBD').trim() || 'TBD';
    const vendorProfilePath = data.vendorId ? `/#/vendor/${data.vendorId}` : '/#/vendor-dashboard';
    const vendorProfileUrl = joinAppUrl(data.appUrl, vendorProfilePath);
    const vendorDashboardUrl = joinAppUrl(data.appUrl, '/#/vendor-dashboard');
    const resetLink = safeHttpUrl(data.resetLink);
    const hasResetLink = resetLink.length > 0;

    const showName = escapeHtml(showNameRaw);
    const businessName = escapeHtml(businessNameRaw);
    const boothNumbers = escapeHtml(boothNumbersRaw);
    const safeVendorProfileUrl = escapeHtml(vendorProfileUrl);
    const safeVendorDashboardUrl = escapeHtml(vendorDashboardUrl);
    const safeResetLink = escapeHtml(resetLink);

    return {
      subject: `Vendor Confirmation: ${showNameRaw} - Booth ${boothNumbersRaw}`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { max-width: 640px; margin: 0 auto; padding: 24px 12px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; padding: 28px 24px; }
          .header h1 { margin: 0; font-size: 24px; line-height: 1.2; }
          .header p { margin: 10px 0 0 0; opacity: 0.92; font-size: 14px; }
          .content { padding: 24px; }
          .content h2 { margin: 0 0 12px 0; font-size: 20px; }
          .content p { margin: 0 0 14px 0; line-height: 1.6; color: #374151; }
          .details { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 16px; margin: 18px 0; }
          .details p { margin: 0 0 8px 0; color: #1f2937; }
          .details p:last-child { margin-bottom: 0; }
          .k { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin-right: 8px; }
          .v { font-weight: 600; color: #111827; font-size: 14px; }
          .button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; margin: 8px 8px 8px 0; }
          .button.alt { background: #0f172a; }
          .footer { padding: 18px 24px 24px 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="wrap">
        <div class="card">
          <div class="header">
            <h1>${escapeHtml(data.appName)}</h1>
            <p>Vendor account assigned and ready</p>
          </div>
          <div class="content">
            <h2>Hello ${businessName},</h2>
            <p>You have been assigned as an approved vendor for <strong>${showName}</strong>.</p>

            <div class="details">
              <p><span class="k">Show</span><span class="v">${showName}</span></p>
              <p><span class="k">Booth</span><span class="v">${boothNumbers}</span></p>
            </div>

            <p>Your vendor profile is now available in the app.</p>
            <a href="${safeVendorProfileUrl}" class="button">Open Vendor Profile</a>
            <a href="${safeVendorDashboardUrl}" class="button alt">Open Vendor Dashboard</a>

            ${hasResetLink ? `
            <p>To access and manage your account, set your password first:</p>
            <a href="${safeResetLink}" class="button">Set Password</a>
            ` : `
            <p>If you have not set your password yet, use the password reset option on the sign-in page.</p>
            `}

            <p>Need help? Reply to this email and our team will assist.</p>
          </div>
          <div class="footer">
            <div>${escapeHtml(data.appName)} - <a href="${escapeHtml(data.appUrl)}">${escapeHtml(data.appUrl)}</a></div>
            <div style="margin-top: 8px;">You are receiving this email because your vendor account was imported by an event administrator.</div>
          </div>
          </div>
        </div>
      </body>
      </html>
    `,
      text: `
Hello ${businessNameRaw},

You have been assigned as an approved vendor for ${showNameRaw}.

Assignment Details:
- Show: ${showNameRaw}
- Booth: ${boothNumbersRaw}

Vendor profile: ${vendorProfileUrl}
Vendor dashboard: ${vendorDashboardUrl}

${hasResetLink ? `Set your password to access your account: ${resetLink}` : 'If needed, use password reset on the sign-in page.'}

Need help? Reply to this email and our team will assist.

${data.appName}
${data.appUrl}
    `
    };
  }
};

/**
 * Send email via SendGrid API
 */
async function sendEmail(to, template, templateData) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@winnpro-shows.app';
  const replyToEmail = process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || '';
  const appName = process.env.APP_NAME || 'WinnPro Shows';
  const appUrl = process.env.APP_URL || 'https://winnpro-shows.app';
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable not set');
  }

  if (!isValidEmail(fromEmail)) {
    throw new Error('FROM_EMAIL (or SENDGRID_FROM_EMAIL) is missing or invalid');
  }

  const recipients = normalizeRecipients(to);
  if (!recipients.length) {
    throw new Error('No valid recipient email address provided');
  }
  
  // Add app info to template data
  const data = {
    ...templateData,
    appName,
    appUrl
  };
  
  // Get template
  const templateFn = templates[template];
  if (!templateFn) {
    throw new Error(`Unknown email template: ${template}`);
  }
  
  const { subject, html, text } = templateFn(data);
  
  const emailPayload = {
    personalizations: [
      {
        to: recipients.map((email) => ({ email }))
      }
    ],
    from: { email: fromEmail, name: appName },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html }
    ],
    tracking_settings: {
      click_tracking: {
        enable: false,
        enable_text: false
      }
    }
  };

  if (isValidEmail(replyToEmail)) {
    emailPayload.reply_to = { email: replyToEmail };
  }
  
  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    const errorPreview = String(errorBody || '').slice(0, 600);
    throw new Error(`SendGrid API error (${response.status}): ${errorPreview}`);
  }
  
  return {
    success: true,
    recipients,
    messageId: response.headers.get('x-message-id') || null
  };
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Function-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const parsedBody = JSON.parse(event.body || '{}');
    const { to, template, data } = parsedBody;
    
    if (!to || !template) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, template' })
      };
    }
    
    // Validate template exists
    if (!templates[template]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid template: ${template}`,
          availableTemplates: Object.keys(templates)
        })
      };
    }

    const authResult = await authorizeTemplateRequest(event, template);
    if (!authResult.ok) {
      return {
        statusCode: authResult.status || 403,
        headers,
        body: JSON.stringify({ error: authResult.error || 'Not authorized to send this email template' })
      };
    }
    
    const sendResult = await sendEmail(to, template, data || {});
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully', ...sendResult })
    };
  } catch (error) {
    console.error('Email send error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

