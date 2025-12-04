// Firebase wrapper using modular SDK v12 (no bundler). Works with or without
// the index.html snippet initializing the app. If the app is not initialized,
// we will initialize it with window.FIREBASE_CONFIG if present.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, limit as qLimit, connectFirestoreEmulator, arrayUnion, arrayRemove, getCountFromServer, setLogLevel } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { deleteUser as fbDeleteUser } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytesResumable, uploadBytes, getDownloadURL, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

let initialized = false;

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

export function observeAuth(callback) {
  try {
    const auth = getAuth();
    return onAuthStateChanged(auth, callback);
  } catch (e) {
    return () => {};
  }
}

export async function signInWithGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
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
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmailPassword(email, password) {
  const auth = getAuth();
  return createUserWithEmailAndPassword(auth, email, password);
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
 * @returns {Promise<string>} downloadURL
 */
export async function uploadImage(file, pathPrefix = 'uploads', onProgress) {
  if (!file) throw new Error('No file');
  const auth = getAuth();
  // Ensure we have an authenticated user (anonymous is fine) before uploading
  try {
    if (!auth.currentUser) {
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
  const uid = auth?.currentUser?.uid || 'anon';
  const safeName = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  // Determine path layout for attendee uploads based on global flag
  // 'attendees-root' => attendees/{uid}/...
  // default           => users/{uid}/attendees/...
  const layout = (typeof window !== 'undefined' && window.STORAGE_ATTENDEE_LAYOUT) || 'users-attendees';
  const basePrefix = (pathPrefix === 'attendees')
    ? (layout === 'attendees-root' ? `attendees/${uid}` : `users/${uid}/attendees`)
    : pathPrefix;
  const path = `${basePrefix}/${Date.now()}_${safeName}`;
  const st = getStorage();
  const ref = storageRef(st, path);
  const metadata = { contentType: file.type || 'application/octet-stream' };

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
  const forceSimple = (typeof window !== 'undefined' && window.FORCE_SIMPLE_UPLOAD === true);
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
    const looksLikeCors = m.includes('preflight') || m.includes('cors') || m.includes('err_failed') || m.includes('blocked');
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

// Fetch approved vendors from Firestore
export async function fetchApprovedVendors() {
  try {
    const db = getFirestore();
    const q = query(collection(db, 'vendors'), where('approved', '==', true));
    const snap = await getDocs(q);
    const results = [];
    snap.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() });
    });
    return results;
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
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
    const payload = {
      attendeeId,
      vendorId,
      createdByUid,
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

export async function getLeadsForVendor(vendorId, max = 50) {
  try {
    const db = getFirestore();
    const qy = query(collection(db, 'leads'), where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'), qLimit(max));
    const snap = await getDocs(qy);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
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
export async function isAdminEmail(email) {
  if (!email) return false;
  
  // First check config.js admin emails
  try {
    const { ADMIN_EMAILS } = await import('./config.js');
    if (ADMIN_EMAILS && Array.isArray(ADMIN_EMAILS)) {
      const lowerEmail = email.toLowerCase();
      const hasConfigAdmin = ADMIN_EMAILS.some(adminEmail => 
        adminEmail && adminEmail.toLowerCase() === lowerEmail
      );
      if (hasConfigAdmin) {
        return true;
      }
    }
  } catch {}
  
  // Then check Firestore admin emails
  try {
    const db = getFirestore();
    const ref = doc(db, 'adminEmails', String(email).toLowerCase());
    const snap = await getDoc(ref);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function addAdminEmail(email, addedBy = null) {
  if (!email) return false;
  try {
    const db = getFirestore();
    const ref = doc(db, 'adminEmails', String(email).toLowerCase());
    await setDoc(ref, { addedAt: serverTimestamp(), addedBy: addedBy || null }, { merge: true });
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
    const ref = doc(db, 'adminEmails', String(email).toLowerCase());
    await deleteDoc(ref);
    return true;
  } catch {
    return false;
  }
}

export async function listAdminEmails() {
  try {
    const db = getFirestore();
    const snap = await getDocs(collection(db, 'adminEmails'));
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
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
