// Firebase wrapper using modular SDK v12 (no bundler). Works with or without
// the index.html snippet initializing the app. If the app is not initialized,
// we will initialize it with window.FIREBASE_CONFIG if present.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, linkWithCredential, signOut, connectAuthEmulator, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, limit as qLimit, connectFirestoreEmulator, arrayUnion, arrayRemove, getCountFromServer, setLogLevel } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { deleteUser as fbDeleteUser } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytesResumable, uploadBytes, getDownloadURL, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";
import { mergeDuplicateVendors, findVendorByAnyId } from "./utils/vendorMerge.js";

// Lazy import show utilities to avoid circular dependency
// shows.js imports firebase modules dynamically, so we can't import it at the top level
let showsModule = null;
async function getShowsModule() {
  if (!showsModule) {
    showsModule = await import('./shows.js');
  }
  return showsModule;
}

// Synchronous helpers that return defaults if shows not loaded yet
function getCurrentShowIdSync() {
  try {
    // Try to get from localStorage directly as fallback
    const stored = localStorage.getItem('winnpro_selected_show');
    return stored || 'putnam-spring-2026';
  } catch {
    return 'putnam-spring-2026';
  }
}

const DEFAULT_SHOW_ID_FALLBACK = 'putnam-spring-2026';

let initialized = false;
const AUTH_RETURN_HASH_KEY = 'winnpro_auth_return_hash';
const PENDING_GOOGLE_LINK_KEY = 'winnpro_pending_google_link';

function readPendingGoogleLink() {
  try {
    const raw = localStorage.getItem(PENDING_GOOGLE_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const email = String(parsed.email || '').trim().toLowerCase();
    const idToken = String(parsed.idToken || '').trim();
    const accessToken = String(parsed.accessToken || '').trim();
    if (!email || (!idToken && !accessToken)) return null;
    return {
      providerId: 'google.com',
      email,
      idToken,
      accessToken,
      savedAt: Number(parsed.savedAt || 0)
    };
  } catch {
    return null;
  }
}

function persistPendingGoogleLink(payload = {}) {
  try {
    const email = String(payload.email || '').trim().toLowerCase();
    const idToken = String(payload.idToken || '').trim();
    const accessToken = String(payload.accessToken || '').trim();
    if (!email || (!idToken && !accessToken)) return false;
    localStorage.setItem(PENDING_GOOGLE_LINK_KEY, JSON.stringify({
      providerId: 'google.com',
      email,
      idToken,
      accessToken,
      savedAt: Date.now()
    }));
    return true;
  } catch {
    return false;
  }
}

function clearPendingGoogleLink() {
  try {
    localStorage.removeItem(PENDING_GOOGLE_LINK_KEY);
  } catch {}
}

function stashPendingGoogleLinkFromError(error) {
  if (String(error?.code || '') !== 'auth/account-exists-with-different-credential') return false;
  try {
    const email = String(error?.customData?.email || '').trim().toLowerCase();
    const credential = GoogleAuthProvider.credentialFromError(error);
    const idToken = String(credential?.idToken || '').trim();
    const accessToken = String(credential?.accessToken || '').trim();
    const saved = persistPendingGoogleLink({ email, idToken, accessToken });
    if (saved) {
      error.pendingGoogleEmail = email;
      error.requiresEmailLinkSignIn = true;
      return true;
    }
  } catch {}
  return false;
}

function buildGoogleCredentialFromPending(pending = null) {
  if (!pending || pending.providerId !== 'google.com') return null;
  const idToken = String(pending.idToken || '').trim() || null;
  const accessToken = String(pending.accessToken || '').trim() || null;
  if (!idToken && !accessToken) return null;
  return GoogleAuthProvider.credential(idToken, accessToken);
}

async function linkPendingGoogleProviderIfNeeded(user, emailHint = '') {
  const pending = readPendingGoogleLink();
  if (!pending) return { linked: false, reason: 'none' };

  const normalizedUserEmail = String(emailHint || user?.email || '').trim().toLowerCase();
  if (!normalizedUserEmail) return { linked: false, reason: 'missing_user_email' };
  if (pending.email !== normalizedUserEmail) return { linked: false, reason: 'email_mismatch' };

  const credential = buildGoogleCredentialFromPending(pending);
  if (!credential) {
    clearPendingGoogleLink();
    return { linked: false, reason: 'invalid_pending_credential' };
  }

  try {
    await linkWithCredential(user, credential);
    clearPendingGoogleLink();
    return { linked: true, reason: 'linked' };
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'auth/provider-already-linked' || code === 'auth/credential-already-in-use') {
      clearPendingGoogleLink();
      return { linked: true, reason: 'already_linked' };
    }
    return { linked: false, reason: code || 'link_failed', error };
  }
}

export function initFirebase() {
  try {
    if (getApps().length === 0) {
      if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
        initializeApp(window.FIREBASE_CONFIG);
      } else {
        // Not configured yet
        return { initialized: false };
      }
    }
    // Ensure we can get the app
    getApp();
    initialized = true;
  // Quiet noisy Firestore logs in production
  try { setLogLevel('error'); } catch {}
    // Optional: connect to local emulators when enabled
    try { connectEmulatorsIfEnabled(); } catch {}
    return { initialized: true };
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return { initialized: false, error: e };
  }
}

