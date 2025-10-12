// Firebase wrapper using modular SDK v12 (no bundler). Works with or without
// the index.html snippet initializing the app. If the app is not initialized,
// we will initialize it with window.FIREBASE_CONFIG if present.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, limit as qLimit, connectFirestoreEmulator, arrayUnion, arrayRemove, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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
export async function createLead(attendeeId, vendorId, createdByUid, data = {}) {
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
