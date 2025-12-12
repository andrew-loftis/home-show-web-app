import { getState, saveBusinessCard } from "../store.js";
import { Modal, Toast } from "../utils/ui.js";

export default function VendorLandingPage(root, params) {
  const { vendors } = getState();
  const vendor = vendors.find(v => v.id === params.vendorId);
  if (!vendor) {
    root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Vendor not found.</div>`;
    return;
  }
  
  const profile = vendor.profile || {};
  
  root.innerHTML = `
    <div class="fade-in">
      <!-- Back Button -->
      <div class="absolute top-4 left-4 z-10">
        <button class="flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm hover:bg-black/60 transition-colors" onclick="window.location.hash='/vendors'">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Vendors</span>
        </button>
      </div>
      
      <!-- Hero Section -->
      <div class="relative">
        ${profile.backgroundImage ? `
          <img src="${profile.backgroundImage}" class="w-full h-64 object-cover" onerror="this.style.display='none'">
        ` : `
          <div class="w-full h-64 bg-gradient-to-br from-primary to-dark"></div>
        `}
        
        ${profile.homeShowVideo ? `
          <div class="absolute inset-0 flex items-center justify-center">
            <button class="w-20 h-20 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-all" onclick="window.open('${profile.homeShowVideo}', '_blank')">
              <ion-icon name="play" class="text-white text-3xl ml-1"></ion-icon>
            </button>
          </div>
        ` : ""}
        
        <div class="absolute inset-0 bg-black bg-opacity-20"></div>
      </div>
      
      <!-- Profile Section -->
      <div class="relative px-6 pb-6">
        <div class="flex items-end gap-4 -mt-12 mb-4">
          ${profile.profileImage ? `
            <img src="${profile.profileImage}" class="w-24 h-24 rounded-lg border-4 border-white shadow-lg" onerror="this.style.display='none'">
          ` : `
            <img src="${vendor.logoUrl || './assets/splash.svg'}" class="w-24 h-24 rounded-lg border-4 border-white shadow-lg" onerror="this.style.display='none'">
          `}
          <div class="flex-1 pb-2">
            <div class="font-bold text-2xl text-white">${vendor.name}</div>
            <div class="text-white opacity-90">${vendor.category} • Booth ${vendor.booth}</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-3 mb-6">
          <button class="flex-1 brand-bg text-white px-4 py-3 rounded font-semibold" id="shareCardBtn">
            Share My Card
          </button>
          <button class="flex-1 px-4 py-3 glass-button rounded font-semibold" id="saveVendorBtn">
            Save Vendor
          </button>
        </div>
        
        <!-- Business Card Display -->
        ${profile.businessCardFront ? `
          <div class="mb-6">
            <div class="font-semibold mb-2">Business Card</div>
            <div class="flex gap-2 overflow-x-auto">
              <img src="${profile.businessCardFront}" class="h-32 rounded shadow" onerror="this.style.display='none'">
              ${profile.businessCardBack ? `<img src="${profile.businessCardBack}" class="h-32 rounded shadow" onerror="this.style.display='none'">` : ""}
            </div>
          </div>
        ` : ""}
        
        <!-- Description -->
        ${profile.bio ? `<div class="mb-4 text-gray-700">${profile.bio}</div>` : ""}
        ${profile.description ? `<div class="mb-4 text-gray-600">${profile.description}</div>` : ""}
        
        <!-- Special Offer -->
        ${profile.specialOffer ? `
          <div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <ion-icon name="gift-outline" class="text-yellow-600"></ion-icon>
              <span class="font-semibold text-yellow-800">Home Show Special</span>
            </div>
            <div class="text-yellow-700">${profile.specialOffer}</div>
          </div>
        ` : ""}
        
        <!-- Gallery -->
        ${profile.gallery && profile.gallery.length ? `
          <div class="mb-6">
            <div class="font-semibold mb-3 text-glass">Our Work</div>
            <div class="grid grid-cols-2 gap-2">
              ${profile.gallery.map((img, idx) => `
                <div class="aspect-square rounded-lg overflow-hidden cursor-pointer gallery-item" data-idx="${idx}">
                  <img src="${img}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ""}
        
        <!-- Social Media -->
        ${profile.selectedSocials?.length ? `
          <div class="mb-6">
            <div class="font-semibold mb-3">Connect With Us</div>
            <div class="grid grid-cols-2 gap-3">
              ${profile.selectedSocials.map(social => {
                const url = profile[social];
                const socialLabels = {
                  website: "Website",
                  facebook: "Facebook", 
                  instagram: "Instagram",
                  twitter: "Twitter",
                  linkedin: "LinkedIn",
                  tiktok: "TikTok",
                  youtube: "YouTube"
                };
                const iconMap = {
                  website: "globe-outline",
                  facebook: "logo-facebook",
                  instagram: "logo-instagram",
                  twitter: "logo-twitter", 
                  linkedin: "logo-linkedin",
                  tiktok: "logo-tiktok",
                  youtube: "logo-youtube"
                };
                return url ? `
                  <a href="${url}" target="_blank" class="flex items-center gap-3 p-3 glass-card rounded hover:bg-white/10 transition-colors">
                    <ion-icon name="${iconMap[social] || 'link-outline'}" class="text-xl text-primary"></ion-icon>
                    <span class="font-medium text-glass">${socialLabels[social] || social}</span>
                  </a>
                ` : "";
              }).join("")}
            </div>
          </div>
        ` : ""}
        
        <!-- Contact Information -->
        <div class="border-t pt-4">
          <div class="font-semibold mb-3">Contact Information</div>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <ion-icon name="mail-outline" class="text-gray-400"></ion-icon>
              <a href="mailto:${vendor.contactEmail}" class="text-primary">${vendor.contactEmail}</a>
            </div>
            ${vendor.contactPhone ? `
              <div class="flex items-center gap-3">
                <ion-icon name="call-outline" class="text-gray-400"></ion-icon>
                <a href="tel:${vendor.contactPhone}" class="text-primary">${vendor.contactPhone}</a>
              </div>
            ` : ""}
            <div class="flex items-center gap-3">
              <ion-icon name="location-outline" class="text-gray-400"></ion-icon>
              <span>Booth ${vendor.booth}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  root.querySelector("#shareCardBtn").onclick = () => {
    window.location.hash = `/share-card/${vendor.id}`;
  };
  
  root.querySelector("#saveVendorBtn").onclick = () => {
    const state = getState();
    const attendeeId = state.attendees[0]?.id;
    if (attendeeId) {
      import("../store.js").then(({ saveVendorForAttendee }) => {
        saveVendorForAttendee(attendeeId, vendor.id);
        Toast("Vendor saved!");
      });
    } else {
      Toast("Please create your business card first");
    }
  };
  
  // Gallery lightbox
  root.querySelectorAll('.gallery-item').forEach(item => {
    item.onclick = () => {
      const idx = parseInt(item.dataset.idx, 10);
      const images = profile.gallery || [];
      if (!images[idx]) return;
      
      Modal(`
        <div class="relative">
          <img src="${images[idx]}" class="max-w-full max-h-[80vh] rounded-lg mx-auto">
          <div class="text-center mt-3 text-glass-secondary text-sm">${idx + 1} of ${images.length}</div>
        </div>
      `);
    };
  });
}
