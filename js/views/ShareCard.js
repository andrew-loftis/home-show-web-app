import { getState, shareBusinessCard } from "../store.js";
import { Toast } from "../utils/ui.js";

export default async function ShareCard(root, params) {
  const state = getState();
  const vendor = state.vendors.find(v => v.id === params.vendorId);
  const attendee = state.attendees[0];
  
  if (!vendor) {
    // Try to load vendor from Firestore if not in local state
    try {
      const { getVendorById } = await import("../firebase.js");
      const vendorData = await getVendorById(params.vendorId);
      if (!vendorData) {
        root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Vendor not found.</div>`;
        return;
      }
      // Continue with loaded vendor
      renderShareCard(root, vendorData, attendee);
      return;
    } catch (error) {
      root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Vendor not found.</div>`;
      return;
    }
  }
  
  renderShareCard(root, vendor, attendee);
}

async function renderShareCard(root, vendor, attendee) {
  const state = getState();
  
  if (!attendee?.card) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/vendor/${vendor.id}'">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Back to Vendor</span>
        </button>
        
        <div class="glass-card p-8 text-center">
          <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ion-icon name="card-outline" class="text-3xl text-blue-400"></ion-icon>
          </div>
          <h3 class="font-semibold text-glass mb-2">No Business Card Yet</h3>
          <p class="text-glass-secondary text-sm mb-4">Create your business card first to share it with vendors.</p>
          <button class="brand-bg px-6 py-3 rounded-xl font-semibold" onclick="window.location.hash='/my-card'">
            <ion-icon name="add-outline" class="mr-2"></ion-icon>
            Create My Card
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  const profile = vendor.profile || {};
  const hasVendorCard = profile.businessCardFront || profile.businessCardBack;
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/vendor/${vendor.id}'">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back to Vendor</span>
      </button>
      
      <h2 class="text-xl font-bold mb-6 text-glass">Share Business Card</h2>
      
      <div class="mb-6">
        <div class="font-semibold mb-2 text-glass-secondary text-sm">Sharing with:</div>
        <div class="flex items-center gap-3 glass-card p-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
            ${vendor.logoUrl ? `<img src="${vendor.logoUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<ion-icon name=\\'storefront-outline\\' class=\\'text-2xl text-glass-secondary\\'></ion-icon>'">` : `<ion-icon name="storefront-outline" class="text-2xl text-glass-secondary"></ion-icon>`}
          </div>
          <div>
            <div class="font-semibold text-glass">${vendor.name}</div>
            <div class="text-xs text-glass-secondary">${vendor.category}${vendor.booth ? ` • Booth ${vendor.booth}` : ''}</div>
          </div>
        </div>
      </div>
      
      <div class="mb-6">
        <div class="font-semibold mb-2 text-glass-secondary text-sm">Your Business Card:</div>
        ${renderAttendeeCardPreview(attendee)}
      </div>
      
      <!-- Vendor Business Card Preview (if available) -->
      ${hasVendorCard ? `
        <div class="mb-6">
          <div class="font-semibold mb-2 text-glass-secondary text-sm">${vendor.name}'s Business Card:</div>
          <div class="flex gap-2 justify-center overflow-x-auto py-2">
            ${profile.businessCardFront ? `<img src="${profile.businessCardFront}" class="h-32 rounded-lg shadow-lg border border-white/10" onerror="this.style.display='none'">` : ''}
            ${profile.businessCardBack ? `<img src="${profile.businessCardBack}" class="h-32 rounded-lg shadow-lg border border-white/10" onerror="this.style.display='none'">` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="space-y-3">
        <button id="shareBtn" class="brand-bg w-full px-6 py-4 rounded-xl text-lg font-semibold text-white flex items-center justify-center gap-2">
          <ion-icon name="share-outline" class="text-xl"></ion-icon>
          Share My Card
        </button>
        
        ${hasVendorCard ? `
          <button id="swapBtn" class="w-full px-6 py-4 rounded-xl text-lg font-semibold border-2 border-primary/50 bg-primary/10 text-glass flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
            <ion-icon name="swap-horizontal-outline" class="text-xl"></ion-icon>
            Swap Cards (Share + Save Theirs)
          </button>
        ` : ''}
        
        <div class="text-xs text-glass-secondary text-center mt-2">
          ${hasVendorCard ? 
            '📤 Share: Send your card to vendor • 🔄 Swap: Exchange cards (you save theirs too!)' : 
            'Your contact information will be shared with ' + vendor.name
          }
        </div>
      </div>
    </div>
  `;
  
  // Wire up share button
  root.querySelector("#shareBtn").onclick = async () => {
    const btn = root.querySelector("#shareBtn");
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline" class="animate-spin mr-2"></ion-icon> Sharing...';
    
    try {
      const success = await shareBusinessCard(attendee.id, vendor.id, {
        sendEmail: true,
        vendorEmail: vendor.contactEmail,
        vendorBusinessName: vendor.name,
        data: {
          attendeeName: attendee.name || '',
          attendeeEmail: attendee.email || '',
          attendeePhone: attendee.phone || '',
          notes: ''
        }
      });
      if (success) {
        Toast("Business card shared successfully! 📤");
        setTimeout(() => {
          window.location.hash = `/vendor/${vendor.id}`;
        }, 1200);
      } else {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        Toast("Unable to share business card");
      }
    } catch (error) {
      console.error('Share error:', error);
      btn.disabled = false;
      btn.innerHTML = originalContent;
      Toast("Unable to share business card");
    }
  };
  
  // Wire up swap button
  const swapBtn = root.querySelector("#swapBtn");
  if (swapBtn) {
    swapBtn.onclick = async () => {
      const originalContent = swapBtn.innerHTML;
      swapBtn.disabled = true;
      swapBtn.innerHTML = '<ion-icon name="hourglass-outline" class="animate-spin mr-2"></ion-icon> Swapping...';
      
      try {
        // First share the attendee's card (with email notification)
        const shareSuccess = await shareBusinessCard(attendee.id, vendor.id, {
          sendEmail: true,
          vendorEmail: vendor.contactEmail,
          vendorBusinessName: vendor.name,
          data: {
            cardSwapped: true,
            attendeeName: attendee.name || '',
            attendeeEmail: attendee.email || '',
            attendeePhone: attendee.phone || '',
            notes: ''
          }
        });

        if (shareSuccess) {
          // Save the vendor's business card to attendee's saved list
          const { saveBusinessCard, saveVendorForAttendee } = await import("../store.js");
          saveBusinessCard(attendee.id, vendor.id);
          await saveVendorForAttendee(attendee.id, vendor.id);

          Toast("Cards swapped successfully! 🔄");
          setTimeout(() => {
            window.location.hash = `/vendor/${vendor.id}`;
          }, 1200);
        } else {
          swapBtn.disabled = false;
          swapBtn.innerHTML = originalContent;
          Toast("Unable to swap cards");
        }
      } catch (error) {
        console.error('Swap error:', error);
        swapBtn.disabled = false;
        swapBtn.innerHTML = originalContent;
        Toast("Unable to swap cards");
      }
    };
  }
}

function renderAttendeeCardPreview(attendee) {
  const card = attendee.card;
  return `
    <div class="card overflow-hidden max-w-sm mx-auto">
      ${card.backgroundImage ? `
        <div class="h-24 bg-cover bg-center relative" style="background-image: url('${card.backgroundImage}')">
          <div class="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>
      ` : `<div class="h-24 bg-gradient-to-br from-primary to-dark"></div>`}
      
      <div class="p-3 relative">
        ${card.profileImage ? `
          <img src="${card.profileImage}" class="w-12 h-12 rounded-full border-2 border-white/60 absolute -top-6 left-3" onerror="this.style.display='none'">
        ` : `
          <div class="w-12 h-12 rounded-full border-2 border-white/60 absolute -top-6 left-3 bg-white/20 flex items-center justify-center">
            <span class="text-white font-bold text-sm">${attendee.name.charAt(0)}</span>
          </div>
        `}

        <div class="mt-6">
          <div class="font-bold text-glass">${attendee.name}</div>
          ${card.location ? `<div class="text-xs text-glass-secondary">${card.location}</div>` : ""}
          ${card.familySize ? `<div class="text-xs text-glass-secondary">Family of ${card.familySize}</div>` : ""}

          ${card.visitingReasons?.length ? `
            <div class="mt-2">
              <div class="flex flex-wrap gap-1">
                ${card.visitingReasons.slice(0, 2).map(reason => `
                  <span class="px-2 py-1 bg-white/15 border border-white/20 text-glass rounded text-xs">${reason}</span>
                `).join("")}
                ${card.visitingReasons.length > 2 ? `<span class="text-xs text-glass-secondary">+${card.visitingReasons.length - 2} more</span>` : ""}
              </div>
            </div>
          ` : ""}

          <div class="mt-2 text-xs text-glass-secondary">
            ${attendee.email}
            ${attendee.phone ? ` • ${attendee.phone}` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}