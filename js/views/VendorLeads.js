import { getState, leadsForVendor } from "../store.js";
import { formatDate } from "../utils/format.js";
import { EmptyLeads } from "../utils/skeleton.js";

export default async function VendorLeads(root) {
  const state = getState();
  
  // Try multiple ways to find the vendor (same as EditVendorProfile)
  let vendor = null;
  let vendorId = null;
  
  // Method 1: Check vendorLoginId (legacy vendor login flow)
  if (state.vendorLoginId && state.vendors) {
    vendor = state.vendors.find(v => v.id === state.vendorLoginId);
    vendorId = state.vendorLoginId;
  }
  
  // Method 2: Check myVendor
  if (!vendor && state.myVendor) {
    vendor = state.myVendor;
    vendorId = state.myVendor.id;
  }
  
  // Method 3: Query Firestore by ownerUid
  if (!vendor && state.user && !state.user.isAnonymous) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        vendor = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        vendorId = vendor.id;
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  }
  
  if (!vendor) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ion-icon name="alert-circle-outline" class="text-3xl text-red-400"></ion-icon>
          </div>
          <h2 class="text-xl font-bold mb-2 text-glass">Vendor Not Found</h2>
          <p class="text-glass-secondary mb-6">Please make sure you're logged in with your vendor account.</p>
          <button class="glass-button px-6 py-3" onclick="window.location.hash='/vendor-dashboard'">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  const leads = leadsForVendor(vendorId);
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-glass">My Leads</h1>
          <p class="text-glass-secondary text-sm">${vendor?.name || "Vendor"}</p>
        </div>
        ${leads.length ? `
          <div class="text-right">
            <div class="text-2xl font-bold text-glass">${leads.length}</div>
            <div class="text-xs text-glass-secondary">Total leads</div>
          </div>
        ` : ''}
      </div>
      
      ${leads.length ? `
        <div class="space-y-3">
          ${leads.map(l => `
            <div class="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors lead-card touch-target" data-id="${l.id}">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                <ion-icon name="person-outline" class="text-emerald-400"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-glass truncate">${l.attendee_id}</div>
                <div class="text-xs text-glass-secondary flex items-center gap-2">
                  <span>${l.exchangeMethod === 'card_share' ? 'Card shared' : 'Manual lead'}</span>
                  ${l.emailSent ? `<span class="text-green-400">• Email sent</span>` : ""}
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-xs text-glass-secondary">${formatDate(l.timestamp)}</div>
                <ion-icon name="chevron-forward-outline" class="text-glass-secondary"></ion-icon>
              </div>
            </div>
          `).join("")}
        </div>
      ` : EmptyLeads()}
    </div>
  `;
  
  root.querySelectorAll(".lead-card").forEach(card => {
    card.onclick = () => window.location.hash = `/vendor-lead/${card.dataset.id}`;
  });
}
