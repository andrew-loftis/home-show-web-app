import { getState, leadsForVendor } from "../store.js";
import { formatDate } from "../utils/format.js";
import { EmptyLeads } from "../utils/skeleton.js";

export default function VendorLeads(root) {
  const { vendorLoginId, vendors } = getState();
  const vendor = vendors.find(v => v.id === vendorLoginId);
  const leads = leadsForVendor(vendorLoginId);
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-glass">My Leads</h1>
          <p class="text-glass-secondary text-sm">${vendor?.name || "Vendor"}</p>
        </div>
        ${leads.length ? `
          <div class="text-right">
            <div class="text-2xl font-bold text-glass">${leads.length}</div>
            <div class="text-xs text-glass-secondary">Total leads</div>
          </div>
        ` : ''}
      </div>
      
      ${leads.length ? `
        <div class="space-y-3">
          ${leads.map(l => `
            <div class="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors lead-card touch-target" data-id="${l.id}">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                <ion-icon name="person-outline" class="text-emerald-400"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-glass truncate">${l.attendee_id}</div>
                <div class="text-xs text-glass-secondary flex items-center gap-2">
                  <span>${l.exchangeMethod === 'card_share' ? 'Card shared' : 'Manual lead'}</span>
                  ${l.emailSent ? `<span class="text-green-400">• Email sent</span>` : ""}
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-xs text-glass-secondary">${formatDate(l.timestamp)}</div>
                <ion-icon name="chevron-forward-outline" class="text-glass-secondary"></ion-icon>
              </div>
            </div>
          `).join("")}
        </div>
      ` : EmptyLeads()}
    </div>
  `;
  
  root.querySelectorAll(".lead-card").forEach(card => {
    card.onclick = () => window.location.hash = `/vendor-lead/${card.dataset.id}`;
  });
}
