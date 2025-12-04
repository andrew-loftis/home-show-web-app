import { getState, leadsForVendor, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";
import { EmptyLeads, EmptyBusinessCard, EmptySentCards, EmptySavedVendors } from "../utils/skeleton.js";

// Import renderAttendeeCard function for card preview
function renderAttendeeCard(attendee, compact = false) {
  if (!attendee.card) return "";
  
  const card = attendee.card;
  return `
    <div class="glass-card overflow-hidden ${compact ? 'max-w-xs' : 'mb-8 max-w-md mx-auto'} shadow-glass ${compact ? '' : 'floating'}">
      ${card.backgroundImage ? `
        <div class="${compact ? 'h-24' : 'h-40'} bg-cover bg-center relative" style="background-image: url('${card.backgroundImage}')">
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
      ` : `<div class="${compact ? 'h-24' : 'h-40'} bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900"></div>`}
      
      <div class="${compact ? 'p-3' : 'p-6'} relative">
        ${card.profileImage ? `
          <div class="${compact ? 'w-12 h-12 -top-6 left-3' : 'w-20 h-20 -top-10 left-6'} rounded-full border-4 border-white/50 absolute overflow-hidden backdrop-blur-sm bg-white/20">
            <img src="${card.profileImage}"
                 style="width:100%;height:100%;object-fit:cover;object-position:${(card.profileImageX ?? 50)}% ${(card.profileImageY ?? 50)}%;transform:scale(${(card.profileImageZoom ?? 100) / 100})"
                 onerror="this.style.display='none'"/>
          </div>
        ` : `
          <div class="${compact ? 'w-12 h-12 -top-6 left-3' : 'w-20 h-20 -top-10 left-6'} rounded-full border-4 border-white/50 absolute bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
            <span class="text-white font-bold ${compact ? 'text-sm' : 'text-xl'}">${(attendee.name || 'A').charAt(0)}</span>
          </div>
        `}
        
        <div class="${compact ? 'mt-8' : 'mt-12'}">
          <div class="font-bold ${compact ? 'text-sm' : 'text-xl'} text-glass mb-1">${attendee.name}</div>
          ${card.location && !compact ? `<div class="text-sm text-glass-secondary mb-2 flex items-center gap-1">
            <ion-icon name="location-outline" class="text-xs"></ion-icon>${card.location}
          </div>` : ""}
          ${card.familySize && !compact ? `<div class="text-sm text-glass-secondary mb-3 flex items-center gap-1">
            <ion-icon name="people-outline" class="text-xs"></ion-icon>Family of ${card.familySize}
          </div>` : ""}
          
          ${card.bio && !compact ? `<div class="text-sm text-glass-secondary mb-4 leading-relaxed">${card.bio}</div>` : ""}
          
          ${card.visitingReasons?.length && !compact ? `
            <div class="mb-4">
              <div class="text-xs text-glass-secondary mb-2 font-medium">Here for:</div>
              <div class="flex flex-wrap gap-2">
                ${card.visitingReasons.slice(0, compact ? 2 : 6).map(reason => `
                  <span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium border border-white/20">${reason}</span>
                `).join("")}
                ${compact && card.visitingReasons.length > 2 ? `<span class="text-xs text-glass-secondary">+${card.visitingReasons.length - 2} more</span>` : ""}
              </div>
            </div>
          ` : ""}
          
          ${compact && card.visitingReasons?.length ? `
            <div class="text-xs text-glass-secondary mt-2">
              ${card.visitingReasons.slice(0, 2).join(", ")}${card.visitingReasons.length > 2 ? ` +${card.visitingReasons.length - 2} more` : ""}
            </div>
          ` : ""}
          
          ${!compact ? `
            <div class="flex flex-col gap-2 pt-4 border-t border-white/20">
              <div class="flex items-center gap-2 text-sm text-glass-secondary">
                <ion-icon name="mail-outline" class="text-sm"></ion-icon>
                <span>${attendee.email}</span>
              </div>
              ${attendee.phone ? `
                <div class="flex items-center gap-2 text-sm text-glass-secondary">
                  <ion-icon name="call-outline" class="text-sm"></ion-icon>
                  <span>${attendee.phone}</span>
                </div>
              ` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

export default function Cards(root) {
  const state = getState();
  const role = state.role;
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6 md:mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Cards</h1>
        <p class="text-glass-secondary text-sm md:text-base">${role === "vendor" ? "Leads & card exchanges" : "Cards you've sent and saved"}</p>
      </div>

      ${role === "vendor" ? renderVendorCards(state) : renderAttendeeCards(state)}
    </div>
  `;
}

function renderVendorCards(state) {
  const vendor = currentVendor();
  if (!vendor) return `<div class="glass-card p-6 text-glass-secondary">Login as a vendor to view interactions.</div>`;
  const leads = leadsForVendor(vendor.id).sort((a,b)=>b.timestamp-a.timestamp);
  if (!leads.length) return EmptyLeads();
  return `
    <div class="space-y-4">
      ${leads.map(lead => renderLeadRow(lead, state)).join("")}
    </div>
  `;
}

function renderLeadRow(lead, state) {
  const attendee = state.attendees.find(a => a.id === lead.attendee_id);
  if (!attendee) return "";
  const card = attendee.card || {};
  const time = new Date(lead.timestamp).toLocaleString();
  return `
    <div class="glass-card p-3 md:p-4 flex items-center gap-3 md:gap-4">
      <div class="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
        ${card.profileImage ? `<img src="${card.profileImage}" class="w-full h-full object-cover">` : `<span class="text-glass font-semibold">${attendee.name?.charAt(0) || "A"}</span>`}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-glass font-semibold text-sm md:text-base truncate">${attendee.name || attendee.email}</div>
        <div class="text-xs text-glass-secondary">${lead.exchangeMethod === 'card_share' ? 'Card shared' : 'Manual lead'} • ${time}</div>
      </div>
      <button class="glass-button px-3 py-2 text-xs md:text-sm flex-shrink-0 touch-target" onclick="window.location.hash='/vendor-lead/${lead.id}'">View</button>
    </div>
  `;
}

function renderAttendeeCards(state) {
  const attendee = state.attendees[0];
  if (!attendee) return EmptyBusinessCard();

  const sent = state.leads
    .filter(l => l.attendee_id === attendee.id)
    .sort((a,b)=>b.timestamp-a.timestamp);
  const savedVendorIds = (attendee.savedVendors && Array.isArray(attendee.savedVendors) && attendee.savedVendors.length)
    ? attendee.savedVendors
    : (state.savedVendorsByAttendee[attendee.id] || []);
  const saved = state.vendors.filter(v => savedVendorIds.includes(v.id));

  // Better card detection - check if card exists and has meaningful content
  const hasCard = attendee.card && (
    attendee.name || 
    attendee.card.profileImage || 
    attendee.card.backgroundImage || 
    attendee.card.bio || 
    attendee.card.location ||
    (attendee.card.visitingReasons && attendee.card.visitingReasons.length > 0)
  );

  return `
    <div class="space-y-4 md:space-y-6">
      <div class="glass-card p-4 md:p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-glass font-semibold">My Business Card</div>
            <div class="text-xs text-glass-secondary">${hasCard ? 'Your digital business card' : 'Create your card to start sharing'}</div>
          </div>
          <button class="brand-bg px-4 py-2 text-sm touch-target" onclick="window.location.hash='/my-card'">
            ${hasCard ? 'Edit Card' : 'Create Card'}
          </button>
        </div>
        
        ${hasCard ? `
          <div class="mt-4">
            ${renderAttendeeCard(attendee, true)}
          </div>
        ` : `
          <div class="border-2 border-dashed border-white/20 rounded-xl p-6 md:p-8 text-center">
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <ion-icon name="card-outline" class="text-3xl text-blue-400"></ion-icon>
            </div>
            <div class="font-medium text-glass mb-1">No Business Card Yet</div>
            <div class="text-xs text-glass-secondary">Create your card to share with vendors</div>
          </div>
        `}
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div class="glass-card p-4 md:p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <ion-icon name="paper-plane-outline" class="text-cyan-400"></ion-icon>
            </div>
            <h3 class="text-base md:text-lg font-semibold text-glass">Sent to Vendors</h3>
          </div>
          ${sent.length ? `<div class="space-y-2">${sent.map(l => renderSentRow(l, state)).join("")}</div>` : `
            <div class="text-center py-6">
              <ion-icon name="paper-plane-outline" class="text-2xl text-glass-secondary mb-2"></ion-icon>
              <p class="text-sm text-glass-secondary">No cards sent yet</p>
            </div>
          `}
        </div>

        <div class="glass-card p-4 md:p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <ion-icon name="bookmark-outline" class="text-pink-400"></ion-icon>
            </div>
            <h3 class="text-base md:text-lg font-semibold text-glass">Saved Vendors</h3>
          </div>
          ${saved.length ? `<div class="space-y-2">${saved.map(v => renderSavedVendor(v)).join("")}</div>` : `
            <div class="text-center py-6">
              <ion-icon name="bookmark-outline" class="text-2xl text-glass-secondary mb-2"></ion-icon>
              <p class="text-sm text-glass-secondary">No saved vendors</p>
              <button onclick="window.location.hash='/vendors'" class="text-xs text-blue-400 mt-2 hover:underline">Browse vendors →</button>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderSentRow(lead, state) {
  const vendor = state.vendors.find(v => v.id === lead.vendor_id);
  const time = new Date(lead.timestamp).toLocaleString();
  return `
    <div class="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
      <div>
        <div class="text-glass font-medium">${vendor?.name || 'Vendor'}</div>
        <div class="text-xs text-glass-secondary">${lead.exchangeMethod === 'card_share' ? 'Card shared' : 'Manual'} • ${time}</div>
      </div>
      <button class="glass-button px-3 py-1 text-sm" onclick="window.location.hash='/vendor/${vendor?.id}'">View</button>
    </div>
  `;
}

function renderSavedVendor(vendor) {
  return `
    <div class="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
      <div>
        <div class="text-glass font-medium">${vendor.name}</div>
        <div class="text-xs text-glass-secondary">Booth ${vendor.booth} • ${vendor.category}</div>
      </div>
      <button class="glass-button px-3 py-1 text-sm" onclick="window.location.hash='/vendor/${vendor.id}'">Open</button>
    </div>
  `;
}
