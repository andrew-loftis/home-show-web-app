import { getState, saveBusinessCard } from "../store.js";
import { Modal, Toast } from "../utils/ui.js";

export default function VendorLandingPage(root, params) {
  const { vendors } = getState();
  const vendor = vendors.find(v => v.id === params.vendorId);
  if (!vendor) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Vendor not found.</div>`;
    return;
  }
  
  const profile = vendor.profile || {};
  // People-focused placeholder for profile image (stable per vendor id)
  const peoplePlaceholder = (seed, size = 192) => `https://source.unsplash.com/random/${size}x${size}/?people,portrait,team,group&sig=${encodeURIComponent(seed || 'vendor')}`;
  const profileImgSrc = profile.profileImage || peoplePlaceholder(vendor.id, 192);
  
  root.innerHTML = `
    <div class="fade-in">
      <!-- Hero Section -->
      <div class="relative">
        ${profile.backgroundImage ? `
          <img src="${profile.backgroundImage}" class="w-full h-72 object-cover" onerror="this.style.display='none'">
        ` : `
          <div class="w-full h-72 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900"></div>
        `}
        ${profile.homeShowVideo ? `
          <div class="absolute inset-0 flex items-center justify-center">
            <button class="w-16 h-16 bg-black/60 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/70 transition-all" onclick="window.open('${profile.homeShowVideo}', '_blank')">
              <ion-icon name="play" class="text-white text-2xl ml-1"></ion-icon>
            </button>
          </div>
        ` : ""}
        <div class="absolute inset-0 bg-black/30"></div>
      </div>

      <!-- Profile Header -->
      <div class="relative px-6 pb-6">
        <div class="flex items-end gap-4 -mt-12 mb-3">
          <img src="${profileImgSrc}" class="w-24 h-24 rounded-xl border-4 border-white shadow-lg object-cover" onerror="this.style.display='none'">
          <div class="flex-1 pb-2">
            <div class="font-bold text-2xl text-white">${vendor.name}</div>
            <div class="text-white/90">${vendor.category}${vendor.booth ? ` • Booth ${vendor.booth}` : ''}</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 mb-6">
          <button class="flex-1 brand-bg text-white px-4 py-3 rounded font-semibold" id="shareCardBtn">Share My Card</button>
          <button class="flex-1 px-4 py-3 bg-gray-100 rounded font-semibold" id="saveVendorBtn">Save Vendor</button>
        </div>

        <!-- Image-first Business Card Gallery -->
        ${(profile.businessCardFront || profile.businessCardBack) ? `
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="id-card-outline" class="text-primary"></ion-icon>
              <div class="font-semibold">Business Card</div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${profile.businessCardFront ? `<img src="${profile.businessCardFront}" class="w-full aspect-[3/2] object-cover rounded-lg shadow cursor-pointer hover:opacity-95" data-lightbox="card-front" onerror="this.style.display='none'">` : ''}
              ${profile.businessCardBack ? `<img src="${profile.businessCardBack}" class="w-full aspect-[3/2] object-cover rounded-lg shadow cursor-pointer hover:opacity-95" data-lightbox="card-back" onerror="this.style.display='none'">` : ''}
            </div>
          </div>
        ` : ''}

        <!-- About & Special -->
        ${(profile.bio || profile.description || profile.specialOffer) ? `
          <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            ${(profile.bio || profile.description) ? `
              <div class="md:col-span-2 glass-card p-4">
                ${profile.bio ? `<div class="text-glass mb-2">${profile.bio}</div>` : ''}
                ${profile.description ? `<div class="text-glass-secondary">${profile.description}</div>` : ''}
              </div>
            ` : ''}
            ${profile.specialOffer ? `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-2">
                  <ion-icon name="gift-outline" class="text-yellow-600"></ion-icon>
                  <span class="font-semibold text-yellow-800">Home Show Special</span>
                </div>
                <div class="text-yellow-700">${profile.specialOffer}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Social icons row -->
        ${profile.selectedSocials?.length ? `
          <div class="mb-6">
            <div class="flex flex-wrap gap-2">
              ${profile.selectedSocials.map(social => {
                const url = profile[social];
                const iconMap = { website: 'globe-outline', facebook: 'logo-facebook', instagram: 'logo-instagram', twitter: 'logo-twitter', linkedin: 'logo-linkedin', tiktok: 'logo-tiktok', youtube: 'logo-youtube' };
                return url ? `<a href="${url}" target="_blank" class="px-3 py-2 rounded-full bg-white/70 hover:bg-white/90 border border-white/60 inline-flex items-center gap-2">
                  <ion-icon name="${iconMap[social] || 'link-outline'}" class="text-primary"></ion-icon>
                  <span class="text-sm capitalize">${social}</span>
                </a>` : '';
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Contact & Booth -->
        <div class="glass-card p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="flex items-center gap-2"><ion-icon name="mail-outline" class="text-gray-400"></ion-icon> <a href="mailto:${vendor.contactEmail}" class="text-primary">${vendor.contactEmail}</a></div>
            ${vendor.contactPhone ? `<div class="flex items-center gap-2"><ion-icon name="call-outline" class="text-gray-400"></ion-icon> <a href="tel:${vendor.contactPhone}" class="text-primary">${vendor.contactPhone}</a></div>` : ''}
            ${vendor.booth ? `<div class="flex items-center gap-2"><ion-icon name="location-outline" class="text-gray-400"></ion-icon> <span>Booth ${vendor.booth}</span></div>` : ''}
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
}
