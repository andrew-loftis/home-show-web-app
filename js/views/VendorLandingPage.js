import { getState, saveBusinessCard } from "../store.js";
import { Modal, Toast } from "../utils/ui.js";

export default async function VendorLandingPage(root, params) {
  const state = getState();
  let vendor = state.vendors.find(v => v.id === params.vendorId);
  
  // If not found in local state, try Firestore
  if (!vendor) {
    try {
      const { getVendorById } = await import("../firebase.js");
      vendor = await getVendorById(params.vendorId);
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  }
  
  if (!vendor) {
    root.innerHTML = `
      <div class="container-glass fade-in text-center py-12">
        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <ion-icon name="alert-circle-outline" class="text-3xl text-red-400"></ion-icon>
        </div>
        <h2 class="text-xl font-bold mb-2 text-glass">Vendor Not Found</h2>
        <p class="text-glass-secondary mb-6">This vendor may have been removed or the link is invalid.</p>
        <button class="brand-bg px-6 py-3 rounded-xl" onclick="window.location.hash='/vendors'">
          Browse All Vendors
        </button>
      </div>
    `;
    return;
  }
  
  const profile = vendor.profile || {};
  const attendee = state.attendees[0];
  
  // Check if vendor is already saved
  const savedVendors = state.savedVendorsByAttendee[attendee?.id] || [];
  const savedBusinessCards = attendee?.savedBusinessCards || [];
  const isVendorSaved = savedVendors.includes(vendor.id) || savedBusinessCards.includes(vendor.id);
  
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
          <button class="flex-1 brand-bg text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2" id="shareCardBtn">
            <ion-icon name="share-outline"></ion-icon>
            Share My Card
          </button>
          <button class="flex-1 px-4 py-3 glass-button rounded-xl font-semibold flex items-center justify-center gap-2 ${isVendorSaved ? 'bg-green-500/20 border-green-500/40' : ''}" id="saveVendorBtn">
            <ion-icon name="${isVendorSaved ? 'checkmark-circle' : 'bookmark-outline'}" class="${isVendorSaved ? 'text-green-400' : ''}"></ion-icon>
            ${isVendorSaved ? 'Saved!' : 'Save Vendor'}
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
  
  root.querySelector("#saveVendorBtn").onclick = async () => {
    const btn = root.querySelector("#saveVendorBtn");
    const currentState = getState();
    const attendeeId = currentState.attendees[0]?.id;
    
    if (!attendeeId) {
      Toast("Please create your business card first");
      setTimeout(() => {
        window.location.hash = '/my-card';
      }, 1000);
      return;
    }
    
    // Check if already saved
    const alreadySaved = (currentState.savedVendorsByAttendee[attendeeId] || []).includes(vendor.id) ||
                         (currentState.attendees[0]?.savedBusinessCards || []).includes(vendor.id);
    
    if (alreadySaved) {
      Toast("Vendor already saved!");
      return;
    }
    
    // Disable button while saving
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline" class="animate-spin mr-2"></ion-icon> Saving...';
    
    try {
      const { saveVendorForAttendee, saveBusinessCard } = await import("../store.js");
      await saveVendorForAttendee(attendeeId, vendor.id);
      saveBusinessCard(attendeeId, vendor.id);
      
      // Update button state
      btn.innerHTML = '<ion-icon name="checkmark-circle" class="text-green-400 mr-2"></ion-icon> Saved!';
      btn.classList.add('bg-green-500/20', 'border-green-500/40');
      Toast("Vendor saved! ✓");
    } catch (error) {
      console.error('Error saving vendor:', error);
      btn.disabled = false;
      btn.innerHTML = '<ion-icon name="bookmark-outline" class="mr-2"></ion-icon> Save Vendor';
      Toast("Failed to save vendor");
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
