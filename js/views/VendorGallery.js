import { getState } from "../store.js";

export default function VendorGallery(root) {
  const stateVendors = getState().vendors || [];

  const render = (list) => {
    root.innerHTML = `
      <div class="fade-in min-h-screen">
        
        <!-- Vendor feed with separation -->
        <div class="max-w-5xl mx-auto px-4 space-y-10 pb-28 mt-4">
          ${list.map(vendor => renderVendorCard(vendor)).join("")}
        </div>
      </div>
    `;
    // Wire events
    root.querySelectorAll(".play-video").forEach(btn => {
      btn.onclick = (e) => {
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, "_blank");
      };
    });
    root.querySelectorAll(".social-link").forEach(link => {
      link.onclick = (e) => {
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, "_blank");
      };
    });
  };

  // Initial render from local state (mock or cached)
  render(stateVendors);

  // Attempt to hydrate with live approved vendors from Firestore
  import("../firebase.js").then(async ({ initFirebase, fetchApprovedVendors }) => {
    try { initFirebase(); } catch {}
    try {
      const live = await fetchApprovedVendors();
      if (Array.isArray(live) && live.length) {
        render(live);
      }
    } catch {}
  });
}

function renderVendorCard(vendor) {
  const profile = vendor.profile || {};
  const selectedSocials = profile.selectedSocials || [];
  
  return `
    <div class="glass-card overflow-hidden slide-up border border-white/15 shadow-glass">
      <!-- Vendor Header -->
      <div class="flex items-center gap-4 p-6 border-b border-white/20">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
          ${vendor.logoUrl ? `<img src="${vendor.logoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : `<ion-icon name="business-outline" class="text-white text-2xl"></ion-icon>`}
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-glass">${vendor.name}</h3>
          <p class="text-glass-secondary">${vendor.category} • Booth ${vendor.booth}</p>
        </div>
        <button class="brand-bg px-6 py-3 rounded-xl font-semibold" onclick="window.location.hash='/vendor/${vendor.id}'">
          Visit
        </button>
      </div>
      
      <!-- Hero Content -->
      <div class="relative">
        ${profile.backgroundImage ? `
          <img src="${profile.backgroundImage}" class="w-full h-96 object-cover" onerror="this.style.display='none'">
        ` : `
          <div class="w-full h-96 bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900 flex items-center justify-center">
            <div class="text-white text-center">
              <ion-icon name="business-outline" class="text-6xl mb-4"></ion-icon>
              <h4 class="text-2xl font-bold">${vendor.name}</h4>
            </div>
          </div>
        `}
        
        ${profile.homeShowVideo ? `
          <div class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <button class="play-video w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 flex items-center justify-center hover:scale-110 transition-transform duration-300" data-url="${profile.homeShowVideo}">
              <ion-icon name="play" class="text-white text-3xl ml-1"></ion-icon>
            </button>
          </div>
        ` : ""}
      </div>
      
  <!-- Content Section -->
  <div class="p-6">
        ${profile.description ? `
          <p class="text-glass-secondary mb-4 leading-relaxed">${profile.description}</p>
        ` : ""}
        
        ${profile.specialOffer ? `
          <div class="glass-card p-4 mb-4 border border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-orange-400/10">
            <div class="flex items-center gap-2 mb-2">
              <ion-icon name="star" class="text-yellow-400"></ion-icon>
              <span class="font-semibold text-glass">Special Offer</span>
            </div>
            <p class="text-glass-secondary text-sm">${profile.specialOffer}</p>
          </div>
        ` : ""}
        
        ${profile.businessCardFront ? `
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="card-outline" class="text-blue-400"></ion-icon>
              <span class="font-semibold text-glass">Business Card</span>
            </div>
            <div class="flex gap-4 overflow-x-auto">
              <img src="${profile.businessCardFront}" class="w-40 h-24 object-cover rounded-lg border border-white/20" onerror="this.style.display='none'">
              ${profile.businessCardBack ? `<img src="${profile.businessCardBack}" class="w-40 h-24 object-cover rounded-lg border border-white/20" onerror="this.style.display='none'">` : ""}
            </div>
          </div>
        ` : ""}
        
        ${selectedSocials.length > 0 ? `
          <div class="grid grid-cols-4 gap-3 mb-4">
            ${selectedSocials.map(social => `
              <button class="social-link glass-button p-3 text-center hover:bg-white/25 transition-colors" data-url="${profile[social] || '#'}">
                <ion-icon name="logo-${social}" class="text-2xl text-white mb-1"></ion-icon>
                <div class="text-xs text-glass-secondary capitalize">${social}</div>
              </button>
            `).join("")}
          </div>
        ` : ""}
        
        <div class="flex items-center justify-between pt-5 mt-2 border-t border-white/15">
          <div class="flex gap-4">
            <button class="glass-button px-4 py-2 flex items-center gap-2" onclick="window.location.hash='/share-card/${vendor.id}'">
              <ion-icon name="share-outline"></ion-icon>
              Share
            </button>
            <button class="glass-button px-4 py-2 flex items-center gap-2" onclick="saveListing('${vendor.id}')">
              <ion-icon name="bookmark-outline"></ion-icon>
              Save
            </button>
          </div>
          <div class="text-glass-secondary text-sm">
            ${vendor.contactEmail}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Global function for saving listings
window.saveListing = function(vendorId) {
  import("../store.js").then(({ getState, saveVendorForAttendee }) => {
    const state = getState();
    const attendeeId = state.attendees[0]?.id;
    if (attendeeId) {
      saveVendorForAttendee(attendeeId, vendorId);
      import("../utils/ui.js").then(({ Toast }) => {
        Toast("Vendor saved!");
      });
    }
  });
};