function connectEmulatorsIfEnabled() {
  if (typeof window === 'undefined') return;
  // Opt-in flag to avoid accidental emulator connections in prod
  const useEmu = Boolean(window.USE_FIREBASE_EMULATORS);
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (!useEmu || !isLocal) return;
  try { connectAuthEmulator(getAuth(), 'http://localhost:9099', { disableWarnings: true }); } catch {}
  try { connectFirestoreEmulator(getFirestore(), 'localhost', 8080); } catch {}
  try { connectStorageEmulator(getStorage(), 'localhost', 9199); } catch {}
}

const _adminBootstrapLastAttempt = new Map();
const ADMIN_BOOTSTRAP_COOLDOWN_MS = 15000;
const _claimVendorLastAttempt = new Map();
const CLAIM_VENDOR_COOLDOWN_MS = 20000;
async function ensureAdminBootstrap(email, options = {}) {
  const rawEmail = String(options.rawEmail || email || '').trim();
  const normalizedEmail = rawEmail.toLowerCase();
  if (!normalizedEmail) return { ok: false, reason: 'missing_email' };

  const now = Date.now();
  const lastAttempt = _adminBootstrapLastAttempt.get(normalizedEmail) || 0;
  const force = options && options.force === true;
  if (!force && now - lastAttempt < ADMIN_BOOTSTRAP_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown' };
  }
  _adminBootstrapLastAttempt.set(normalizedEmail, now);

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return { ok: false, reason: 'no_user' };
    const token = await currentUser.getIdToken();
    if (!token) return { ok: false, reason: 'no_token' };

    const res = await fetch('/.netlify/functions/ensure-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: normalizedEmail,
        emailRaw: rawEmail || normalizedEmail
      })
    });

    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, reason: 'network_error', error };
  }
}

export function observeAuth(callback) {
  try {
    const auth = getAuth();
    return onAuthStateChanged(auth, callback);
  } catch (e) {
    return () => {};
  }
}

/**
 * Claim/link vendor profile(s) for the current user by email.
 * Used for imported vendors that were created before ownerUid was linked.
 */
export async function claimVendorAccountByEmail(options = {}) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      return { success: false, reason: 'not_signed_in' };
    }

    const showId = options.showId || getCurrentShowIdSync();
    const cacheKey = `${user.uid}:${showId}`;
    const force = options && options.force === true;
    const now = Date.now();
    const lastAttempt = _claimVendorLastAttempt.get(cacheKey) || 0;
    if (!force && now - lastAttempt < CLAIM_VENDOR_COOLDOWN_MS) {
      return { success: false, reason: 'cooldown', skipped: true };
    }
    _claimVendorLastAttempt.set(cacheKey, now);

    const token = await user.getIdToken();
    const response = await fetch('/.netlify/functions/claim-vendor-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ showId })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      _claimVendorLastAttempt.delete(cacheKey);
      return { success: false, error: payload.error || `Claim failed (${response.status})` };
    }
    return payload;
  } catch (error) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const showId = options.showId || getCurrentShowIdSync();
      if (user?.uid) {
        _claimVendorLastAttempt.delete(`${user.uid}:${showId}`);
      }
    } catch {}
    return { success: false, error: error?.message || 'Claim failed' };
  }
}

