import { Toast } from "./ui.js";

export function handleAuthError(error, provider = '') {
  console.error(`[Auth] ${provider} sign in failed:`, error.code, error.message);

  const providerName = provider || 'Sign in';

  // User-cancelled actions - no message needed
  if (error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/user-cancelled') {
    return;
  }

  if (error.code === 'auth/popup-blocked') {
    Toast(`Popup blocked! Please allow popups for this site and try again.`);
    return;
  }

  if (error.code === 'auth/network-request-failed') {
    Toast(`No internet connection. Please check your network and try again.`);
    return;
  }

  if (error.code === 'auth/account-exists-with-different-credential') {
    const pendingEmail = String(error?.pendingGoogleEmail || error?.customData?.email || '').trim().toLowerCase();
    if (pendingEmail) {
      Toast(`This email already has an account. Sign in once with email/password for ${pendingEmail}; Google will be linked automatically.`);
    } else {
      Toast(`This email already has an account. Sign in once with email/password, then Google will work too.`);
    }
    return;
  }

  if (error.code === 'auth/email-already-in-use') {
    Toast(`This email is already registered. Try signing in instead.`);
    return;
  }

  if (error.code === 'auth/invalid-credential' && provider === 'Apple') {
    Toast(`Apple Sign In failed. Make sure you're signed into your Apple ID on this device.`);
    return;
  }

  if (provider === 'Email' && (
    error.code === 'auth/invalid-credential' ||
    error.code === 'auth/invalid-login-credentials'
  )) {
    Toast(`Incorrect email or password. If this account was invited by admin, use Password Reset first to set your password.`);
    return;
  }

  if (error.code === 'auth/user-disabled') {
    Toast(`This account is disabled. Contact an admin for help.`);
    return;
  }

  if (error.code === 'auth/missing-password') {
    Toast(`Please enter your password.`);
    return;
  }

  if (error.code === 'auth/missing-email') {
    Toast(`Please enter your email address.`);
    return;
  }

  if (error.code === 'auth/operation-not-allowed') {
    Toast(`${providerName} sign in is not available. Please try a different method.`);
    return;
  }

  if (error.code === 'auth/too-many-requests') {
    Toast(`Too many attempts. Please wait a moment and try again.`);
    return;
  }

  if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-password') {
    Toast(`Incorrect password. Please try again or reset your password.`);
    return;
  }

  if (error.code === 'auth/user-not-found') {
    Toast(`No account found with this email. Please sign up first.`);
    return;
  }

  if (error.code === 'auth/invalid-email') {
    Toast(`Please enter a valid email address.`);
    return;
  }

  if (error.code === 'auth/weak-password') {
    Toast(`Password is too weak. Use at least 6 characters with letters and numbers.`);
    return;
  }

  Toast(`${providerName} failed. Please try a different sign-in method or check your connection.`);
}
