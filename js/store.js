/**
 * @typedef {"attendee"|"vendor"|"admin"|null} Role
 * @typedef {"Kitchen"|"Bath"|"Landscaping"|"Windows"|"Solar"|"Roofing"|"Flooring"|"HVAC"|"Painting"} Interest
 * @typedef {"Building a home"|"Renovating"|"Needing new gutters"|"Floor plans"|"Kitchen remodel"|"Bathroom remodel"|"Solar installation"|"Roofing repair"|"HVAC upgrade"|"Landscaping"|"Windows replacement"|"Just browsing"} VisitingReason
 * @typedef {Object} AttendeeCard
 * @property {string=} profileImage
 * @property {string=} backgroundImage
 * @property {number=} familySize
 * @property {VisitingReason[]} visitingReasons
 * @property {string=} bio
 * @property {string=} location
 * @typedef {Object} Attendee
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string=} phone
 * @property {string=} zip
 * @property {Interest[]} interests
 * @property {string=} qrData
 * @property {string} shortCode
 * @property {boolean=} consentEmail
 * @property {boolean=} consentSMS
 * @property {string[]=} savedBusinessCards
 * @property {AttendeeCard=} card
 * @typedef {Object} VendorProfile
 * @property {string=} introVideo
 * @property {string=} homeShowVideo
 * @property {string=} website
 * @property {string=} facebook
 * @property {string=} instagram
 * @property {string=} twitter
 * @property {string=} linkedin
 * @property {string=} tiktok
 * @property {string=} youtube
 * @property {string=} description
 * @property {string=} specialOffer
 * @property {string=} backgroundImage
 * @property {string=} profileImage
 * @property {string=} businessCardFront
 * @property {string=} businessCardBack
 * @property {string=} bio
 * @property {string[]=} selectedSocials
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} booth
 * @property {string} contactEmail
 * @property {string=} contactPhone
 * @property {string=} logoUrl
 * @property {boolean=} approved
 * @property {boolean=} verified
 * @property {any=} assets
 * @property {VendorProfile=} profile
 * @property {{x:number,y:number}=} boothCoordinates
 * @typedef {Object} Lead
 * @property {string} id
 * @property {string} attendee_id
 * @property {string} vendor_id
 * @property {number} timestamp
 * @property {string=} notes
 * @property {"card_share"|"manual"=} exchangeMethod
 * @property {boolean=} emailSent
 * @property {boolean=} cardShared
 */
import { mergeDuplicateVendors, findVendorByAnyId, vendorSourceIds } from "./utils/vendorMerge.js";

const LS_KEY = "homeshow:v1";
const OLD_LS_KEY = "leadpass:v1";

// Synchronous helpers to get show info without circular dependency
// shows.js imports firebase modules dynamically, so we avoid importing it at top level
function getCurrentShowIdSync() {
  try {
    const stored = localStorage.getItem('winnpro_selected_show');
    return stored || 'putnam-spring-2026';
  } catch {
    return 'putnam-spring-2026';
  }
}

function getCurrentShowNameSync() {
  try {
    const showId = getCurrentShowIdSync();
    const cachedShows = localStorage.getItem('winnpro_shows_cache');
    if (cachedShows) {
      const shows = JSON.parse(cachedShows);
      return shows[showId]?.shortName || '';
    }
  } catch {}
  return '';
}

// Cached Firestore SDK module — avoids repeated dynamic imports on every call
let _fsm = null;
async function getFsm() {
  if (!_fsm) _fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
  return _fsm;
}

let listeners = [];
let _firestoreUnsubs = []; // Track Firestore onSnapshot unsubscribers for cleanup
let state = {
  role: null,
  walkthroughs: { general: false, attendee: false, vendor: false, admin: false },
  hasOnboarded: false,
  isOnline: true,
  vendorLoginId: null,
  theme: "dark",
  user: null, // { uid, displayName, email, photoURL }
  isAdmin: false,
  myVendor: null, // { id, approved } if user owns a vendor
  attendees: [],
  vendors: [],
  leads: [],
  savedVendorsByAttendee: {},
  pendingQueue: []
};