function rememberAuthReturnRoute() {
  try {
    const route = (window.location.hash || '#/more').replace(/^#/, '') || '/more';
    localStorage.setItem(AUTH_RETURN_HASH_KEY, route.startsWith('/') ? route : '/more');
  } catch {}
}

function shouldUseRedirectFallback(error) {
  const code = String(error?.code || '');
  return code === 'auth/popup-blocked'
    || code === 'auth/operation-not-supported-in-this-environment'
    || code === 'auth/web-storage-unsupported'
    || code === 'auth/unauthorized-domain';
}

export async function processAuthRedirectResult() {
  try {
    const auth = getAuth();
    return await getRedirectResult(auth);
  } catch (error) {
    stashPendingGoogleLinkFromError(error);
    console.warn('[Auth] Redirect sign-in result failed:', error);
    return null;
  }
}

export async function signInWithGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // iOS browsers handle redirect auth more reliably than popups.
  if (isIOSDevice()) {
    rememberAuthReturnRoute();
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    stashPendingGoogleLinkFromError(error);
    if (shouldUseRedirectFallback(error)) {
      rememberAuthReturnRoute();
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

// Sign in with Apple (works on iOS and web)
export async function signInWithApple() {
  const auth = getAuth();
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');

  if (isIOSDevice()) {
    rememberAuthReturnRoute();
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (shouldUseRedirectFallback(error)) {
      rememberAuthReturnRoute();
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

// Check if running on iOS
export function isIOSDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Check if biometric authentication is available
export async function isBiometricAvailable() {
  if (typeof window === 'undefined') return false;
  // Check for Web Authentication API (WebAuthn)
  if (!window.PublicKeyCredential) return false;
  try {
    // Check if platform authenticator (Face ID, Touch ID, Windows Hello) is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

// Store credentials for biometric login
const BIOMETRIC_STORAGE_KEY = 'winnpro_biometric_credential';

// Save credential ID for biometric re-login
export function saveBiometricCredential(credentialId, userEmail) {
  try {
    localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify({
      credentialId: credentialId,
      userEmail: userEmail,
      timestamp: Date.now()
    }));
    return true;
  } catch {
    return false;
  }
}

// Get saved biometric credential
export function getSavedBiometricCredential() {
  try {
    const saved = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Clear biometric credential
export function clearBiometricCredential() {
  try {
    localStorage.removeItem(BIOMETRIC_STORAGE_KEY);
  } catch {}
}

// Register biometric credential (Face ID / Touch ID)
export async function registerBiometric(userEmail) {
  if (!await isBiometricAvailable()) {
    throw new Error('Biometric authentication not available');
  }
  
  // Generate a random challenge
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  // Create credential options for platform authenticator (Face ID / Touch ID)
  const createCredentialOptions = {
    publicKey: {
      challenge: challenge,
      rp: {
        name: 'WinnPro Shows',
        id: window.location.hostname
      },
      user: {
        id: new TextEncoder().encode(userEmail),
        name: userEmail,
        displayName: userEmail.split('@')[0]
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use Face ID / Touch ID
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  };
  
  try {
    const credential = await navigator.credentials.create(createCredentialOptions);
    if (credential) {
      // Convert credential ID to base64 for storage
      const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      saveBiometricCredential(credentialIdBase64, userEmail);
      return { success: true, credentialId: credentialIdBase64 };
    }
    throw new Error('Failed to create credential');
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw error;
  }
}

// Authenticate with biometric (Face ID / Touch ID)
export async function authenticateWithBiometric() {
  const saved = getSavedBiometricCredential();
  if (!saved) {
    throw new Error('No biometric credential saved');
  }
  
  if (!await isBiometricAvailable()) {
    throw new Error('Biometric authentication not available');
  }
  
  // Generate a random challenge
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  // Convert stored credential ID back to ArrayBuffer
  const credentialIdArray = Uint8Array.from(atob(saved.credentialId), c => c.charCodeAt(0));
  
  const getCredentialOptions = {
    publicKey: {
      challenge: challenge,
      allowCredentials: [{
        id: credentialIdArray,
        type: 'public-key',
        transports: ['internal']
      }],
      userVerification: 'required',
      timeout: 60000
    }
  };
  
  try {
    const assertion = await navigator.credentials.get(getCredentialOptions);
    if (assertion) {
      // Biometric verified successfully - return the stored email
      return { success: true, email: saved.userEmail };
    }
    throw new Error('Biometric verification failed');
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    throw error;
  }
}

export async function signOutUser() {
  const auth = getAuth();
  return signOut(auth);
}

export async function signInAnonymouslyUser() {
  const auth = getAuth();
  return signInAnonymously(auth);
}

export async function signInWithEmailPassword(email, password) {
  const auth = getAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  const linkResult = await linkPendingGoogleProviderIfNeeded(result?.user, email);
  try {
    result.googleProviderLinked = linkResult.linked === true;
    result.googleProviderLinkReason = String(linkResult.reason || '');
  } catch {}
  return result;
}

export async function signUpWithEmailPassword(email, password) {
  const auth = getAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const linkResult = await linkPendingGoogleProviderIfNeeded(result?.user, email);
  try {
    result.googleProviderLinked = linkResult.linked === true;
    result.googleProviderLinkReason = String(linkResult.reason || '');
  } catch {}
  return result;
}

// Convenience getters
export function getDb() {
  return getFirestore();
}
export function getAuthInstance() {
  return getAuth();
}

// Storage helpers
export function getStorageInstance() {
  return getStorage();
}

/**
 * Upload a File/Blob to Firebase Storage and return a download URL.
 * @param {File|Blob} file
 * @param {string} pathPrefix e.g. 'attendees', 'vendors'
 * @param {(progress:number)=>void} onProgress optional progress callback 0..100
 * @param {{requireAuthenticatedUser?: boolean, allowAnonymousFallback?: boolean}} options
 * @returns {Promise<string>} downloadURL
 */
export async function uploadImage(file, pathPrefix = 'uploads', onProgress, options = {}) {
  if (!file) throw new Error('No file');
  const auth = getAuth();
  const requireAuthenticatedUser = options?.requireAuthenticatedUser === true;
  const allowAnonymousFallback = options?.allowAnonymousFallback !== false;

  // Give Firebase auth a moment to hydrate an existing signed-in user before fallback.
  try {
    if (!auth.currentUser) {
      const start = Date.now();
      while (!auth.currentUser && Date.now() - start < 2500) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
    if (!auth.currentUser && !requireAuthenticatedUser && allowAnonymousFallback) {
      await signInAnonymouslyUser();
      // wait briefly for auth state to settle
      const start = Date.now();
      while (!auth.currentUser && Date.now() - start < 2000) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  } catch (e) {
    console.warn('Anonymous sign-in failed before upload', e);
  }
  if (!auth.currentUser) {
    try {
      const { Toast } = await import('./utils/ui.js');
      Toast('Please sign in (or enable Anonymous Auth) to upload images.');
    } catch {}
    throw new Error('Auth required for upload');
  }
  if (requireAuthenticatedUser && auth.currentUser.isAnonymous) {
    throw new Error('Please sign in with your account before uploading.');
  }
  const uid = auth?.currentUser?.uid || 'anon';
  const safeName = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  // Determine path layout for attendee uploads based on global flag
  // 'attendees-root' => attendees/{uid}/...
  // default           => users/{uid}/attendees/...
  const layout = (typeof window !== 'undefined' && window.STORAGE_ATTENDEE_LAYOUT) || 'users-attendees';
  const normalizedPrefix = String(pathPrefix || 'uploads').replace(/^\/+|\/+$/g, '');
  let basePrefix;
  if (normalizedPrefix === 'attendees') {
    basePrefix = layout === 'attendees-root' ? `attendees/${uid}` : `users/${uid}/attendees`;
  } else if (normalizedPrefix.startsWith('vendors/')) {
    const parts = normalizedPrefix.split('/').filter(Boolean);
    basePrefix = parts.length === 2 ? `${normalizedPrefix}/${uid}` : normalizedPrefix;
  } else {
    basePrefix = normalizedPrefix || 'uploads';
  }
  const path = `${basePrefix}/${Date.now()}_${safeName}`;
  const st = getStorage();
  const ref = storageRef(st, path);
  // Detect content type: prefer file.type, fall back to extension, then default to jpeg
  let detectedType = file.type;
  if (!detectedType || detectedType === 'application/octet-stream') {
    const ext = (safeName.split('.').pop() || '').toLowerCase();
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
    detectedType = mimeMap[ext] || 'image/jpeg';
  }
  const metadata = { contentType: detectedType };

  const startResumable = () => new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, file, metadata);
    task.on('state_changed', (snap) => {
      if (typeof onProgress === 'function') {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        try { onProgress(pct); } catch {}
      }
    }, (err) => reject(err), async () => {
      try {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      } catch (e) { reject(e); }
    });
  });

  const startSimple = async () => {
    // Fallback: simple upload without resumable header (often passes with stricter CORS)
    await uploadBytes(ref, file, metadata);
    return await getDownloadURL(ref);
  };

  // If a global flag is set, bypass resumable uploads to avoid CORS preflight
  // Default to simple upload for now to avoid 412 CORS errors
  const forceSimple = (typeof window !== 'undefined' && (window.FORCE_SIMPLE_UPLOAD === true || window.FORCE_SIMPLE_UPLOAD !== false));
  try {
    if (forceSimple) {
      if (typeof onProgress === 'function') { try { onProgress(0); } catch {} }
      const url = await startSimple();
      if (typeof onProgress === 'function') { try { onProgress(100); } catch {} }
      return url;
    }
    return await startResumable();
  } catch (err) {
    // Detect likely CORS/preflight issues and fallback to simple upload
    const m = String(err && (err.message || err.code || err)).toLowerCase();
    const looksLikeCors = m.includes('preflight') || m.includes('cors') || m.includes('err_failed') || m.includes('blocked') || m.includes('412');
    if (looksLikeCors) {
      try {
        if (typeof onProgress === 'function') { try { onProgress(0); } catch {} }
        const url = await startSimple();
        if (typeof onProgress === 'function') { try { onProgress(100); } catch {} }
        return url;
      } catch (e2) {
        try {
          const { Toast } = await import('./utils/ui.js');
          Toast(`Upload failed (CORS/simple): ${e2.message || e2.code || 'error'}`);
        } catch {}
        throw e2;
      }
    }
    try {
      const { Toast } = await import('./utils/ui.js');
      const msg = (err && (err.message || err.code)) ? `Upload failed: ${err.message || err.code}` : 'Upload failed.';
      Toast(msg);
    } catch {}
    throw err;
  }
}

export async function loadUserPreferences(uid) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data() || {};
    return data.preferences || {};
  } catch (e) {
    console.warn('Failed to load preferences', e);
    return {};
  }
}

export async function saveUserPreferences(uid, prefs) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { preferences: prefs }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to save preferences', e);
    return false;
  }
}

// Fetch approved vendors from Firestore (filtered by current show)
export async function fetchApprovedVendors(options = {}) {
  try {
    const db = getFirestore();
    const showId = options.showId || getCurrentShowIdSync();
    
    // Query for approved vendors
    const q = query(collection(db, 'vendors'), where('approved', '==', true));
    const snap = await getDocs(q);
    const results = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // Filter by show - legacy data without showId belongs to default show
      const docShowId = data.showId || DEFAULT_SHOW_ID_FALLBACK;
      if (!showId || docShowId === showId) {
        results.push({ id: docSnap.id, ...data });
      }
    });
    return mergeDuplicateVendors(results, { fallbackShowId: showId || DEFAULT_SHOW_ID_FALLBACK }).vendors;
  } catch (e) {
    console.warn('Failed to fetch vendors', e);
    return [];
  }
}

// --- Additional Firestore helpers (scaffolding) ---

// Users
export async function createOrUpdateUserDoc(uid, data = {}) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to upsert user doc', e);
    return false;
  }
}

// Vendors
export async function getVendorById(vendorId) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'vendors', vendorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const direct = { id: snap.id, ...snap.data() };
    const emailRaw = String(direct.contactEmail || direct.email || '').trim();
    const email = emailRaw.toLowerCase();
    const emailVariants = Array.from(new Set([emailRaw, email].filter(Boolean)));
    const showId = String(direct.showId || DEFAULT_SHOW_ID_FALLBACK).trim() || DEFAULT_SHOW_ID_FALLBACK;

    if (!emailVariants.length) return direct;

    const group = [];
    for (const variant of emailVariants) {
      const byEmail = await getDocs(query(collection(db, 'vendors'), where('contactEmail', '==', variant), qLimit(100)));
      byEmail.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const docShowId = String(data.showId || DEFAULT_SHOW_ID_FALLBACK).trim() || DEFAULT_SHOW_ID_FALLBACK;
        if (docShowId === showId) group.push({ id: docSnap.id, ...data });
      });
    }

    const uniqueGroup = Array.from(new Map(group.map(v => [v.id, v])).values());
    if (!uniqueGroup.length) return direct;

    const merged = mergeDuplicateVendors(uniqueGroup, { fallbackShowId: showId }).vendors;
    return findVendorByAnyId(merged, vendorId) || merged[0] || direct;
  } catch (e) {
    console.warn('Failed to get vendor', e);
    return null;
  }
}

