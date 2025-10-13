import { getState, leadsForVendor, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function Cards(root) {
  const state = getState();
  const role = state.role;
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-glass">Cards</h1>
        <p class="text-glass-secondary">${role === "vendor" ? "Leads & card exchanges" : "Cards you've sent and saved"}</p>
      </div>

      ${role === "vendor" ? renderVendorCards(state) : renderAttendeeCards(state)}
    </div>
  `;
}

function renderVendorCards(state) {
  const vendor = currentVendor();
  if (!vendor) return `<div class="glass-card p-6 text-glass-secondary">Login as a vendor to view interactions.</div>`;
  const leads = leadsForVendor(vendor.id).sort((a,b)=>b.timestamp-a.timestamp);
  if (!leads.length) return `<div class="glass-card p-8 text-center text-glass-secondary">No interactions yet.</div>`;
  return `
    <div class="space-y-6">
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
    <div class="glass-card p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center">
        ${card.profileImage ? `<img src="${card.profileImage}" class="w-full h-full object-cover">` : `<span class="text-glass font-semibold">${attendee.name?.charAt(0) || "A"}</span>`}
      </div>
      <div class="flex-1">
        <div class="text-glass font-semibold">${attendee.name || attendee.email}</div>
        <div class="text-xs text-glass-secondary">${lead.exchangeMethod === 'card_share' ? 'Card shared' : 'Manual lead'} • ${time}</div>
      </div>
      <button class="glass-button px-3 py-2 text-sm" onclick="window.location.hash='/vendor-lead/${lead.id}'">View</button>
    </div>
  `;
}

function renderAttendeeCards(state) {
  const attendee = state.attendees[0];
  if (!attendee) return `
    <div class="space-y-4">
      <div class="glass-card p-6 text-glass-secondary">Create your card and start sharing with vendors.</div>
      <div>
        <button class="brand-bg px-4 py-3 rounded" onclick="window.location.hash='/my-card'">Create My Business Card</button>
      </div>
    </div>`;

  const sent = state.leads
    .filter(l => l.attendee_id === attendee.id)
    .sort((a,b)=>b.timestamp-a.timestamp);
  const savedVendorIds = (attendee.savedVendors && Array.isArray(attendee.savedVendors) && attendee.savedVendors.length)
    ? attendee.savedVendors
    : (state.savedVendorsByAttendee[attendee.id] || []);
  const saved = state.vendors.filter(v => savedVendorIds.includes(v.id));

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="glass-card p-6 mb-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-glass font-semibold">My Card</div>
            <div class="text-xs text-glass-secondary">Create or edit your card</div>
          </div>
          <button class="glass-button px-3 py-1 text-sm" onclick="window.location.hash='/my-card'">Open</button>
        </div>
      </div>
      <div class="glass-card p-6">
        <div class="flex items-center gap-2 mb-4">
          <ion-icon name="paper-plane-outline" class="text-white"></ion-icon>
          <h3 class="text-lg font-semibold text-glass">Sent to Vendors</h3>
        </div>
        ${sent.length ? sent.map(l => renderSentRow(l, state)).join("") : `<div class='text-glass-secondary'>You haven't shared any cards yet.</div>`}
      </div>

      <div class="glass-card p-6">
        <div class="flex items-center gap-2 mb-4">
          <ion-icon name="bookmark-outline" class="text-white"></ion-icon>
          <h3 class="text-lg font-semibold text-glass">Saved Vendors</h3>
        </div>
        ${saved.length ? renderSavedVendorsWallet(saved) : `<div class='text-glass-secondary'>No saved vendors yet.</div>`}
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

// New: Apple Wallet-like horizontal carousel for saved vendors
function renderSavedVendorsWallet(list) {
  // Each vendor becomes a card: prioritize businessCardFront, then back, else a fallback branded card
  const slides = list.map(v => renderWalletCard(v)).join("");
  return `
    <div class="wallet-wrapper">
      <div class="wallet-nav">
        <button class="wallet-btn" aria-label="Previous" onclick="window.scrollWallet('savedWallet','left')">
          <ion-icon name="chevron-back-outline"></ion-icon>
        </button>
        <button class="wallet-btn" aria-label="Next" onclick="window.scrollWallet('savedWallet','right')">
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </button>
      </div>
      <div class="wallet-carousel" id="savedWallet">
        ${slides}
      </div>
    </div>
  `;
}

function renderWalletCard(vendor) {
  const profile = vendor.profile || {};
  const img = profile.businessCardFront || profile.businessCardBack || "";
  const fallbackLogo = (profile.profileImage) || (vendor.logoUrl) || `https://i.pravatar.cc/192?u=${encodeURIComponent(vendor.id || vendor.name || 'vendor')}`;
  const bg = (profile.backgroundImage) || `https://picsum.photos/seed/${encodeURIComponent(vendor.id || vendor.name || 'bg')}/1200/640`;
  const hasRealCard = !!img;
  // Card body: image if provided; else a tasteful fallback card
  const body = hasRealCard
    ? `<img src="${img}" alt="${vendor.name} business card" class="wallet-img" onerror="this.style.display='none'">`
    : `
      <div class="wallet-fallback">
        <div class="wallet-fallback-bg" style="background-image:url('${bg}')"></div>
        <div class="wallet-fallback-inner">
          <div class="wallet-logo">
            <img src="${fallbackLogo}" alt="${vendor.name} logo" onerror="this.onerror=null; this.src='./assets/splash.svg'">
          </div>
          <div class="wallet-meta">
            <div class="wallet-title">${vendor.name}</div>
            <div class="wallet-sub">${vendor.category || ''}${vendor.booth ? ` • Booth ${vendor.booth}` : ''}</div>
          </div>
        </div>
      </div>`;
  return `
    <div class="wallet-card" role="button" tabindex="0" aria-label="Open ${vendor.name}" onclick="window.location.hash='/vendor/${vendor.id}'">
      ${body}
      <div class="wallet-chip">${vendor.name}</div>
    </div>
  `;
}

// Global helper for nav buttons (horizontal scroll)
window.scrollWallet = function(id, direction) {
  const el = document.getElementById(id);
  if (!el) return;
  const amount = Math.max(320, Math.floor(el.clientWidth * 0.9));
  el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
};
