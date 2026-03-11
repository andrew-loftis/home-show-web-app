import { Modal, Toast } from "../utils/ui.js";
import { navigate } from "../router.js";
import { getState } from "../store.js";
import { CATEGORY_COLORS, getCategoryColor } from "../brand.js";
import { getCurrentShowId, getCurrentShow, getActiveShows, setCurrentShow, SHOWS } from "../shows.js";
import { mergeDuplicateVendors } from "../utils/vendorMerge.js";
import { getVendorContractUrl, VENDOR_CONTRACT_VERSION, VENDOR_CONTRACT_TERMS } from "../utils/vendorContract.js";

function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCanvasPoint(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.clientX ?? (evt.touches?.[0]?.clientX || 0);
  const clientY = evt.clientY ?? (evt.touches?.[0]?.clientY || 0);
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export default async function VendorRegistration(root) {
  const state = getState();
  if (!state.user) {
    root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Please sign in to register as a vendor.</div>`;
    return;
  }

  // Check if user is already a vendor (approved, pending, or denied)
  if (!state.user.isAnonymous) {
    try {
      const { getDb, claimVendorAccountByEmail } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs, limit } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const qOwner = query(vendorsRef, where('ownerUid', '==', state.user.uid), limit(20));
      let snapshot = await getDocs(qOwner);

      if (snapshot.empty) {
        await claimVendorAccountByEmail({ showId: getCurrentShowId(), silent: true });
        snapshot = await getDocs(qOwner);
      }
      
      if (!snapshot.empty) {
        const owned = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const vendorData = mergeDuplicateVendors(owned, { fallbackShowId: getCurrentShowId() }).vendors[0] || owned[0];
        // If vendor exists (approved, pending, or denied), redirect to dashboard
        // The dashboard will handle showing appropriate UI for each status
        const { default: VendorDashboard } = await import("./VendorDashboard.js");
        VendorDashboard(root);
        return;
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
      // Continue with registration form if error occurs
    }
  }
  
  // Allow both guests and attendees to register as vendors
  if (state.user.isAnonymous) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center p-8">
          <h2 class="text-xl font-bold mb-4 text-glass">Vendor Registration</h2>
          <p class="text-glass-secondary mb-6">Create an account to register as a vendor and showcase your business.</p>
          <div class="space-y-3">
            <button class="brand-bg w-full py-3" id="googleSignUpBtn">
              <ion-icon name="logo-google" class="mr-2"></ion-icon>
              Sign Up with Google
            </button>
            <button class="glass-button w-full py-3" onclick="window.location.hash='/more'">
              Sign Up with Email
            </button>
          </div>
          <p class="text-xs text-glass-secondary mt-4">Already have an account? <a href="#/more" class="text-blue-400">Sign in here</a></p>
        </div>
      </div>
    `;
    
    // Wire up Google sign up
    import("../firebase.js").then(({ signInWithGoogle }) => {
      const googleBtn = root.querySelector('#googleSignUpBtn');
      if (googleBtn) {
        googleBtn.onclick = async () => {
          try {
            await signInWithGoogle();
            // After successful sign in, reload the vendor registration
            setTimeout(() => VendorRegistration(root), 500);
          } catch (error) {
            console.error('Google sign up failed:', error);
          }
        };
      }
    });
    return;
  }
  // Restore draft from localStorage if the user navigated away mid-registration
  const DRAFT_KEY = 'winnpro_vendor_reg_draft';
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch {}
  let step = draft._step || 1;
  let data = { ...draft };
  delete data._step;
  data.contractSignatureMode = String(data.contractSignatureMode || 'draw').toLowerCase() === 'type' ? 'type' : 'draw';
  data.contractDrawnSignatureDataUrl = String(data.contractDrawnSignatureDataUrl || '').trim();
  data.contractTypedSignature = String(data.contractTypedSignature || '').trim();

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, _step: step })); } catch {}
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }
  // Expanded categories
  const categories = [
    "Kitchen","Bath","Landscaping","Windows","Doors","Solar","Roofing","Flooring","HVAC","Painting",
    "Plumbing","Electrical","Decks & Patios","Pools & Spas","Siding","Gutters","Insulation","Smart Home",
    "Security","Cabinets","Countertops","Tile & Stone","Appliances","Furniture","Interior Design","Lighting",
    "Garage","Fencing","Masonry","Concrete","Pest Control","Water Treatment","Home Cleaning","Remodeling",
    "General Contractor","Real Estate","Mortgage","Insurance","Energy Efficiency","Outdoor Living",
    "Garden/Nursery","Home Theater/AV","Food Truck","Other"
  ];
  // Comprehensive booth layout - representing actual venue layout
  const boothOptions = (() => {
    const rows = ['A','B','C','D','E','F','G','H'];
    const out = [];
    rows.forEach(r => { 
      for (let i=1; i<=15; i++) out.push(`${r}${i}`); 
    });
    return out;
  })();
  const BOOTH_PRICE = 950;
  const POWER_FEE = 75;
  const TABLE_FEE = 25;
  const CHAIR_FEE = 10;
  const contractUrl = getVendorContractUrl();
  
  // Track taken booths with their categories (for color coding)
  let takenBooths = new Set();
  let boothCategories = {}; // Map of boothId -> category
  
  // Load booth availability from boothReservations collection (source of truth)
  // Falls back to vendor docs for legacy data
  const loadBoothAvailability = async () => {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs, where, query } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

      takenBooths.clear();
      boothCategories = {};

      const showId = getCurrentShowId();

      // Primary source: boothReservations collection (written atomically during registration)
      try {
        const resQ = query(collection(db, 'boothReservations'), where('showId', '==', showId));
        const resSnap = await getDocs(resQ);
        resSnap.forEach(d => {
          const r = d.data();
          // Doc ID format: {showId}_{boothId}
          const boothId = d.id.replace(`${showId}_`, '');
          takenBooths.add(boothId);
          boothCategories[boothId] = r.category || 'General';
        });
      } catch {}

      // Also check vendor docs for legacy data (vendors created before boothReservations existed)
      const q = query(collection(db, 'vendors'), where('approved', '==', true));
      const snap = await getDocs(q);

      snap.forEach(doc => {
        const data = doc.data();
        if ((data.showId || 'putnam-spring-2026') !== showId) return;
        const category = data.category || 'General';

        if (data.booths && Array.isArray(data.booths)) {
          data.booths.forEach(booth => {
            if (!takenBooths.has(booth)) {
              takenBooths.add(booth);
              boothCategories[booth] = category;
            }
          });
        } else if (data.booth) {
          const booths = data.booth.split(',').map(b => b.trim());
          booths.forEach(booth => {
            if (!takenBooths.has(booth)) {
              takenBooths.add(booth);
              boothCategories[booth] = category;
            }
          });
        }
      });

      // Also check pending applications
      const pendingQ = query(collection(db, 'vendors'), where('approved', '==', false), where('status', '!=', 'denied'));
      const pendingSnap = await getDocs(pendingQ);

      pendingSnap.forEach(doc => {
        const data = doc.data();
        if ((data.showId || 'putnam-spring-2026') !== showId) return;
        const category = data.category || 'General';

        if (data.booths && Array.isArray(data.booths)) {
          data.booths.forEach(booth => {
            if (!takenBooths.has(booth)) {
              takenBooths.add(booth);
              boothCategories[booth] = category;
            }
          });
        } else if (data.booth) {
          const booths = data.booth.split(',').map(b => b.trim());
          booths.forEach(booth => {
            if (!takenBooths.has(booth)) {
              takenBooths.add(booth);
              boothCategories[booth] = category;
            }
          });
        }
      });

      return takenBooths;
    } catch (error) {
      console.error('Failed to load booth availability:', error);
      return new Set();
    }
  };

  const sendContractSignatureConfirmation = async (vendorId, signingData = {}) => {
    if (!vendorId || !state.user || state.user.isAnonymous) return { ok: false, reason: 'missing_vendor_or_user' };

    try {
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js");
      const currentUser = getAuth().currentUser;
      if (!currentUser) return { ok: false, reason: 'missing_auth_user' };
      const token = await currentUser.getIdToken();
      if (!token) return { ok: false, reason: 'missing_auth_token' };

      const response = await fetch('/.netlify/functions/sign-vendor-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorId,
          signerName: signingData.contractSignerName || '',
          signatureMode: signingData.contractSignatureMode || 'draw',
          typedSignature: signingData.contractSignatureMode === 'type' ? (signingData.contractTypedSignature || signingData.contractSignerName || '') : '',
          drawnSignatureDataUrl: signingData.contractSignatureMode === 'draw' ? (signingData.contractDrawnSignatureDataUrl || '') : '',
          contractVersion: VENDOR_CONTRACT_VERSION,
          contractUrl: signingData.contractUrl || contractUrl
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, reason: payload.error || `sign-vendor-contract failed (${response.status})` };
      }
      return {
        ok: true,
        warning: Array.isArray(payload.emailErrors) && payload.emailErrors.length ? 'Some confirmation emails need admin retry.' : ''
      };
    } catch (error) {
      return { ok: false, reason: error?.message || 'confirmation dispatch failed' };
    }
  };

  async function render() {
    // Load booth availability if on step 3
    if (step === 3) {
      await loadBoothAvailability();
    }
    
    root.innerHTML = `
      <div class="p-6 fade-in">
        <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/home'">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Cancel</span>
        </button>
        <h2 class="text-xl font-bold mb-2 text-glass">Vendor Registration</h2>
        <p class="text-glass-secondary text-sm mb-4">Step ${step} of 5: ${step===1?'Company Info':step===2?'Contact Details':step===3?'Booth Selection':step===4?'Additional Services':'Agreement + Contract'}</p>
        <div class="mb-4 flex gap-2 items-center">
          <div class="w-4 h-2 rounded ${step>=1?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=2?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=3?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=4?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=5?'bg-primary':'bg-white/20'}"></div>
        </div>
        <form id="regForm" class="glass-card p-4">
          ${step===1?`
            <div class="mb-4">
              <label class="block mb-1 font-medium text-glass">Which Show?</label>
              <select name="showId" required class="w-full p-3 rounded border border-white/20 bg-glass-surface text-glass">
                ${getActiveShows().map(s => `<option value="${s.id}" ${s.id === getCurrentShowId() ? 'selected' : ''} class="bg-glass-surface text-glass">${s.shortName} - ${s.displayDate}</option>`).join('')}
              </select>
              <p class="text-xs text-glass-secondary mt-1">Select the show you want to exhibit at</p>
            </div>
            <input name="companyName" required placeholder="Company Name" class="w-full mb-2 p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary">
            <input name="contactName" required placeholder="Contact Name" class="w-full mb-2 p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary">
          `:step===2?`
            <input name="email" required type="email" placeholder="Email" class="w-full mb-2 p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary">
            <input name="phone" placeholder="Phone" class="w-full mb-2 p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary">
          `:step===3?`
            <div class="mb-3">
              <div class="mb-1 font-medium text-glass">Category</div>
              <select name="category" required class="w-full mb-2 p-3 rounded border border-white/20 bg-glass-surface text-glass">
                <option value="" disabled selected class="bg-glass-surface text-glass">Select a category</option>
                ${categories.map(c => `<option value="${c}" class="bg-glass-surface text-glass">${c}</option>`).join("")}
              </select>
              <input name="customCategory" placeholder="If Other, enter your category" class="w-full mb-2 hidden p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary">
            </div>
            <div class="mb-3">
              <div class="mb-1 font-medium text-glass">Select Booth(s)</div>
              <div class="text-xs text-glass-secondary mb-2">$${BOOTH_PRICE.toLocaleString()} per booth. Colors show vendor types in surrounding booths (company names hidden for privacy).</div>
              ${step === 3 && takenBooths.size === 0 ? '<div class="text-center py-4 text-glass-secondary"><ion-icon name="hourglass-outline" class="animate-spin"></ion-icon> Loading booth availability...</div>' : ''}
              
              <!-- Visual Floor Plan -->
              <div class="mb-4 p-3 glass-card overflow-x-auto">
                <div class="text-xs text-glass-secondary mb-2 flex items-center gap-1">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  Tap to select available booths. Colors indicate vendor business types.
                </div>
                <div class="grid gap-1" style="grid-template-columns: repeat(15, minmax(0, 1fr)); min-width: 600px;">
                  ${['A','B','C','D','E','F','G','H'].flatMap(row => 
                    Array.from({length: 15}, (_, i) => {
                      const boothId = `${row}${i+1}`;
                      const isTaken = takenBooths.has(boothId);
                      const category = boothCategories[boothId];
                      const colorInfo = category ? getCategoryColor(category) : null;
                      const bgColor = isTaken ? (colorInfo?.hex || '#6b7280') : '';
                      
                      return `
                        <div class="booth-cell relative ${isTaken ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-brand'}" 
                             data-booth="${boothId}" 
                             data-category="${category || ''}"
                             style="${isTaken ? `background-color: ${bgColor}` : 'background-color: rgba(255,255,255,0.1)'}"
                             title="${isTaken ? `${boothId} - ${category || 'Taken'}` : `${boothId} - Available`}">
                          <div class="aspect-square flex items-center justify-center text-[9px] font-medium ${isTaken ? 'text-white' : 'text-glass'} rounded">
                            ${boothId}
                          </div>
                          ${!isTaken ? `<input type="checkbox" class="booth-choice absolute inset-0 opacity-0 cursor-pointer" value="${boothId}">` : ''}
                        </div>
                      `;
                    })
                  ).join("")}
                </div>
              </div>

              <!-- Category Legend for taken booths -->
              ${Object.keys(boothCategories).length > 0 ? `
                <div class="mb-3 p-3 glass-card">
                  <div class="text-xs font-medium text-glass mb-2 flex items-center gap-1">
                    <ion-icon name="color-palette-outline"></ion-icon>
                    Vendor Types Key (to help avoid competitors nearby)
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div class="flex items-center gap-1 text-xs">
                      <div class="w-3 h-3 rounded" style="background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2)"></div>
                      <span class="text-glass-secondary">Available</span>
                    </div>
                    ${[...new Set(Object.values(boothCategories))].map(cat => {
                      const colorInfo = getCategoryColor(cat);
                      return `
                        <div class="flex items-center gap-1 text-xs">
                          <div class="w-3 h-3 rounded" style="background-color: ${colorInfo.hex}"></div>
                          <span class="text-glass-secondary">${cat}</span>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
              ` : ''}

              <!-- Fallback list view for accessibility -->
              <details class="mb-3">
                <summary class="text-xs text-glass-secondary cursor-pointer hover:text-glass">Show list view</summary>
                <div class="grid grid-cols-4 md:grid-cols-8 gap-2 mt-2" id="boothGrid">
                  ${boothOptions.map(b => {
                    const isTaken = takenBooths.has(b);
                    const category = boothCategories[b];
                    const colorInfo = category ? getCategoryColor(category) : null;
                    return `
                      <label class="${isTaken ? 'cursor-not-allowed opacity-75' : 'glass-button hover:bg-white/20'} px-2 py-2 text-center text-sm flex items-center justify-center gap-1 transition-colors ${isTaken ? '' : 'cursor-pointer'}"
                             style="${isTaken ? `background-color: ${colorInfo?.hex || '#6b7280'}` : ''}"
                             title="${isTaken ? `Taken by: ${category || 'Unknown category'}` : 'Available'}">
                        <input type="checkbox" class="booth-choice" value="${b}" ${isTaken ? 'disabled' : ''}>
                        <span class="text-xs ${isTaken ? 'text-white' : ''}">${b}</span>
                      </label>
                    `;
                  }).join("")}
                </div>
              </details>
              <div class="mt-3 text-sm text-glass"><span class="font-medium">Selected:</span> <span id="selectedCount">0</span> booth(s) — <span class="font-medium">Total:</span> $<span id="totalPrice">0</span></div>
            </div>
          `:step===4?`
            <div class="mb-4">
              <h3 class="text-lg font-semibold mb-3 text-glass">Additional Services</h3>
              <div class="space-y-3">
                <label class="flex items-center justify-between p-3 glass-card cursor-pointer hover:bg-white/10 transition-colors">
                  <div>
                    <div class="font-medium text-glass">Electrical Power</div>
                    <div class="text-sm text-glass-secondary">110V standard outlet for your booth</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-glass">$${POWER_FEE}</span>
                    <input type="checkbox" name="needsPower" class="w-4 h-4">
                  </div>
                </label>
                
                <label class="flex items-center justify-between p-3 glass-card cursor-pointer hover:bg-white/10 transition-colors">
                  <div>
                    <div class="font-medium text-glass">Table Rental</div>
                    <div class="text-sm text-glass-secondary">6ft table with white tablecloth</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-glass">$${TABLE_FEE}</span>
                    <input type="checkbox" name="needsTable" class="w-4 h-4">
                  </div>
                </label>
                
                <div class="glass-card p-3">
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <div class="font-medium text-glass">Chairs</div>
                      <div class="text-sm text-glass-secondary">Additional chairs for your booth</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-glass">$${CHAIR_FEE} each</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm text-glass">Number of chairs:</label>
                    <input type="number" name="chairCount" min="0" max="10" value="0" class="w-16 px-2 py-1">
                  </div>
                </div>
              </div>
              
              <div class="mt-4 p-3 glass-card border border-primary/30">
                <div class="font-semibold text-primary mb-1">Cost Summary</div>
                <div class="text-sm space-y-1 text-glass" id="costBreakdown">
                  <div>Booth(s): <span id="boothCostSummary">$0</span></div>
                  <div>Power: <span id="powerCostSummary">$0</span></div>
                  <div>Table: <span id="tableCostSummary">$0</span></div>
                  <div>Chairs: <span id="chairCostSummary">$0</span></div>
                  <div class="border-t border-white/20 pt-1 font-semibold">Total: <span id="totalCostSummary">$0</span></div>
                </div>
              </div>
            </div>
          `:step===5?`
            <div class="mb-4">
              <h3 class="text-lg font-semibold mb-3 text-glass">Vendor Agreement</h3>
              <div class="mb-3 p-4 rounded-lg border-2 border-red-500/50 bg-red-500/10">
                <div class="flex items-start gap-3">
                  <ion-icon name="alert-circle" class="text-red-400 text-2xl mt-0.5"></ion-icon>
                  <div class="flex-1">
                    <div class="text-red-300 font-semibold">Contract Signature Required</div>
                    <p class="text-sm text-red-200 mt-1">You must complete an in-app digital signature to submit your vendor registration.</p>
                    <a href="${contractUrl}" target="_blank" rel="noopener" class="inline-flex items-center mt-3 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
                      <ion-icon name="document-text-outline" class="mr-2"></ion-icon>
                      View Source Contract
                    </a>
                  </div>
                </div>
              </div>
              <div class="max-h-64 overflow-y-auto glass-card p-4 text-sm text-glass">
                <h4 class="font-semibold mb-2">VENDOR AGREEMENT</h4>
                ${VENDOR_CONTRACT_TERMS.map((term, idx) => `
                  <p class="mb-2"><strong>${idx + 1}. ${escHtml(String(term.title || '').toUpperCase())}:</strong> ${escHtml(term.body)}</p>
                `).join('')}
              </div>
               
              <div class="mt-4 space-y-3">
                <div class="glass-card p-3">
                  <label class="block text-sm font-medium mb-2 text-glass">Legal Name (Contract Signature) *</label>
                  <input
                    type="text"
                    name="contractSignerName"
                    required
                    value="${String(data.contractSignerName || '').replace(/"/g, '&quot;')}"
                    placeholder="Full legal name"
                    class="w-full p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary"
                  >
                  <p class="text-xs text-glass-secondary mt-1">This name is stored as your contract signature on file.</p>
                </div>

                <div class="glass-card p-3">
                  <div class="flex gap-2 mb-3">
                    <button type="button" id="regSignatureModeDrawBtn" class="glass-button px-3 py-2 text-sm ${data.contractSignatureMode === 'draw' ? 'brand-bg' : ''}">
                      <ion-icon name="brush-outline" class="mr-1"></ion-icon>Draw Signature
                    </button>
                    <button type="button" id="regSignatureModeTypeBtn" class="glass-button px-3 py-2 text-sm ${data.contractSignatureMode === 'type' ? 'brand-bg' : ''}">
                      <ion-icon name="text-outline" class="mr-1"></ion-icon>Type Signature
                    </button>
                  </div>

                  <div id="regTypedSignatureWrap" class="${data.contractSignatureMode === 'type' ? '' : 'hidden'}">
                    <label class="block text-sm font-medium mb-2 text-glass">Typed Signature *</label>
                    <input
                      type="text"
                      id="regTypedSignatureInput"
                      value="${escHtml(String(data.contractTypedSignature || data.contractSignerName || ''))}"
                      placeholder="Type your signature"
                      class="w-full p-3 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary"
                    >
                    <div id="regTypedSignaturePreview" class="mt-2 p-3 rounded border border-white/20 bg-white text-gray-800 text-2xl" style="font-family: 'Brush Script MT', 'Segoe Script', cursive;">
                      ${escHtml(String(data.contractTypedSignature || data.contractSignerName || ''))}
                    </div>
                  </div>

                  <div id="regDrawSignatureWrap" class="${data.contractSignatureMode === 'draw' ? '' : 'hidden'}">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-sm font-medium text-glass">Draw Signature *</label>
                      <button type="button" id="regClearSignatureBtn" class="glass-button px-3 py-1 text-xs">Clear</button>
                    </div>
                    <canvas id="registrationSignatureCanvas" width="680" height="220" class="w-full h-40 rounded border border-white/20 bg-white touch-none"></canvas>
                    <p class="text-xs text-glass-secondary mt-1">Use your finger or mouse to sign above.</p>
                  </div>
                </div>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreeTerms" required class="w-4 h-4 mt-1">
                  <span class="text-sm text-glass">I have read and agree to the Vendor Agreement terms and conditions</span>
                </label>
                
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreePayment" required class="w-4 h-4 mt-1">
                  <span class="text-sm text-glass">I understand that payment is due within 30 days of approval and booth assignment is contingent on payment</span>
                </label>
                
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreeInsurance" required class="w-4 h-4 mt-1">
                  <span class="text-sm text-glass">I understand that I am responsible for my own insurance coverage</span>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreeElectronicSignature" required class="w-4 h-4 mt-1">
                  <span class="text-sm text-glass">I agree that this electronic signature is legally binding for my vendor registration</span>
                </label>
              </div>
            </div>
          `:""}
          <div class="flex gap-2 mt-2">
            ${step>1?'<button type="button" class="glass-button px-3 py-1" id="backBtn">Back</button>':''}
            <button class="brand-bg px-4 py-1 rounded flex-1">${step<5?'Next':'Submit Application'}</button>
          </div>
        </form>
      </div>
    `;
    if (step>1) root.querySelector("#backBtn").onclick = async () => { step--; await render(); };
    root.querySelector("#regForm").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (step===1) {
        const companyName = (fd.get("companyName") || '').trim();
        const contactName = (fd.get("contactName") || '').trim();
        if (!companyName) { Toast('Please enter your company name'); return; }
        if (!contactName) { Toast('Please enter a contact name'); return; }
        data.showId = fd.get("showId");
        data.showName = SHOWS[data.showId]?.shortName || '';
        data.companyName = companyName;
        data.contactName = contactName;
        // Update global show context to match selection
        setCurrentShow(data.showId);
        step++;
        saveDraft();
        await render();
      } else if (step===2) {
        const email = (fd.get("email") || '').trim().toLowerCase();
        const phone = (fd.get("phone") || '').trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast('Please enter a valid email address'); return; }
        data.email = email;
        data.phone = phone;
        step++;
        saveDraft();
        await render();
      } else if (step===3) {
        const selectedCategory = fd.get("category");
        const customCategory = root.querySelector('input[name="customCategory"]').value.trim();
        const finalCategory = selectedCategory === 'Other' && customCategory ? customCategory : selectedCategory;
        const booths = Array.from(root.querySelectorAll('.booth-choice:checked')).map(cb => cb.value);
        const boothCount = booths.length;
        const totalPrice = boothCount * BOOTH_PRICE;
        if (!boothCount) { Toast('Please select at least one booth'); return; }
        
        // Double-check that no selected booths are taken (in case of race condition)
        const invalidBooths = booths.filter(booth => takenBooths.has(booth));
        if (invalidBooths.length > 0) {
          Toast(`Booth(s) ${invalidBooths.join(', ')} are no longer available. Please refresh and try again.`);
          return;
        }
        data.category = finalCategory;
        data.booths = booths;
        data.boothCount = boothCount;
        data.totalPrice = totalPrice;
        step++;
        saveDraft();
        await render();
      } else if (step===4) {
        // Collect additional services
        data.needsPower = fd.get("needsPower") === 'on';
        data.needsTable = fd.get("needsTable") === 'on';
        data.chairCount = parseInt(fd.get("chairCount")) || 0;

        // Calculate additional costs
        data.powerCost = data.needsPower ? POWER_FEE : 0;
        data.tableCost = data.needsTable ? TABLE_FEE : 0;
        data.chairCost = data.chairCount * CHAIR_FEE;
        data.totalPrice = data.boothCount * BOOTH_PRICE + data.powerCost + data.tableCost + data.chairCost;

        step++;
        saveDraft();
        await render();
      } else if (step===5) {
        // Validate agreement checkboxes
        const contractSignerName = String(fd.get("contractSignerName") || '').trim();
        const signatureMode = data.contractSignatureMode === 'type' ? 'type' : 'draw';
        const typedSignatureInput = root.querySelector('#regTypedSignatureInput');
        const typedSignature = String(typedSignatureInput?.value || data.contractTypedSignature || contractSignerName).trim();
        const drawnSignatureDataUrl = String(data.contractDrawnSignatureDataUrl || '').trim();

        if (!contractSignerName) { Toast('Please enter the legal signer name for the contract'); return; }
        if (!fd.get("agreeTerms")) { Toast('Please agree to the terms and conditions'); return; }
        if (!fd.get("agreePayment")) { Toast('Please acknowledge the payment terms'); return; }
        if (!fd.get("agreeInsurance")) { Toast('Please acknowledge the insurance requirement'); return; }
        if (!fd.get("agreeElectronicSignature")) { Toast('Please acknowledge the electronic signature notice'); return; }
        if (signatureMode === 'type' && !typedSignature) { Toast('Please type your signature'); return; }
        if (signatureMode === 'draw' && !drawnSignatureDataUrl) { Toast('Please draw your signature'); return; }

        data.contractSignerName = contractSignerName;
        data.contractSignatureMode = signatureMode;
        data.contractTypedSignature = typedSignature;
        data.contractDrawnSignatureDataUrl = drawnSignatureDataUrl;
        data.contractSigned = true;
        data.contractSignedAt = new Date().toISOString();
        data.contractUrl = contractUrl;

        // Submit to Firestore with transaction to prevent booth race condition
        import("../firebase.js").then(async ({ getDb }) => {
          try {
            const db = getDb();
            const { collection, doc, runTransaction, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            const showId = data.showId;
            let createdVendorId = '';

            // Use a transaction: reserve booth docs then create vendor
            await runTransaction(db, async (txn) => {
              // 1. Check each selected booth is still available via boothReservations docs
              const conflicts = [];
              for (const boothId of data.booths) {
                const ref = doc(db, 'boothReservations', `${showId}_${boothId}`);
                const snap = await txn.get(ref);
                if (snap.exists()) conflicts.push(boothId);
              }
              if (conflicts.length > 0) {
                throw new Error(`BOOTH_TAKEN:${conflicts.join(',')}`);
              }

              // 2. Create vendor doc
              const vendorRef = doc(collection(db, 'vendors'));
              createdVendorId = vendorRef.id;
              txn.set(vendorRef, {
                showId: showId,
                showName: data.showName,
                name: data.companyName,
                category: data.category,
                booth: data.booths.join(', '),
                booths: data.booths,
                boothCount: data.boothCount,
                totalPrice: data.totalPrice,
                contactEmail: (data.email || '').trim().toLowerCase(),
                contactPhone: data.phone || '',
                logoUrl: '',
                ownerUid: state.user.uid,
                approved: false,
                needsPower: data.needsPower || false,
                needsTable: data.needsTable || false,
                chairCount: data.chairCount || 0,
                powerCost: data.powerCost || 0,
                tableCost: data.tableCost || 0,
                chairCost: data.chairCost || 0,
                status: 'pending',
                verified: false,
                profile: {},
                contractRequired: true,
                contractSigned: false,
                contractSignerName: '',
                contractSignerEmail: (data.email || '').trim().toLowerCase(),
                contractVersion: VENDOR_CONTRACT_VERSION,
                contractUrl: data.contractUrl || contractUrl,
                contractSignatureMode: '',
                contractSignatureTyped: '',
                contractSignatureImage: '',
                contractSignedByUid: '',
                contractSignedSource: '',
                contractSignedAt: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });

              // 3. Reserve each booth atomically
              for (const boothId of data.booths) {
                const ref = doc(db, 'boothReservations', `${showId}_${boothId}`);
                txn.set(ref, {
                  vendorId: vendorRef.id,
                  vendorOwnerUid: state.user.uid,
                  vendorName: data.companyName,
                  category: data.category,
                  showId: showId,
                  status: 'pending',
                  reservedAt: serverTimestamp()
                });
              }
            });

            const confirmationResult = await sendContractSignatureConfirmation(createdVendorId, data);
            if (!confirmationResult.ok) {
              console.warn('[VendorRegistration] contract confirmation dispatch failed:', confirmationResult.reason || 'unknown');
              Toast('Registration submitted, but contract signature could not be finalized. Open your profile to complete signing.');
            }

            clearDraft();
            Modal(document.createTextNode(
              confirmationResult.ok && !confirmationResult.warning
                ? "Registration submitted! Contract signed and confirmation emails sent."
              : confirmationResult.ok && confirmationResult.warning
                  ? `Registration submitted! Contract signed. ${confirmationResult.warning}`
                  : "Registration submitted! Contract signature still needs completion."
            ));
            setTimeout(() => { Modal(null); navigate("/home"); }, 1400);
          } catch (e) {
            if (e.message && e.message.startsWith('BOOTH_TAKEN:')) {
              const taken = e.message.replace('BOOTH_TAKEN:', '');
              Toast(`Booth(s) ${taken} were just claimed by another vendor. Please select different booths.`);
              step = 3;
              await loadBoothAvailability();
              await render();
            } else {
              console.error('Registration failed:', e);
              Toast("Failed to submit registration. Please try again.");
            }
          }
        });
      }
    };
    // dynamic UI hooks for step 3
    if (step===3) {
      const sel = root.querySelector('select[name="category"]');
      const custom = root.querySelector('input[name="customCategory"]');
      if (sel && custom) {
        sel.onchange = () => {
          custom.classList.toggle('hidden', sel.value !== 'Other');
        };
      }
      const updatePricing = () => {
        const count = root.querySelectorAll('.booth-choice:checked:not([disabled])').length;
        const total = count * BOOTH_PRICE;
        const sc = root.querySelector('#selectedCount');
        const tp = root.querySelector('#totalPrice');
        if (sc) sc.textContent = String(count);
        if (tp) tp.textContent = total.toLocaleString();
      };
      
      // Handle visual floor plan booth selection
      root.querySelectorAll('.booth-cell').forEach(cell => {
        const checkbox = cell.querySelector('.booth-choice');
        if (checkbox) {
          // Visual feedback for selection
          checkbox.onchange = () => {
            if (checkbox.checked) {
              cell.classList.add('ring-2', 'ring-brand', 'ring-offset-1', 'ring-offset-transparent');
              cell.style.backgroundColor = 'rgba(59, 130, 246, 0.6)'; // Brand blue when selected
            } else {
              cell.classList.remove('ring-2', 'ring-brand', 'ring-offset-1', 'ring-offset-transparent');
              cell.style.backgroundColor = 'rgba(255,255,255,0.1)'; // Reset to available color
            }
            updatePricing();
          };
          
          // Click on cell should toggle checkbox
          cell.onclick = (e) => {
            if (e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
              checkbox.dispatchEvent(new Event('change'));
            }
          };
        }
      });
      
      // Also handle checkboxes in list view
      root.querySelectorAll('#boothGrid .booth-choice:not([disabled])').forEach(cb => { 
        cb.onchange = updatePricing; 
      });
      
      updatePricing();
    }
    
    // Step 4: Additional services cost calculation
    if (step === 4) {
      const updateCostSummary = () => {
        const boothCount = data.boothCount || 0;
        const boothCost = boothCount * BOOTH_PRICE;
        const needsPower = root.querySelector('input[name="needsPower"]')?.checked || false;
        const needsTable = root.querySelector('input[name="needsTable"]')?.checked || false;
        const chairCount = parseInt(root.querySelector('input[name="chairCount"]')?.value || '0');
        
        const powerCost = needsPower ? POWER_FEE : 0;
        const tableCost = needsTable ? TABLE_FEE : 0;
        const chairCostTotal = chairCount * CHAIR_FEE;
        const totalCost = boothCost + powerCost + tableCost + chairCostTotal;
        
        const boothSummary = root.querySelector('#boothCostSummary');
        const powerSummary = root.querySelector('#powerCostSummary');
        const tableSummary = root.querySelector('#tableCostSummary');
        const chairSummary = root.querySelector('#chairCostSummary');
        const totalSummary = root.querySelector('#totalCostSummary');
        
        if (boothSummary) boothSummary.textContent = `$${boothCost.toLocaleString()}`;
        if (powerSummary) powerSummary.textContent = `$${powerCost}`;
        if (tableSummary) tableSummary.textContent = `$${tableCost}`;
        if (chairSummary) chairSummary.textContent = `$${chairCostTotal}`;
        if (totalSummary) totalSummary.textContent = `$${totalCost.toLocaleString()}`;
      };
      
      // Add event listeners for cost updates
      const powerCheckbox = root.querySelector('input[name="needsPower"]');
      const tableCheckbox = root.querySelector('input[name="needsTable"]');
      const chairInput = root.querySelector('input[name="chairCount"]');
      
      if (powerCheckbox) powerCheckbox.onchange = updateCostSummary;
      if (tableCheckbox) tableCheckbox.onchange = updateCostSummary;
      if (chairInput) chairInput.oninput = updateCostSummary;
      
      // Initial cost calculation
      updateCostSummary();
    }

    // Step 5: In-app digital signature capture
    if (step === 5) {
      const signerInput = root.querySelector('input[name="contractSignerName"]');
      const modeDrawBtn = root.querySelector('#regSignatureModeDrawBtn');
      const modeTypeBtn = root.querySelector('#regSignatureModeTypeBtn');
      const drawWrap = root.querySelector('#regDrawSignatureWrap');
      const typeWrap = root.querySelector('#regTypedSignatureWrap');
      const typedInput = root.querySelector('#regTypedSignatureInput');
      const typedPreview = root.querySelector('#regTypedSignaturePreview');
      const canvas = root.querySelector('#registrationSignatureCanvas');
      const clearBtn = root.querySelector('#regClearSignatureBtn');

      const updateModeUi = () => {
        const mode = data.contractSignatureMode === 'type' ? 'type' : 'draw';
        if (drawWrap) drawWrap.classList.toggle('hidden', mode !== 'draw');
        if (typeWrap) typeWrap.classList.toggle('hidden', mode !== 'type');
        if (modeDrawBtn) modeDrawBtn.classList.toggle('brand-bg', mode === 'draw');
        if (modeTypeBtn) modeTypeBtn.classList.toggle('brand-bg', mode === 'type');
      };

      if (modeDrawBtn) {
        modeDrawBtn.onclick = () => {
          data.contractSignatureMode = 'draw';
          updateModeUi();
          saveDraft();
        };
      }
      if (modeTypeBtn) {
        modeTypeBtn.onclick = () => {
          data.contractSignatureMode = 'type';
          updateModeUi();
          saveDraft();
        };
      }

      if (signerInput) {
        signerInput.oninput = () => {
          data.contractSignerName = signerInput.value;
          if (typedPreview && !String(typedInput?.value || '').trim()) {
            typedPreview.textContent = signerInput.value || '';
          }
          saveDraft();
        };
      }

      if (typedInput && typedPreview) {
        typedInput.oninput = () => {
          data.contractTypedSignature = typedInput.value;
          typedPreview.textContent = typedInput.value || data.contractSignerName || '';
          saveDraft();
        };
        typedPreview.textContent = typedInput.value || data.contractSignerName || '';
      }

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 2.2;

          let drawing = false;

          const beginStroke = (evt) => {
            drawing = true;
            const p = normalizeCanvasPoint(canvas, evt);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          };

          const continueStroke = (evt) => {
            if (!drawing) return;
            const p = normalizeCanvasPoint(canvas, evt);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          };

          const endStroke = () => {
            if (!drawing) return;
            drawing = false;
            data.contractDrawnSignatureDataUrl = canvas.toDataURL('image/png');
            saveDraft();
          };

          canvas.addEventListener('mousedown', beginStroke);
          canvas.addEventListener('mousemove', continueStroke);
          canvas.addEventListener('mouseup', endStroke);
          canvas.addEventListener('mouseleave', endStroke);

          canvas.addEventListener('touchstart', (evt) => {
            evt.preventDefault();
            beginStroke(evt);
          }, { passive: false });

          canvas.addEventListener('touchmove', (evt) => {
            evt.preventDefault();
            continueStroke(evt);
          }, { passive: false });

          canvas.addEventListener('touchend', (evt) => {
            evt.preventDefault();
            endStroke();
          }, { passive: false });

          canvas.addEventListener('touchcancel', (evt) => {
            evt.preventDefault();
            endStroke();
          }, { passive: false });

          if (data.contractDrawnSignatureDataUrl) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = data.contractDrawnSignatureDataUrl;
          }

          if (clearBtn) {
            clearBtn.onclick = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              data.contractDrawnSignatureDataUrl = '';
              saveDraft();
            };
          }
        }
      }

      updateModeUi();
    }
  }
  render();
}