export async function updateVendorProfile(vendorId, profileUpdate = {}) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'vendors', vendorId);
    await updateDoc(ref, { profile: profileUpdate, updatedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.warn('Failed to update vendor profile', e);
    return false;
  }
}

// Attendees
export async function createAttendee(ownerUid, data = {}) {
  try {
    const db = getFirestore();
    const col = collection(db, 'attendees');
    const payload = {
      ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...data
    };
    const res = await addDoc(col, payload);
    return { id: res.id, ...payload };
  } catch (e) {
    console.warn('Failed to create attendee', e);
    return null;
  }
}

export async function updateAttendee(attendeeId, data = {}) {
  try {
    const db = getFirestore();
    const ref = doc(db, 'attendees', attendeeId);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to update attendee', e);
    return false;
  }
}

export async function findAttendeeByShortCode(shortCode) {
  try {
    const db = getFirestore();
    const qy = query(collection(db, 'attendees'), where('shortCode', '==', shortCode), qLimit(1));
    const snap = await getDocs(qy);
    let result = null;
    snap.forEach(docSnap => { result = { id: docSnap.id, ...docSnap.data() }; });
    return result;
  } catch (e) {
    console.warn('Failed to find attendee by code', e);
    return null;
  }
}

// Leads
export async function createLead(attendeeId, vendorId, createdByUid, data = {}, options = {}) {
  try {
    const db = getFirestore();
    const col = collection(db, 'leads');
    // Get show info synchronously from localStorage
    const currentShowId = getCurrentShowIdSync();
    let currentShowName = '';
    try {
      const cachedShows = localStorage.getItem('winnpro_shows_cache');
      if (cachedShows) {
        const shows = JSON.parse(cachedShows);
        currentShowName = shows[currentShowId]?.shortName || '';
      }
    } catch {}
    const payload = {
      attendeeId,
      vendorId,
      createdByUid,
      showId: currentShowId,
      showName: currentShowName,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
      ...data
    };
    const res = await addDoc(col, payload);
    
    // Send email notification if enabled and vendor email provided
    if (options.sendEmail !== false && options.vendorEmail) {
      try {
        const { sendNewLeadEmail } = await import('./utils/email.js');
        sendNewLeadEmail(options.vendorEmail, {
          vendorBusinessName: options.vendorBusinessName || 'Your Business',
          attendeeName: data.attendeeName || data.name || 'A visitor',
          attendeeEmail: data.attendeeEmail || data.email,
          attendeePhone: data.attendeePhone || data.phone,
          notes: data.notes
        }).catch(err => console.warn('Lead email notification failed:', err));
      } catch (emailErr) {
        console.warn('Could not send lead email:', emailErr);
      }
    }
    
    return { id: res.id, ...payload };
  } catch (e) {
    console.warn('Failed to create lead', e);
    return null;
  }
}

