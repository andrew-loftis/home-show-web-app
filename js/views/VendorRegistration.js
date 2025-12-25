import { Modal, Toast } from "../utils/ui.js";
import { navigate } from "../router.js";
import { getState } from "../store.js";
import { CATEGORY_COLORS, getCategoryColor } from "../brand.js";

export default async function VendorRegistration(root) {
  const state = getState();
  if (!state.user) {
    root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Please sign in to register as a vendor.</div>`;
    return;
  }

  // Check if user is already an approved vendor
  if (!state.user.isAnonymous) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const vendorData = snapshot.docs[0].data();
        // If vendor exists and is approved, show dashboard instead
        if (vendorData.approved) {
          const { default: VendorDashboard } = await import("./VendorDashboard.js");
          VendorDashboard(root);
          return;
        }
        // If vendor exists but not approved, show pending status
        if (!vendorData.approved) {
          const { default: VendorDashboard } = await import("./VendorDashboard.js");
          VendorDashboard(root);
          return;
        }
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
  let step = 1;
  let data = {};
  // Expanded categories
  const categories = [
    "Kitchen","Bath","Landscaping","Windows","Doors","Solar","Roofing","Flooring","HVAC","Painting",
    "Plumbing","Electrical","Decks & Patios","Pools & Spas","Siding","Gutters","Insulation","Smart Home",
    "Security","Cabinets","Countertops","Tile & Stone","Appliances","Furniture","Interior Design","Lighting",
    "Garage","Fencing","Masonry","Concrete","Pest Control","Water Treatment","Home Cleaning","Remodeling",
    "General Contractor","Real Estate","Mortgage","Insurance","Energy Efficiency","Outdoor Living",
    "Garden/Nursery","Home Theater/AV","Other"
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
  
  // Track taken booths with their categories (for color coding)
  let takenBooths = new Set();
  let boothCategories = {}; // Map of boothId -> category
  
  // Load booth availability with category data
  const loadBoothAvailability = async () => {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, getDocs, where, query } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      takenBooths.clear();
      boothCategories = {};
      
      // Get all approved vendors and their booths with categories
      const q = query(collection(db, 'vendors'), where('approved', '==', true));
      const snap = await getDocs(q);
      
      snap.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'General';
        
        if (data.booths && Array.isArray(data.booths)) {
          data.booths.forEach(booth => {
            takenBooths.add(booth);
            boothCategories[booth] = category;
          });
        } else if (data.booth) {
          // Handle legacy single booth format
          const booths = data.booth.split(',').map(b => b.trim());
          booths.forEach(booth => {
            takenBooths.add(booth);
            boothCategories[booth] = category;
          });
        }
      });
      
      // Also check pending applications to prevent double-booking
      const pendingQ = query(collection(db, 'vendors'), where('approved', '==', false), where('status', '!=', 'denied'));
      const pendingSnap = await getDocs(pendingQ);
      
      pendingSnap.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'General';
        
        if (data.booths && Array.isArray(data.booths)) {
          data.booths.forEach(booth => {
            if (!takenBooths.has(booth)) { // Don't overwrite approved booths
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
        <p class="text-glass-secondary text-sm mb-4">Step ${step} of 5: ${step===1?'Company Info':step===2?'Contact Details':step===3?'Booth Selection':step===4?'Additional Services':'Agreement'}</p>
        <div class="mb-4 flex gap-2 items-center">
          <div class="w-4 h-2 rounded ${step>=1?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=2?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=3?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=4?'bg-primary':'bg-white/20'}"></div>
          <div class="w-4 h-2 rounded ${step>=5?'bg-primary':'bg-white/20'}"></div>
        </div>
        <form id="regForm" class="glass-card p-4">
          ${step===1?`
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
              <div class="max-h-64 overflow-y-auto glass-card p-4 text-sm text-glass">
                <h4 class="font-semibold mb-2">VENDOR AGREEMENT</h4>
                
                <p class="mb-2"><strong>1. BOOTH SETUP & BREAKDOWN:</strong> Vendors may begin setup on Friday 4:00 PM - 8:00 PM or Saturday 7:00 AM - 9:00 AM. Show hours are Saturday 10:00 AM - 8:00 PM and Sunday 10:00 AM - 4:00 PM. Breakdown begins Sunday at 4:00 PM.</p>
                
                <p class="mb-2"><strong>2. PAYMENT TERMS:</strong> Full payment is due within 30 days of application approval. Booth assignments are made upon payment receipt.</p>
                
                <p class="mb-2"><strong>3. CANCELLATION POLICY:</strong> Cancellations made 60+ days before show: 75% refund. 30-59 days: 50% refund. Less than 30 days: No refund.</p>
                
                <p class="mb-2"><strong>4. VENDOR RESPONSIBILITIES:</strong> Vendors must provide their own displays, marketing materials, and staffing. All electrical and table rentals must be arranged through show management.</p>
                
                <p class="mb-2"><strong>5. INSURANCE:</strong> Vendors are responsible for their own insurance coverage. Show management is not liable for theft, damage, or injury.</p>
                
                <p class="mb-2"><strong>6. CONDUCT:</strong> Professional conduct is required. Show management reserves the right to remove vendors who violate this agreement.</p>
                
                <p class="mb-2"><strong>7. FORCE MAJEURE:</strong> If the show is cancelled due to circumstances beyond our control, vendors will receive a full refund minus processing fees.</p>
              </div>
              
              <div class="mt-4 space-y-3">
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
        data.companyName = fd.get("companyName");
        data.contactName = fd.get("contactName");
        step++;
        await render();
      } else if (step===2) {
        data.email = fd.get("email");
        data.phone = fd.get("phone");
        step++;
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
        await render();
      } else if (step===5) {
        // Validate agreement checkboxes
        if (!fd.get("agreeTerms")) { Toast('Please agree to the terms and conditions'); return; }
        if (!fd.get("agreePayment")) { Toast('Please acknowledge the payment terms'); return; }
        if (!fd.get("agreeInsurance")) { Toast('Please acknowledge the insurance requirement'); return; }
        // Submit to Firestore: vendors with approved=false
        import("../firebase.js").then(async ({ getDb }) => {
          try {
            const db = getDb();
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await addDoc(collection(db, 'vendors'), {
              name: data.companyName,
              category: data.category,
              booth: data.booths.join(', '),
              booths: data.booths,
              boothCount: data.boothCount,
              totalPrice: data.totalPrice,
              contactEmail: data.email,
              contactPhone: data.phone || '',
              logoUrl: '',
              ownerUid: state.user.uid,
              approved: false,
              // Additional services
              needsPower: data.needsPower || false,
              needsTable: data.needsTable || false,
              chairCount: data.chairCount || 0,
              powerCost: data.powerCost || 0,
              tableCost: data.tableCost || 0,
              chairCost: data.chairCost || 0,
              status: 'pending',
              verified: false,
              profile: {},
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            Modal(document.createTextNode("Registration submitted! Waiting for admin approval."));
            setTimeout(() => { Modal(null); navigate("/home"); }, 1400);
          } catch (e) {
            Toast("Failed to submit registration");
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
  }
  render();
}