function hydrateStore() {
  let raw = localStorage.getItem(LS_KEY);
  // Migrate from old key if present
  if (!raw) {
    const oldRaw = localStorage.getItem(OLD_LS_KEY);
    if (oldRaw) {
      try {
        localStorage.setItem(LS_KEY, oldRaw);
        // Optionally keep old key for downgrade safety; comment next line to preserve
        // localStorage.removeItem(OLD_LS_KEY);
        raw = oldRaw;
      } catch (e) {
        // Fallback: keep using old key this session
        raw = oldRaw;
      }
    }
  }
  if (raw) {
    state = { ...state, ...JSON.parse(raw) };
    if (Array.isArray(state.vendors) && state.vendors.length) {
      state.vendors = mergeDuplicateVendors(state.vendors, { fallbackShowId: getCurrentShowIdSync() }).vendors;
    }
  } else {
    // Start empty; hydrate from Firestore when available
    state.attendees = [];
    state.vendors = [];
    state.leads = [];
  }
  // Initialize Firebase (if configured) and observe auth state
  try {
    Promise.all([
      import("./firebase.js"),
    ]).then(async ([firebaseMod]) => {
      const { initFirebase, observeAuth, loadUserPreferences, createOrUpdateUserDoc, getDb } = firebaseMod;
      try { initFirebase(); } catch {}
      try {
        observeAuth(async (user) => {
          if (user) {
            const previousUid = state.user?.uid || null;
            if (previousUid && previousUid !== user.uid) {
              // Prevent stale vendor impersonation across account switches.
              state.vendorLoginId = null;
              state.myVendor = null;
              state.attendees = [];
              state.leads = [];
            }

            state.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email || (Array.isArray(user.providerData) ? (user.providerData.find(p => p?.email)?.email || null) : null),
              photoURL: user.photoURL,
              isAnonymous: !!user.isAnonymous,
              providerEmails: Array.isArray(user.providerData)
                ? Array.from(new Set(user.providerData.map(p => p?.email).filter(Boolean)))
                : []
            };
            state.myVendor = null;
             
            // Set a default role immediately so UI doesn't hang
            // Will be refined below based on admin/vendor checks
            if (!state.role) {
              state.role = 'attendee';
            }
            
            // Determine admin via Firestore (adminEmails collection + bootstrap fallback)
            await refreshAdminAccess({ forceBootstrap: true, silent: true });
            // Ensure user doc exists/updated
            try {
              await createOrUpdateUserDoc(user.uid, {
                email: user.email || null,
                displayName: user.displayName || null,
                role: state.isAdmin ? 'admin' : 'visitor'
              });
            } catch {}
            // Auto-link imported vendor records by matching contact email.
            try {
              const { claimVendorAccountByEmail } = await import("./firebase.js");
              await claimVendorAccountByEmail({ showId: getCurrentShowIdSync(), silent: true });
            } catch {}
            // Determine if user owns a vendor
            try {
              const db = getDb();
              const { collection, query, where, getDocs, limit } = await getFsm();
              const q = query(collection(db, 'vendors'), where('ownerUid', '==', user.uid), limit(1));
              const snap = await getDocs(q);
              let mine = null;
              snap.forEach(d => {
                const data = d.data() || {};
                mine = {
                  id: d.id,
                  approved: !!data.approved,
                  ownerUid: data.ownerUid || null,
                  name: data.name || '',
                  contactEmail: data.contactEmail || ''
                };
              });
              state.myVendor = mine;
            } catch {
              state.myVendor = null;
            }
            // Load attendee data owned by this user
            let attendeeRole = null;
            try {
              const db = getDb();
              const { collection, query, where, getDocs, limit } = await getFsm();
              const q = query(collection(db, 'attendees'), where('ownerUid', '==', user.uid), limit(1));
              const snap = await getDocs(q);
              let att = null;
              snap.forEach(d => { att = { id: d.id, ...d.data() }; });
              if (att) {
                state.attendees = [att];
                attendeeRole = att.role; // Check if role is stored in attendee record
              }
            } catch {}
            
            // Update role assignment to respect stored role in attendee record
            if (state.isAdmin) {
              state.role = 'admin';
            } else if (state.myVendor) {
              // Vendor ownership takes precedence over a stale attendee role.
              state.role = 'vendor';
            } else if (attendeeRole && (attendeeRole === 'vendor' || attendeeRole === 'attendee')) {
              // Use stored role from attendee record if valid
              state.role = attendeeRole;
            } else {
              // Fallback to automatic detection
              state.role = state.myVendor ? 'vendor' : 'attendee';
            }

            // Non-admins should only keep a vendor session for their owned vendor.
            if (!state.isAdmin) {
              const ownedVendorId = state.myVendor?.id || null;
              state.vendorLoginId = ownedVendorId;
            }
            
            // Load per-user preferences (e.g., theme)
            try {
              const prefs = await loadUserPreferences(user.uid);
              if (prefs && prefs.theme && prefs.theme !== state.theme) {
                state.theme = prefs.theme;
              }
            } catch {}
          } else {
            // User signed out — clean up Firestore listeners
            detachListeners();
            state.user = null;
            state.isAdmin = false;
            state.myVendor = null;
            state.vendorLoginId = null;
            state.attendees = [];
            state.leads = [];
            // When signed out, reflect Guest in header by clearing role
            state.role = null;
          }
          persist();
          notify();
        });
      } catch {}
      // Live vendors subscription (approved only, capped at 500)
      try {
        const db = getDb();
        const { collection, query, where, onSnapshot, limit } = await getFsm();
        const q = query(collection(db, 'vendors'), where('approved', '==', true), limit(500));
        const unsub = onSnapshot(q, (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          // Filter by current show — legacy vendors without showId belong to default show
          const currentShow = getCurrentShowIdSync();
          const filtered = list.filter(v => (v.showId || 'putnam-spring-2026') === currentShow);
          const merged = mergeDuplicateVendors(filtered, { fallbackShowId: currentShow });
          state.vendors = merged.vendors;
          persist();
          notify();
        });
        _firestoreUnsubs.push(unsub);
      } catch {}
      // Real-time attendee doc for current user
      try {
        const db = getDb();
        const { collection, query, where, limit, onSnapshot } = await getFsm();
        const attach = (uid) => {
          const q = query(collection(db, 'attendees'), where('ownerUid', '==', uid), limit(1));
          const unsub = onSnapshot(q, (snap) => {
            let att = null;
            snap.forEach(d => { att = { id: d.id, ...d.data() }; });
            if (att) {
              state.attendees = [att];
              // Mirror saved vendors into legacy map for UI that still uses it
              state.savedVendorsByAttendee[att.id] = att.savedVendors || [];
              persist();
              notify();
            }
          });
          _firestoreUnsubs.push(unsub);
        };
        // If already authenticated
        if (state.user?.uid) attach(state.user.uid);
        // Also attach when auth changes (observeAuth above will set state.user)
      } catch {}
      // Real-time vendor leads for my vendor (if owner), capped at 500
      try {
        const db = getDb();
        const { collection, query, where, onSnapshot, orderBy, limit } = await getFsm();
        const attachLeads = (vendorId) => {
          const q = query(collection(db, 'leads'), where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'), limit(500));
          const unsub = onSnapshot(q, (snap) => {
            const rows = [];
            snap.forEach(d => {
              const ld = d.data();
              rows.push({ id: d.id, attendee_id: ld.attendeeId, vendor_id: ld.vendorId, timestamp: ld.timestamp, exchangeMethod: ld.exchangeMethod, emailSent: ld.emailSent, cardShared: ld.cardShared });
            });
            // Merge into local state (replace vendor-owned subset)
            const other = state.leads.filter(l => l.vendor_id !== vendorId);
            state.leads = [...other, ...rows];
            persist();
            notify();
          });
          _firestoreUnsubs.push(unsub);
        };
        if (state.myVendor?.id) attachLeads(state.myVendor.id);
      } catch {}
    });
  } catch {}
  notify();
}
/** Detach all Firestore real-time listeners (call on logout). */
function detachListeners() {
  _firestoreUnsubs.forEach(fn => { try { fn(); } catch {} });
  _firestoreUnsubs = [];
}
function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    role: state.role,
    hasOnboarded: state.hasOnboarded,
    isOnline: state.isOnline,
    vendorLoginId: state.vendorLoginId,
    theme: state.theme,
    attendees: state.attendees,
    vendors: state.vendors,
    leads: state.leads,
    savedVendorsByAttendee: state.savedVendorsByAttendee,
    pendingQueue: state.pendingQueue
  }));
}
function notify() {
  listeners.forEach(fn => fn(state));
}
function subscribe(fn) {
  listeners.push(fn);
}
function getState() {
  return state;
}
async function setRole(role) {
  // Only admins can set admin role; non-admins cannot escalate to vendor unless they own one
  if (role === 'admin' && !state.isAdmin) return;
  if (role === 'vendor' && !state.isAdmin) {
    if (!state.myVendor || !state.myVendor.approved) return; // require approved vendor ownership
  }
  
  state.role = role;
  
  // Persist role to attendee record if user is logged in
  if (state.user && !state.user.isAnonymous && state.attendees.length > 0) {
    try {
      const { getDb } = await import("./firebase.js");
      const db = getDb();
      const { doc, updateDoc } = await getFsm();
      
      const attendeeId = state.attendees[0].id;
      await updateDoc(doc(db, 'attendees', attendeeId), {
        role: role,
        roleUpdatedAt: new Date()
      });
    } catch (error) {
      console.warn('Could not persist role to attendee record:', error);
    }
  }
  
  persist();
  notify();
}
function setOnboarded() {
  state.hasOnboarded = true;
  persist();
  notify();
}
function setOnline(val) {
  state.isOnline = val;
  persist();
  notify();
}
function setTheme(theme) {
  state.theme = theme;
  persist();
  notify();
  // Persist per-user preference when authenticated
  if (state.user && state.user.uid) {
    import("./firebase.js").then(({ saveUserPreferences }) => {
      saveUserPreferences(state.user.uid, { theme }).catch(() => {});
    });
  }
}
function getTheme() {
  return state.theme || "light";
}
// Walkthrough helpers
function hasSeenWalkthrough(key = 'general') {
  try { return !!(state.walkthroughs && state.walkthroughs[key]); } catch { return false; }
}
function setWalkthroughSeen(key = 'general', seen = true) {
  try {
    state.walkthroughs = { ...(state.walkthroughs || {}), [key]: !!seen };
    persist();
    notify();
    // Persist to user preferences if signed in
    if (state.user && state.user.uid) {
      import('./firebase.js').then(({ saveUserPreferences }) => {
        const prefs = { walkthroughs: state.walkthroughs };
        saveUserPreferences(state.user.uid, prefs).catch(()=>{});
      }).catch(()=>{});
    }
  } catch {}
}
// Auth/user management
function setUser(user) {
  state.user = user;
  persist();
  notify();
}
function clearUser() {
  state.user = null;
  persist();
  notify();
}
function vendorLogin(vendorId) {
  state.vendorLoginId = vendorId;
  // Preserve admin capabilities even when selecting a vendor context.
  state.role = state.isAdmin ? "admin" : "vendor";
  persist();
  notify();
}
function vendorLogout() {
  state.vendorLoginId = null;
  if (state.role === "vendor") state.role = state.isAdmin ? "admin" : null;
  persist();
  notify();
}