export async function getLeadsForVendor(vendorId, max = 50, options = {}) {
  try {
    const db = getFirestore();
    const showId = options.showId === undefined ? getCurrentShowIdSync() : options.showId;
    const includeLegacyVendorField = options.includeLegacyVendorField !== false;

    const matchesShow = (data) => {
      const docShowId = data.showId || DEFAULT_SHOW_ID_FALLBACK;
      return !showId || docShowId === showId;
    };

    const readByVendorField = async (fieldName, preferOrdered = true) => {
      if (!fieldName) return [];
      const clauses = [where(fieldName, '==', vendorId)];
      let snap = null;
      if (preferOrdered) {
        try {
          snap = await getDocs(query(collection(db, 'leads'), ...clauses, orderBy('createdAt', 'desc'), qLimit(max)));
        } catch (orderedErr) {
          console.warn(`Lead query fallback (${fieldName}) without orderBy due to query error:`, orderedErr?.message || orderedErr);
        }
      }
      if (!snap) {
        snap = await getDocs(query(collection(db, 'leads'), ...clauses, qLimit(max)));
      }
      const rows = [];
      snap.forEach(d => {
        const data = d.data() || {};
        if (matchesShow(data)) rows.push({ id: d.id, ...data });
      });
      return rows;
    };

    const combined = [];
    const byVendorId = await readByVendorField('vendorId', true);
    combined.push(...byVendorId);

    if (includeLegacyVendorField) {
      const legacyRows = await readByVendorField('vendor_id', false);
      combined.push(...legacyRows);
    }

    const deduped = Array.from(
      combined.reduce((acc, row) => {
        if (row && row.id) acc.set(row.id, row);
        return acc;
      }, new Map()).values()
    );

    deduped.sort((a, b) => {
      const aTs = a.timestamp || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || 0) || 0);
      const bTs = b.timestamp || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || 0) || 0);
      return bTs - aTs;
    });

    return deduped.slice(0, max);
  } catch (e) {
    console.warn('Failed to fetch leads for vendor', e);
    return [];
  }
}

