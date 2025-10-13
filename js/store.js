/**
 * @typedef {"attendee"|"vendor"|"organizer"|null} Role
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

const LS_KEY = "homeshow:v1";
const OLD_LS_KEY = "leadpass:v1";
let listeners = [];
let state = {
  role: null,
  hasOnboarded: false,
  isOnline: true,
  vendorLoginId: null,
  theme: "light",
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
      const { initFirebase, observeAuth, loadUserPreferences, createOrUpdateUserDoc, getDb, isAdminEmail } = firebaseMod;
      try { initFirebase(); } catch {}
      try {
        observeAuth(async (user) => {
          if (user) {
            state.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              isAnonymous: !!user.isAnonymous
            };
            // Determine admin via Firestore (adminEmails collection)
            try {
              state.isAdmin = await isAdminEmail(state.user.email);
            } catch {
              state.isAdmin = false;
            }
            // Ensure user doc exists/updated
            try {
              await createOrUpdateUserDoc(user.uid, {
                email: user.email || null,
                displayName: user.displayName || null,
                role: state.isAdmin ? 'organizer' : 'visitor'
              });
            } catch {}
            // Determine if user owns a vendor
            try {
              const db = getDb();
              const { collection, query, where, getDocs, limit } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
              const q = query(collection(db, 'vendors'), where('ownerUid', '==', user.uid), limit(1));
              const snap = await getDocs(q);
              let mine = null;
              snap.forEach(d => { mine = { id: d.id, approved: !!d.data().approved }; });
              state.myVendor = mine;
              // If no explicit role chosen yet, infer one
              if (!state.role) {
                state.role = state.isAdmin ? 'organizer' : (mine ? 'vendor' : 'attendee');
              }
            } catch {}
            // Load attendee data owned by this user
            try {
              const db = getDb();
              const { collection, query, where, getDocs, limit } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
              const q = query(collection(db, 'attendees'), where('ownerUid', '==', user.uid), limit(1));
              const snap = await getDocs(q);
              let att = null;
              snap.forEach(d => { att = { id: d.id, ...d.data() }; });
              if (att) {
                state.attendees = [att];
              }
            } catch {}
            // Load per-user preferences (e.g., theme)
            try {
              const prefs = await loadUserPreferences(user.uid);
              if (prefs && prefs.theme && prefs.theme !== state.theme) {
                state.theme = prefs.theme;
              }
            } catch {}
          } else {
            state.user = null;
            state.isAdmin = false;
            state.myVendor = null;
          }
          persist();
          notify();
        });
      } catch {}
      // Live vendors subscription (approved only)
      try {
        const db = getDb();
        const { collection, query, where, onSnapshot, limit } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const q = query(collection(db, 'vendors'), where('approved', '==', true));
        onSnapshot(q, (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          state.vendors = list;
          persist();
          notify();
        });
      } catch {}
      // Real-time attendee doc for current user
      try {
        const db = getDb();
        const { collection, query, where, limit, onSnapshot } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const attach = (uid) => {
          const q = query(collection(db, 'attendees'), where('ownerUid', '==', uid), limit(1));
          onSnapshot(q, (snap) => {
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
        };
        // If already authenticated
        if (state.user?.uid) attach(state.user.uid);
        // Also attach when auth changes (observeAuth above will set state.user)
      } catch {}
      // Real-time vendor leads for my vendor (if owner)
      try {
        const db = getDb();
        const { collection, query, where, onSnapshot, orderBy } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const attachLeads = (vendorId) => {
          const q = query(collection(db, 'leads'), where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'));
          onSnapshot(q, (snap) => {
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
        };
        if (state.myVendor?.id) attachLeads(state.myVendor.id);
      } catch {}
    });
  } catch {}
  notify();
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
function setRole(role) {
  // Only admins can set organizer; non-admins cannot escalate to vendor unless they own one
  if (role === 'organizer' && !state.isAdmin) return;
  if (role === 'vendor' && !state.isAdmin) {
    if (!state.myVendor) return; // require ownership
  }
  state.role = role;
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
  state.role = "vendor";
  persist();
  notify();
}
function vendorLogout() {
  state.vendorLoginId = null;
  if (state.role === "vendor") state.role = null;
  persist();
  notify();
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
        backgroundImage: payload.card?.backgroundImage ?? att?.card?.backgroundImage ?? "",
        familySize: payload.card?.familySize ?? att?.card?.familySize ?? 1,
        visitingReasons: payload.card?.visitingReasons ?? att?.card?.visitingReasons ?? [],
        bio: payload.card?.bio ?? att?.card?.bio ?? "",
        location: payload.card?.location ?? att?.card?.location ?? ""
      };
      const base = {
        ownerUid: state.user.uid,
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
      const { collection, query, where, getDocs, limit, addDoc, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
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
  } catch {}
  persist();
  notify();
}
function saveBusinessCard(attendeeId, vendorId) {
  const att = state.attendees.find(a => a.id === attendeeId);
  if (att && !att.savedBusinessCards.includes(vendorId)) att.savedBusinessCards.push(vendorId);
  persist();
  notify();
}
async function addLead(attendeeId, vendorId, method = "card_share") {
  if (!ensureAccountOrPrompt(method === 'card_share' ? 'share your card' : 'record a lead')) return null;
  const lead = {
    id: uuid(),
    attendee_id: attendeeId,
    vendor_id: vendorId,
    timestamp: Date.now(),
    exchangeMethod: method,
    emailSent: false,
    cardShared: method === "card_share"
  };
  // Try Firestore write if authenticated
  if (state.user && state.user.uid) {
    try {
      const { createLead } = await import('./firebase.js');
      await createLead(attendeeId, vendorId, state.user.uid, {
        exchangeMethod: method,
        emailSent: lead.emailSent,
        cardShared: lead.cardShared
      });
    } catch {}
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
  return state.vendors.find(v => v.id === state.vendorLoginId);
}
function leadsForVendor(vendorId) {
  return state.leads.filter(l => l.vendor_id === vendorId);
}
function topVendorsByLeadCount() {
  const counts = {};
  state.leads.forEach(l => {
    counts[l.vendor_id] = (counts[l.vendor_id] || 0) + 1;
  });
  return state.vendors
    .map(v => ({ ...v, leadCount: counts[v.id] || 0 }))
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 5);
}
async function shareBusinessCard(attendeeId, vendorId) {
  const attendee = state.attendees.find(a => a.id === attendeeId);
  if (!attendee?.card) return false;
  await addLead(attendeeId, vendorId, "card_share");
  return true;
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
  subscribe,
  getState,
  setRole,
  setOnboarded,
  setOnline,
  setTheme,
  getTheme,
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
  shareBusinessCard
};