async function refreshAdminAccess(options = {}) {
  const forceBootstrap = !!options.forceBootstrap;
  const silent = !!options.silent;
  const allowDowngrade = options.allowDowngrade === true;
  const prevIsAdmin = !!state.isAdmin;
  const prevRole = state.role;
  const currentRole = state.role;

  if (!state.user || state.user.isAnonymous) {
    state.isAdmin = false;
    if (currentRole === 'admin') {
      state.role = state.myVendor ? 'vendor' : 'attendee';
    }
    const changed = (prevIsAdmin !== !!state.isAdmin) || (prevRole !== state.role);
    if (!silent && changed) {
      persist();
      notify();
    }
    return false;
  }

  let email = String(state.user.email || '').trim().toLowerCase();
  if (!email && Array.isArray(state.user.providerEmails) && state.user.providerEmails.length) {
    email = String(state.user.providerEmails[0] || '').trim().toLowerCase();
  }

  if (!email) {
    try {
      const { getAuthInstance } = await import('./firebase.js');
      const auth = getAuthInstance();
      const current = auth.currentUser;
      const fromProfile = String(current?.email || '').trim().toLowerCase();
      if (fromProfile) {
        email = fromProfile;
      } else if (current) {
        const token = await current.getIdTokenResult();
        const fromClaim = String(token?.claims?.email || '').trim().toLowerCase();
        if (fromClaim) email = fromClaim;
      }
    } catch {}
  }

  let isAdmin = false;
  try {
    const { isAdminEmail } = await import("./firebase.js");
    if (email) {
      isAdmin = await isAdminEmail(email, { forceBootstrap });
      if (!isAdmin) {
        isAdmin = await isAdminEmail(email);
      }
    }
  } catch {}

  if (isAdmin) {
    state.isAdmin = true;
  } else if (prevIsAdmin && !allowDowngrade) {
    // Keep existing admin access during transient bootstrap/network failures.
    state.isAdmin = true;
  } else {
    state.isAdmin = false;
  }
  if (state.isAdmin && currentRole !== 'admin') {
    state.role = 'admin';
  } else if (!state.isAdmin && currentRole === 'admin') {
    state.role = state.myVendor ? 'vendor' : 'attendee';
  }

  const changed = (prevIsAdmin !== !!state.isAdmin) || (prevRole !== state.role);
  if (!silent && changed) {
    persist();
    notify();
  }
  return state.isAdmin;
}
async function upsertAttendee(payload) {
  // Require a non-guest account
  if (!ensureAccountOrPrompt('create or update your card')) return null;
  // Try Firestore when authenticated
  if (state.user && state.user.uid) {
    try {
      // Current attendee in local state (first one for now)
      let att = state.attendees[0] || null;
      const ensureShort = (v) => v || genShortCode();
      const card = {
        profileImage: payload.card?.profileImage ?? att?.card?.profileImage ?? "",
        profileImageX: payload.card?.profileImageX ?? att?.card?.profileImageX ?? 50,
        profileImageY: payload.card?.profileImageY ?? att?.card?.profileImageY ?? 50,
        backgroundImage: payload.card?.backgroundImage ?? att?.card?.backgroundImage ?? "",
        familySize: payload.card?.familySize ?? att?.card?.familySize ?? 1,
        visitingReasons: payload.card?.visitingReasons ?? att?.card?.visitingReasons ?? [],
        bio: payload.card?.bio ?? att?.card?.bio ?? "",
        location: payload.card?.location ?? att?.card?.location ?? ""
      };
      const base = {
        ownerUid: state.user.uid,
        showId: getCurrentShowIdSync(),
        showName: getCurrentShowNameSync(),
        name: payload.name ?? att?.name ?? '',
        email: payload.email ?? att?.email ?? '',
        phone: payload.phone ?? att?.phone ?? '',
        zip: payload.zip ?? att?.zip ?? '',
        interests: payload.interests ?? att?.interests ?? [],
        consentEmail: payload.consentEmail ?? att?.consentEmail ?? false,
        consentSMS: payload.consentSMS ?? att?.consentSMS ?? false,
        card
      };
      const { getDb } = await import('./firebase.js');
      const db = getDb();
      const { collection, query, where, getDocs, limit, addDoc, doc, setDoc, serverTimestamp } = await getFsm();
      // Look for existing attendee by ownerUid
      let remoteId = null;
      try {
        const q = query(collection(db, 'attendees'), where('ownerUid', '==', state.user.uid), limit(1));
        const snap = await getDocs(q);
        snap.forEach(d => { remoteId = d.id; att = { id: d.id, ...d.data() }; });
      } catch {}
      if (!remoteId) {
        // Create new attendee
        const payloadDoc = { ...base, shortCode: ensureShort(att?.shortCode), qrData: ensureShort(att?.qrData), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const res = await addDoc(collection(db, 'attendees'), payloadDoc);
        remoteId = res.id;
        att = { id: remoteId, ...payloadDoc };
      } else {
        // Merge update
        const ref = doc(db, 'attendees', remoteId);
        await setDoc(ref, { ...base, updatedAt: serverTimestamp() }, { merge: true });
        att = { id: remoteId, ...att, ...base };
      }
      state.attendees = [att];
      persist();
      notify();
      return att;
    } catch (e) {
      // Fall through to local
    }
  }
  // Local fallback
  let att = state.attendees[0] || null;
  if (!att) {
    att = {
      id: uuid(),
      shortCode: genShortCode(),
      qrData: genShortCode(),
      savedBusinessCards: [],
      ...payload,
      card: payload.card || {
        profileImage: "",
        profileImageX: 50,
        profileImageY: 50,
        backgroundImage: "",
        familySize: 1,
        visitingReasons: [],
        bio: "",
        location: ""
      }
    };
    state.attendees = [att];
  } else {
    Object.assign(att, payload);
    state.attendees = [att];
  }
  persist();
  notify();
  return att;
}
async function saveVendorForAttendee(attendeeId, vendorId) {
  if (!ensureAccountOrPrompt('save a vendor')) return false;
  if (!state.savedVendorsByAttendee[attendeeId]) state.savedVendorsByAttendee[attendeeId] = [];
  if (!state.savedVendorsByAttendee[attendeeId].includes(vendorId)) state.savedVendorsByAttendee[attendeeId].push(vendorId);
  // Persist to Firestore when possible (attendee doc has array field 'savedVendors')
  try {
    if (state.user && state.user.uid) {
      const { addSavedVendor } = await import('./firebase.js');
      await addSavedVendor(attendeeId, vendorId);
    }
  } catch (err) {
    console.warn('Failed to save vendor to Firestore:', err.message);
  }
  persist();
  notify();
}
function saveBusinessCard(attendeeId, vendorId) {
  const att = state.attendees.find(a => a.id === attendeeId);
  if (att && !att.savedBusinessCards.includes(vendorId)) att.savedBusinessCards.push(vendorId);
  persist();
  notify();
}
async function addLead(attendeeId, vendorId, method = "card_share", emailOptions = {}) {
  if (!ensureAccountOrPrompt(method === 'card_share' ? 'share your card' : 'record a lead')) return null;

  // Duplicate lead prevention — skip if same attendee+vendor pair exists within last 60s
  const now = Date.now();
  const duplicate = state.leads.find(
    l => l.attendee_id === attendeeId && l.vendor_id === vendorId && (now - l.timestamp) < 60000
  );
  if (duplicate) {
    console.warn('Duplicate lead suppressed (same pair within 60s)');
    return duplicate;
  }

  const lead = {
    id: uuid(),
    attendee_id: attendeeId,
    vendor_id: vendorId,
    timestamp: now,
    exchangeMethod: method,
    emailSent: false,
    cardShared: method === "card_share"
  };

  // Normalize email in options before sending
  if (emailOptions.vendorEmail) {
    emailOptions.vendorEmail = String(emailOptions.vendorEmail).trim().toLowerCase();
  }

  // Try Firestore write if authenticated
  if (state.user && state.user.uid) {
    try {
      const { createLead } = await import('./firebase.js');
      await createLead(attendeeId, vendorId, state.user.uid, {
        exchangeMethod: method,
        emailSent: lead.emailSent,
        cardShared: lead.cardShared,
        ...emailOptions.data
      }, {
        sendEmail: emailOptions.sendEmail,
        vendorEmail: emailOptions.vendorEmail,
        vendorBusinessName: emailOptions.vendorBusinessName
      });
    } catch (err) {
      console.error('Failed to create lead in Firestore:', err.message);
      // Still create local lead so the UI reflects it — will sync on next load
    }
  }
  state.leads.push(lead);
  saveVendorForAttendee(attendeeId, vendorId);
  if (method === "card_share") {
    sendExchangeEmails(attendeeId, vendorId);
  }
  persist();
  notify();
  return lead;
}
function addLeadNote(leadId, note) {
  const lead = state.leads.find(l => l.id === leadId);
  if (lead) lead.notes = note;
  persist();
  notify();
}
function sendExchangeEmails(attendeeId, vendorId) {
  state.leads.forEach(l => {
    if (l.attendee_id === attendeeId && l.vendor_id === vendorId) l.emailSent = true;
  });
  persist();
  notify();
}
function findAttendeeByShortCode(code) {
  return state.attendees.find(a => a.shortCode === code);
}
function enqueueScan(shortCode, vendorId) {
  state.pendingQueue.push({ attendeeShortCode: shortCode, scannedAt: Date.now(), vendorId });
  persist();
  notify();
}
function dequeueAll() {
  if (!state.isOnline) return;
  state.pendingQueue.forEach(async (item) => {
    let att = findAttendeeByShortCode(item.attendeeShortCode);
    if (!att) {
      try {
        const { findAttendeeByShortCode: findRemote } = await import('./firebase.js');
        const found = await findRemote(item.attendeeShortCode);
        if (found) {
          att = { id: found.id, ...found };
        }
      } catch {}
    }
    if (att) await addLead(att.id, item.vendorId, "manual");
  });
  state.pendingQueue = [];
  persist();
  notify();
}
function currentVendor() {
  return findVendorByAnyId(state.vendors || [], state.vendorLoginId);
}
function leadsForVendor(vendorId) {
  const vendor = findVendorByAnyId(state.vendors || [], vendorId);
  const sourceIds = vendor ? vendorSourceIds(vendor) : [vendorId];
  return state.leads.filter(l => sourceIds.includes(l.vendor_id));
}
function topVendorsByLeadCount() {
  const counts = {};
  state.leads.forEach(l => {
    counts[l.vendor_id] = (counts[l.vendor_id] || 0) + 1;
  });
  return state.vendors
    .map(v => ({ ...v, leadCount: vendorSourceIds(v).reduce((sum, id) => sum + (counts[id] || 0), 0) }))
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 5);
}
async function shareBusinessCard(attendeeId, vendorId, emailOptions = {}) {
  const attendee = state.attendees.find(a => a.id === attendeeId);
  if (!attendee?.card) return false;
  const result = await addLead(attendeeId, vendorId, "card_share", emailOptions);
  return !!result;
}
// UUID and short code helpers
import { uuid, genShortCode } from "./utils/id.js";