export async function getLeadsForAttendee(attendeeId, max = 50) {
  try {
    const db = getFirestore();
    const qy = query(collection(db, 'leads'), where('attendeeId', '==', attendeeId), orderBy('createdAt', 'desc'), qLimit(max));
    const snap = await getDocs(qy);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
  } catch (e) {
    console.warn('Failed to fetch leads for attendee', e);
    return [];
  }
}

// Saved vendors helpers on attendee doc (array field 'savedVendors')
export async function addSavedVendor(attendeeId, vendorId) {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, 'attendees', attendeeId), { savedVendors: arrayUnion(vendorId), updatedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.warn('Failed to add saved vendor', e);
    return false;
  }
}
export async function removeSavedVendor(attendeeId, vendorId) {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, 'attendees', attendeeId), { savedVendors: arrayRemove(vendorId), updatedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.warn('Failed to remove saved vendor', e);
    return false;
  }
}

// Aggregate counts for admin dashboard
export async function getCollectionCount(path) {
  try {
    const db = getFirestore();
    const coll = collection(db, path);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count || 0;
  } catch (e) {
    return 0;
  }
}

// --- Admin management (by email) ---
const CANONICAL_ADMIN_COLLECTION_ID = 'adminEmails';
const LEGACY_ADMIN_COLLECTION_IDS = ['admin-users', 'admin_users'];
const ADMIN_COLLECTION_IDS = [CANONICAL_ADMIN_COLLECTION_ID, ...LEGACY_ADMIN_COLLECTION_IDS];

function normalizeEmailVariants(email) {
  const raw = String(email || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return [];
  return raw === lower ? [lower] : [lower, raw];
}

async function hasAdminDocByEmail(db, email, collections = ADMIN_COLLECTION_IDS) {
  const variants = normalizeEmailVariants(email);
  if (!variants.length) return false;

  for (const coll of collections) {
    for (const value of variants) {
      try {
        const snap = await getDoc(doc(db, coll, value));
        if (snap.exists()) return true;
      } catch {}
    }
  }
  return false;
}

async function hasExactAdminDocByEmail(db, email, collections = ADMIN_COLLECTION_IDS) {
  const value = String(email || '').trim();
  if (!value) return false;

  for (const coll of collections) {
    try {
      const snap = await getDoc(doc(db, coll, value));
      if (snap.exists()) return true;
    } catch {}
  }
  return false;
}

async function isConfiguredAdminEmail(email) {
  const lowerEmail = String(email || '').trim().toLowerCase();
  if (!lowerEmail) return false;

  const configured = new Set();

  // Runtime override (optional)
  if (typeof window !== 'undefined' && Array.isArray(window.ADMIN_EMAILS)) {
    window.ADMIN_EMAILS.forEach((value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized) configured.add(normalized);
    });
  }

  // Build-time/default config
  try {
    const { ADMIN_EMAILS } = await import('./config.js');
    if (Array.isArray(ADMIN_EMAILS)) {
      ADMIN_EMAILS.forEach((value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized) configured.add(normalized);
      });
    }
  } catch {}

  return configured.has(lowerEmail);
}

