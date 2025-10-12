import { getState, shareBusinessCard } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function ShareCard(root, params) {
  const state = getState();
  const vendor = state.vendors.find(v => v.id === params.vendorId);
  const attendee = state.attendees[0];
  
  if (!vendor) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Vendor not found.</div>`;
    return;
  }
  
  if (!attendee?.card) {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-4 brand">Share Your Business Card</h2>
        <div class="card p-6 text-center">
          <ion-icon name="card-outline" class="text-6xl text-gray-300 mb-4"></ion-icon>
          <div class="font-semibold mb-2">No Business Card Yet</div>
          <div class="text-gray-600 mb-4">Create your business card first to share it with vendors.</div>
          <button class="brand-bg px-4 py-2 rounded" onclick="window.location.hash='/my-card'">Create My Card</button>
        </div>
      </div>
    `;
    return;
  }
  
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4 brand">Share Business Card</h2>
      
      <div class="mb-4">
        <div class="font-semibold mb-2">Sharing with:</div>
        <div class="flex items-center gap-3 card p-3">
          <img src="${vendor.logoUrl || './assets/splash.svg'}" class="w-10 h-10 rounded" onerror="this.style.display='none'">
          <div>
            <div class="font-semibold">${vendor.name}</div>
            <div class="text-xs text-gray-500">${vendor.category} • Booth ${vendor.booth}</div>
          </div>
        </div>
      </div>
      
      <div class="mb-6">
        <div class="font-semibold mb-2">Your Business Card Preview:</div>
        ${renderAttendeeCardPreview(attendee)}
      </div>
      
      <div class="text-center">
        <button id="shareBtn" class="brand-bg px-6 py-3 rounded text-lg font-semibold text-white mb-4 w-full">
          Share My Business Card
        </button>
        <div class="text-xs text-gray-500">
          Your contact information will be shared with ${vendor.name}
        </div>
      </div>
    </div>
  `;
  
  root.querySelector("#shareBtn").onclick = () => {
    const success = shareBusinessCard(attendee.id, vendor.id);
    if (success) {
      Toast("Business card shared successfully!");
      setTimeout(() => {
        window.location.hash = `/vendor/${vendor.id}`;
      }, 1200);
    } else {
      Toast("Unable to share business card");
    }
  };
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
          <img src="${card.profileImage}" class="w-12 h-12 rounded-full border-2 border-white absolute -top-6 left-3" onerror="this.style.display='none'">
        ` : `
          <div class="w-12 h-12 rounded-full border-2 border-white absolute -top-6 left-3 bg-gray-300 flex items-center justify-center">
            <span class="text-white font-bold text-sm">${attendee.name.charAt(0)}</span>
          </div>
        `}
        
        <div class="mt-6">
          <div class="font-bold">${attendee.name}</div>
          ${card.location ? `<div class="text-xs text-gray-500">${card.location}</div>` : ""}
          ${card.familySize ? `<div class="text-xs text-gray-600">Family of ${card.familySize}</div>` : ""}
          
          ${card.visitingReasons?.length ? `
            <div class="mt-2">
              <div class="flex flex-wrap gap-1">
                ${card.visitingReasons.slice(0, 2).map(reason => `
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${reason}</span>
                `).join("")}
                ${card.visitingReasons.length > 2 ? `<span class="text-xs text-gray-400">+${card.visitingReasons.length - 2} more</span>` : ""}
              </div>
            </div>
          ` : ""}
          
          <div class="mt-2 text-xs text-gray-500">
            ${attendee.email}
            ${attendee.phone ? ` • ${attendee.phone}` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}