// --- Auth gating helper ---
function ensureAccountOrPrompt(action = 'continue') {
  const isGuest = !state.user || state.user.isAnonymous === true;
  if (!isGuest) return true;
  // Lazy-load UI and auth helpers to show a modal prompt
  Promise.all([
    import('./utils/ui.js'),
    import('./firebase.js')
  ]).then(([ui, auth]) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="text-center">
        <div class="text-xl font-semibold mb-2">Sign in required</div>
        <div class="text-sm text-gray-600 mb-4">You need an account to ${action}. Create one in seconds.</div>
        <div class="grid grid-cols-1 gap-2">
          <button id="auth-google" class="brand-bg px-4 py-2 rounded">Continue with Google</button>
          <button id="auth-email" class="glass-button px-4 py-2 rounded">Sign in / Sign up</button>
        </div>
      </div>
    `;
    ui.Modal(wrapper);
    const close = () => ui.closeModal();
    const googleBtn = wrapper.querySelector('#auth-google');
    const emailBtn = wrapper.querySelector('#auth-email');
    if (googleBtn) googleBtn.onclick = async () => { try { await auth.signInWithGoogle(); close(); } catch {} };
    if (emailBtn) emailBtn.onclick = () => { window.location.hash = '/more'; close(); };
  }).catch(() => {
    // Fallback: just navigate to profile auth screen
    window.location.hash = '/more';
  });
  return false;
}

export {
  hydrateStore,
  detachListeners,
  subscribe,
  getState,
  setRole,
  setOnboarded,
  setOnline,
  setTheme,
  getTheme,
  hasSeenWalkthrough,
  setWalkthroughSeen,
  setUser,
  clearUser,
  vendorLogin,
  vendorLogout,
  upsertAttendee,
  saveVendorForAttendee,
  saveBusinessCard,
  addLead,
  addLeadNote,
  sendExchangeEmails,
  findAttendeeByShortCode,
  enqueueScan,
  dequeueAll,
  currentVendor,
  leadsForVendor,
  topVendorsByLeadCount,
  shareBusinessCard,
  refreshAdminAccess
};
