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
              <a href="${data.appUrl}/vendor-dashboard" class="button">Go to Your Dashboard →</a>
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

Go to your dashboard: ${data.appUrl}/vendor-dashboard

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
              <a href="${data.appUrl}/vendor-leads" class="button">View All Leads →</a>
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

View all leads: ${data.appUrl}/vendor-leads

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
              <a href="${data.appUrl}/lead-pass" class="button">View My Lead Pass →</a>
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

View your Lead Pass: ${data.appUrl}/lead-pass

Enjoy the show!

${data.appName}
${data.appUrl}
    `
  }),

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
              <a href="${data.appUrl}/vendor-dashboard" class="button">Go to Dashboard →</a>
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

Go to Dashboard: ${data.appUrl}/vendor-dashboard

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
              <a href="${data.appUrl}/admin" class="button">View in Admin Dashboard →</a>
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

View in Admin Dashboard: ${data.appUrl}/admin

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
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">${data.resetLink}</p>
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

  vendorImported: (data) => ({
    subject: `Welcome to ${data.appName} - Your Account is Ready!`,
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
          .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px 20px; margin: 20px 0; }
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
            <h2>Hello ${data.businessName}! 👋</h2>
            <p>Great news! Your vendor account has been set up on our new ${data.appName} platform. We've migrated your information from Scan2Scan to make the transition seamless.</p>
            
            <div class="info-box">
              <strong>What's New:</strong><br>
              • Beautiful vendor profile page<br>
              • Digital lead capture system<br>
              • Interactive booth map<br>
              • Real-time analytics
            </div>
            
            <p>To access your account, you'll need to set a password:</p>
            
            <center>
              <a href="${data.resetLink}" class="button">Set Your Password →</a>
            </center>
            
            <p>Once you've set your password, you can:</p>
            <ul>
              <li>Update your business profile</li>
              <li>Add photos and gallery images</li>
              <li>View and manage leads</li>
              <li>Check your booth location</li>
            </ul>
            
            <p>Questions? Just reply to this email - we're here to help!</p>
          </div>
          <div class="footer">
            <p>${data.appName} • <a href="${data.appUrl}">${data.appUrl}</a></p>
            <p>You're receiving this because you were registered as a vendor.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to ${data.appName}!

Hello ${data.businessName}!

Your vendor account has been set up on our new ${data.appName} platform. We've migrated your information from Scan2Scan to make the transition seamless.

What's New:
• Beautiful vendor profile page
• Digital lead capture system
• Interactive booth map
• Real-time analytics

To access your account, set your password here:
${data.resetLink}

Once you've set your password, you can:
- Update your business profile
- Add photos and gallery images
- View and manage leads
- Check your booth location

Questions? Just reply to this email!

${data.appName}
${data.appUrl}
    `
  })
};

/**
 * Send email via SendGrid API
 */
async function sendEmail(to, template, templateData) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@winnpro-shows.app';
  const appName = process.env.APP_NAME || 'WinnPro Shows';
  const appUrl = process.env.APP_URL || 'https://winnpro-shows.app';
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable not set');
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
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }]
      }
    ],
    from: { email: fromEmail, name: appName },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html }
    ]
  };
  
  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }
  
  return { success: true };
}

/**
 * Netlify Function Handler
 */
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
  
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { to, template, data } = JSON.parse(event.body);
    
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
    
    await sendEmail(to, template, data || {});
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
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
