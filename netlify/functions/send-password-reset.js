/**
 * Send Password Reset Netlify Function
 * Triggers Firebase password reset email for a user (admin-only).
 */

const { verifyAdmin, getAdmin } = require('./utils/verify-admin');

function resolveAppUrls() {
  const raw = String(process.env.APP_URL || process.env.SITE_URL || process.env.URL || 'https://winnpro-shows.app').trim();
  const baseUrl = raw.replace(/\/+$/, '').split('#')[0];
  return {
    baseUrl,
    continueUrl: `${baseUrl}/#/more`
  };
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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

  // Require admin authentication
  const auth = await verifyAdmin(event);
  if (auth.error) {
    return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    const admin = getAdmin();
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    try {
      await admin.auth().getUserByEmail(normalizedEmail);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No account found with this email' })
        };
      }
      throw error;
    }

    // Generate password reset link
    const { baseUrl, continueUrl } = resolveAppUrls();
    const resetLink = await admin.auth().generatePasswordResetLink(normalizedEmail, {
      url: continueUrl,
      handleCodeInApp: false
    });

    // Send email via your email function or just return the link
    // The reset link can be sent via your existing email infrastructure
    const forwardAuth = event.headers['authorization'] || event.headers['Authorization'] || '';
    const forwardInternal = event.headers['x-internal-function-key'] || event.headers['X-Internal-Function-Key'] || '';
    const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(forwardAuth ? { Authorization: forwardAuth } : {}),
        ...(forwardInternal ? { 'X-Internal-Function-Key': forwardInternal } : {})
      },
      body: JSON.stringify({
        to: normalizedEmail,
        template: 'passwordReset',
        data: {
          resetLink,
          appName: 'WinnPro Shows',
          appUrl: baseUrl
        }
      })
    });

    const emailPayload = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      throw new Error(emailPayload.error || `Password reset email dispatch failed (${emailResponse.status})`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password reset email sent',
        messageId: emailPayload.messageId || null
      })
    };

  } catch (error) {
    console.error('Password reset error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        code: error.code || 'unknown'
      })
    };
  }
};