export async function isAdminEmail(email, options = {}) {
  if (!email) return false;

  const rawEmail = String(email).trim();
  const lowerEmail = rawEmail.toLowerCase();
  const forceBootstrap = !!options.forceBootstrap;
  const strictRegistry = !!options.strictRegistry;
  const localConfiguredAdmin = await isConfiguredAdminEmail(lowerEmail);

  try {
    const db = getFirestore();
    const hasRegistryAdmin = (targetEmail, collections = ADMIN_COLLECTION_IDS) => (
      strictRegistry
        ? hasExactAdminDocByEmail(db, targetEmail, collections)
        : hasAdminDocByEmail(db, targetEmail, collections)
    );

    // Canonical collection controls current Firestore/Storage rules access.
    if (await hasRegistryAdmin(rawEmail, [CANONICAL_ADMIN_COLLECTION_ID])) {
      return true;
    }

    // If user is recognized as admin in config or legacy collections, force bootstrap migration
    // so canonical adminEmails/{email} gets created for rules-based access.
    const legacyAdmin = await hasRegistryAdmin(rawEmail, LEGACY_ADMIN_COLLECTION_IDS);

    let bootstrapResult = null;
    try {
      bootstrapResult = await ensureAdminBootstrap(lowerEmail, { force: forceBootstrap, rawEmail });
    } catch {}

    // Re-check canonical after bootstrap.
    if (await hasRegistryAdmin(rawEmail, [CANONICAL_ADMIN_COLLECTION_ID])) {
      return true;
    }

    // Legacy collections remain valid sources of admin access.
    if (legacyAdmin || await hasRegistryAdmin(rawEmail, LEGACY_ADMIN_COLLECTION_IDS)) {
      return true;
    }

    // Explicit local config (window.ADMIN_EMAILS / js/config.js) stays authoritative for UI access.
    if (localConfiguredAdmin && !strictRegistry) {
      return true;
    }

    // Backend allowlist accepted this email, but canonical doc may still be propagating.
    if (bootstrapResult && bootstrapResult.ok) {
      return strictRegistry
        ? await hasExactAdminDocByEmail(db, rawEmail, ADMIN_COLLECTION_IDS)
        : true;
    }

    return false;
  } catch {
    return strictRegistry ? false : localConfiguredAdmin;
  }
}

export async function addAdminEmail(email, addedBy = null) {
  if (!email) return false;
  try {
    const db = getFirestore();
    const normalizedEmail = String(email).toLowerCase().trim();
    await Promise.all(
      ADMIN_COLLECTION_IDS.map((coll) => (
        setDoc(doc(db, coll, normalizedEmail), { addedAt: serverTimestamp(), addedBy: addedBy || null }, { merge: true })
      ))
    );
    return true;
  } catch {
    return false;
  }
}

export async function removeAdminEmail(email) {
  if (!email) return false;
  try {
    const db = getFirestore();
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const normalizedEmail = String(email).toLowerCase().trim();
    await Promise.all(
      ADMIN_COLLECTION_IDS.map((coll) => deleteDoc(doc(db, coll, normalizedEmail)).catch(() => {}))
    );
    return true;
  } catch {
    return false;
  }
}

