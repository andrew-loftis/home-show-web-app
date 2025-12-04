import { getState } from "../store.js";
import { EmptySavedVendors } from "../utils/skeleton.js";
import { logoImg } from "../utils/lazyImages.js";

export default function SavedVendors(root) {
  const state = getState();
  const attendee = state.attendees[0];
  const saved = (state.savedVendorsByAttendee[attendee?.id] || []);
  const vendors = state.vendors.filter(v => saved.includes(v.id));
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Saved Vendors</h1>
        <p class="text-glass-secondary text-sm">${vendors.length ? `${vendors.length} vendor${vendors.length > 1 ? 's' : ''} saved` : 'Your saved vendors will appear here'}</p>
      </div>
      
      ${vendors.length ? `
        <div class="space-y-3">
          ${vendors.map(v => `
            <div class="glass-card flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                ${logoImg(v.logoUrl, 'storefront-outline', 'w-full h-full')}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-glass truncate">${v.name}</div>
                <div class="text-xs text-glass-secondary">${v.category} ${v.booth ? `• Booth ${v.booth}` : ''}</div>
              </div>
              <button class="brand-bg px-4 py-2 rounded-xl text-sm touch-target flex-shrink-0" onclick="window.location.hash='/vendor/${v.id}'">
                View
              </button>
            </div>
          `).join("")}
        </div>
      ` : EmptySavedVendors()}
    </div>
  `;
}
