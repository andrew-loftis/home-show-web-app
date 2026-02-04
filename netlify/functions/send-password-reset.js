/**
 * Send Password Reset Netlify Function
 * Triggers Firebase password reset email for a user
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
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
    const resetLink = await admin.auth().generatePasswordResetLink(normalizedEmail, {
      url: process.env.URL || 'https://your-app.netlify.app',
      handleCodeInApp: false
    });

    // Send email via your email function or just return the link
    // The reset link can be sent via your existing email infrastructure
    const emailResponse = await fetch(`${process.env.URL || ''}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: normalizedEmail,
        template: 'passwordReset',
        data: {
          resetLink,
          appName: 'WinnPro Shows'
        }
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password reset email sent'
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
