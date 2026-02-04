import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";

export default async function SavedBusinessCards(root) {
  const state = getState();
  const attendee = state.attendees[0];
  
  // Get saved vendor IDs from local state first
  let savedIds = attendee?.savedBusinessCards || [];
  
  // Also merge with savedVendorsByAttendee for backward compat
  if (attendee?.id && state.savedVendorsByAttendee[attendee.id]) {
    const additionalIds = state.savedVendorsByAttendee[attendee.id] || [];
    savedIds = [...new Set([...savedIds, ...additionalIds])];
  }
  
  // Get vendors from local state
  let vendors = state.vendors.filter(v => savedIds.includes(v.id));
  
  // If we don't have local data, try to load from Firestore
  if (savedIds.length > 0 && vendors.length === 0) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      for (const vendorId of savedIds) {
        try {
          const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
          if (vendorDoc.exists()) {
            vendors.push({ id: vendorDoc.id, ...vendorDoc.data() });
          }
        } catch (e) {
          console.warn('Could not load vendor:', vendorId);
        }
      }
    } catch (error) {
      console.error('Error loading saved vendors:', error);
    }
  }
  
  const removeVendor = async (vendorId) => {
    try {
      // Remove from local state
      if (attendee) {
        attendee.savedBusinessCards = (attendee.savedBusinessCards || []).filter(id => id !== vendorId);
        if (attendee.id && state.savedVendorsByAttendee[attendee.id]) {
          state.savedVendorsByAttendee[attendee.id] = state.savedVendorsByAttendee[attendee.id].filter(id => id !== vendorId);
        }
      }
      
      // Remove from Firestore
      if (attendee?.id) {
        const { removeSavedVendor } = await import("../firebase.js");
        await removeSavedVendor(attendee.id, vendorId);
      }
      
      Toast("Vendor removed from saved list");
      // Re-render
      SavedBusinessCards(root);
    } catch (error) {
      console.error('Error removing vendor:', error);
      Toast("Failed to remove vendor");
    }
  };
  
  // Expose removeVendor to window for onclick
  window._removeSavedVendor = removeVendor;
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/my-card'">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back to My Card</span>
      </button>
      
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-glass">Saved Business Cards</h1>
        <p class="text-glass-secondary text-sm">${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} saved</p>
      </div>
      
      ${vendors.length ? `
        <div class="space-y-3">
          ${vendors.map(v => `
            <div class="glass-card flex items-center gap-4 p-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                ${v.logoUrl ? `<img src="${v.logoUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<ion-icon name=\\'storefront-outline\\' class=\\'text-2xl text-glass-secondary\\'></ion-icon>'">` : `<ion-icon name="storefront-outline" class="text-2xl text-glass-secondary"></ion-icon>`}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-glass truncate">${v.name}</div>
                <div class="text-xs text-glass-secondary">${v.category || 'Vendor'}${v.booth ? ` • Booth ${v.booth}` : ''}</div>
                ${v.profile?.businessCardFront ? `<div class="text-xs text-green-400 mt-1 flex items-center gap-1"><ion-icon name="card-outline"></ion-icon> Has business card</div>` : ''}
              </div>
              <div class="flex flex-col gap-2">
                <button class="brand-bg px-3 py-2 rounded-lg text-sm" onclick="window.location.hash='/vendor/${v.id}'">
                  <ion-icon name="eye-outline" class="mr-1"></ion-icon>View
                </button>
                <button class="glass-button px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/20" onclick="window._removeSavedVendor('${v.id}')">
                  <ion-icon name="trash-outline" class="mr-1"></ion-icon>Remove
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="glass-card p-8 text-center">
          <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ion-icon name="card-outline" class="text-3xl text-blue-400"></ion-icon>
          </div>
          <h3 class="font-semibold text-glass mb-2">No Business Cards Saved</h3>
          <p class="text-glass-secondary text-sm mb-4">When you swap cards with vendors, their business cards will appear here.</p>
          <button class="brand-bg px-4 py-2 rounded-lg" onclick="window.location.hash='/vendors'">
            <ion-icon name="storefront-outline" class="mr-2"></ion-icon>
            Browse Vendors
          </button>
        </div>
      `}
    </div>
  `;
}