export async function listAdminEmails() {
  try {
    const db = getFirestore();
    const unique = new Map();
    for (const coll of ADMIN_COLLECTION_IDS) {
      try {
        const snap = await getDocs(collection(db, coll));
        snap.forEach(d => {
          const key = String(d.id || '').toLowerCase();
          if (!key) return;
          if (!unique.has(key)) unique.set(key, { id: key, ...d.data() });
        });
      } catch {}
    }
    return Array.from(unique.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  } catch {
    return [];
  }
}

// Admin-only: purge an arbitrary user's data
// Deletes attendees (and their leads), deletes leads created by the user, deletes vendors owned by the user,
// removes adminEmails entry for the user's email, and deletes the users/{uid} document.
// Options: { deleteVendorsByEmail?: boolean } also deletes vendors where contactEmail == email (use with caution).
export async function adminPurgeUser(uid, email = null, options = {}) {
  const db = getFirestore();
  const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
  const out = { attendeesDeleted: 0, leadsDeleted: 0, vendorsDeleted: 0, userDeleted: false, adminEmailRemoved: false };
  // 1) Attendees owned by user
  try {
    const qAtt = fsm.query(fsm.collection(db, 'attendees'), fsm.where('ownerUid', '==', uid));
    const asnap = await fsm.getDocs(qAtt);
    const attendeeIds = [];
    asnap.forEach(d => attendeeIds.push(d.id));
    // Delete leads for each attendee, then the attendee
    for (const attId of attendeeIds) {
      try {
        const qLeads = fsm.query(fsm.collection(db, 'leads'), fsm.where('attendeeId','==', attId));
        const lsnap = await fsm.getDocs(qLeads);
        const deletes = [];
        lsnap.forEach(d => { deletes.push(fsm.deleteDoc(fsm.doc(db, 'leads', d.id))); out.leadsDeleted++; });
        await Promise.allSettled(deletes);
      } catch {}
      try { await fsm.deleteDoc(fsm.doc(db, 'attendees', attId)); out.attendeesDeleted++; } catch {}
    }
  } catch {}
  // 2) Leads created by user (idempotent if already removed above)
  try {
    const qCreated = fsm.query(fsm.collection(db, 'leads'), fsm.where('createdByUid','==', uid));
    const csnap = await fsm.getDocs(qCreated);
    const deletes = [];
    csnap.forEach(d => { deletes.push(fsm.deleteDoc(fsm.doc(db, 'leads', d.id))); out.leadsDeleted++; });
    await Promise.allSettled(deletes);
  } catch {}
  // 3) Vendors owned by user
  try {
    const qVen = fsm.query(fsm.collection(db, 'vendors'), fsm.where('ownerUid','==', uid));
    const vsnap = await fsm.getDocs(qVen);
    const deletes = [];
    vsnap.forEach(d => { deletes.push(fsm.deleteDoc(fsm.doc(db, 'vendors', d.id))); out.vendorsDeleted++; });
    await Promise.allSettled(deletes);
  } catch {}
  // 3b) Optional: delete vendors by contactEmail match
  try {
    if (options.deleteVendorsByEmail && email) {
      const e = String(email).trim();
      const variants = Array.from(new Set([e, e.toLowerCase(), e.toUpperCase()]));
      for (const v of variants) {
        const q = fsm.query(fsm.collection(db, 'vendors'), fsm.where('contactEmail','==', v));
        const snap = await fsm.getDocs(q).catch(()=>null);
        if (!snap) continue;
        const dels = [];
        snap.forEach(d => { dels.push(fsm.deleteDoc(fsm.doc(db, 'vendors', d.id))); out.vendorsDeleted++; });
        await Promise.allSettled(dels);
      }
    }
  } catch {}
  // 4) Remove adminEmails entry
  try {
    if (email) {
      await fsm.deleteDoc(fsm.doc(db, 'adminEmails', String(email).toLowerCase()));
      out.adminEmailRemoved = true;
    }
  } catch {}
  // 5) Delete users/{uid}
  try { await fsm.deleteDoc(fsm.doc(db, 'users', uid)); out.userDeleted = true; } catch {}
  return out;
}

// Danger zone: fully purge the currently signed-in user's app data, unlink any owned vendors, and attempt to delete the Auth user.
// This will:
// - Delete attendees owned by the user (and their leads)
// - Delete leads created by the user
// - Unlink vendors (clear ownerUid) owned by the user
// - Delete the users/{uid} document
// - Attempt to delete the Auth user (may require recent login)
// - Finally, sign the user out
export async function purgeCurrentUser() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return { ok: false, message: 'Not signed in' };
    // Signal to the app to skip auto user upserts during purge
    try { window.__PURGING_ACCOUNT__ = true; } catch {}
    const db = getFirestore();
    const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const uid = user.uid;
    // 1) Collect attendees for this user
    let attendeeIds = [];
    try {
      const qAtt = fsm.query(fsm.collection(db, 'attendees'), fsm.where('ownerUid', '==', uid));
      const asnap = await fsm.getDocs(qAtt);
      asnap.forEach(d => attendeeIds.push(d.id));
    } catch {}
    // 2) Delete leads tied to these attendees
    for (const attId of attendeeIds) {
      try {
        const qLeads = fsm.query(fsm.collection(db, 'leads'), fsm.where('attendeeId','==', attId));
        const lsnap = await fsm.getDocs(qLeads);
        const deletions = [];
        lsnap.forEach(d => deletions.push(fsm.deleteDoc(fsm.doc(db, 'leads', d.id))));
        await Promise.allSettled(deletions);
      } catch {}
    }
    // 3) Delete leads created by this user (may overlap with above; deletions are idempotent)
    try {
      const qCreated = fsm.query(fsm.collection(db, 'leads'), fsm.where('createdByUid','==', uid));
      const csnap = await fsm.getDocs(qCreated);
      const deletions = [];
      csnap.forEach(d => deletions.push(fsm.deleteDoc(fsm.doc(db, 'leads', d.id))));
      await Promise.allSettled(deletions);
    } catch {}
    // 4) Delete attendees
    for (const attId of attendeeIds) {
      try { await fsm.deleteDoc(fsm.doc(db, 'attendees', attId)); } catch {}
    }
    // 5) Unlink any vendors owned by this user
    try {
      const qVen = fsm.query(fsm.collection(db, 'vendors'), fsm.where('ownerUid','==', uid));
      const vsnap = await fsm.getDocs(qVen);
      const updates = [];
      vsnap.forEach(d => updates.push(fsm.updateDoc(fsm.doc(db, 'vendors', d.id), { ownerUid: null, ownerRemovedAt: fsm.serverTimestamp() })));
      await Promise.allSettled(updates);
    } catch {}
    // 6) Remove from admin allowlist if present
    try {
      const email = String(user.email||'').toLowerCase();
      if (email) {
        const ref = fsm.doc(db, 'adminEmails', email);
        await (await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js")).deleteDoc(ref).catch(()=>{});
      }
    } catch {}
    // 7) Delete users/{uid}
    try { await fsm.deleteDoc(fsm.doc(db, 'users', uid)); } catch {}
    // 8) Attempt to delete the Auth user; may require recent login
    let authDeleted = false;
    try { await fbDeleteUser(user); authDeleted = true; } catch (e) { authDeleted = false; }
    // 9) Sign out regardless
    try { await signOut(getAuth()); } catch {}
    return { ok: true, authDeleted };
  } catch (e) {
    return { ok: false, message: e?.message || 'Unknown error' };
  } finally {
    // Allow future upserts after purge completes
    try { setTimeout(() => { window.__PURGING_ACCOUNT__ = false; }, 3000); } catch {}
  }
}
