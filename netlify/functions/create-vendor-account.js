/**
 * Create Vendor Account Netlify Function
 * Creates a Firebase Auth account for imported vendors and optionally returns a password reset link.
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
    const { email, displayName, sendPasswordReset } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    let userRecord;
    let isNewUser = false;

    try {
      // Check if user already exists
      userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      console.log('User already exists:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user with a random password (they'll reset it)
        const tempPassword = generateSecurePassword();
        userRecord = await admin.auth().createUser({
          email: normalizedEmail,
          displayName: displayName || '',
          password: tempPassword,
          emailVerified: false
        });
        isNewUser = true;
        console.log('Created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    let resetLink = null;
    // Generate password reset link if requested
    if (sendPasswordReset) {
      try {
        const { continueUrl } = resolveAppUrls();
        resetLink = await admin.auth().generatePasswordResetLink(normalizedEmail, {
          url: continueUrl,
          handleCodeInApp: false
        });
        console.log('Password reset link generated for:', normalizedEmail);
      } catch (resetError) {
        console.warn('Could not generate password reset:', resetError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uid: userRecord.uid,
        email: userRecord.email,
        resetLink,
        isNewUser,
        message: isNewUser 
          ? 'Account created successfully' 
          : 'Account already exists'
      })
    };

  } catch (error) {
    console.error('Create vendor account error:', error);
    
    return {
      statusCode: error.code === 'auth/email-already-exists' ? 200 : 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        code: error.code || 'unknown'
      })
    };
  }
};

/**
 * Generate a secure random password
 */
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
