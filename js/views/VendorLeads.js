import { getState, leadsForVendor } from "../store.js";
import { formatDate } from "../utils/format.js";

export default function VendorLeads(root) {
  const { vendorLoginId, vendors } = getState();
  const vendor = vendors.find(v => v.id === vendorLoginId);
  const leads = leadsForVendor(vendorLoginId);
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">My Leads</h2>
      <div class="mb-2 text-gray-500">${vendor?.name || "Vendor"}</div>
      <div class="grid gap-3">
        ${leads.length ? leads.map(l => `
          <div class="card p-3 flex flex-col gap-1 cursor-pointer lead-card" data-id="${l.id}">
            <div class="flex justify-between items-center">
              <div class="font-semibold">${l.attendee_id}</div>
              <div class="text-xs text-gray-400">${formatDate(l.timestamp)}</div>
            </div>
            <div class="text-xs text-gray-500">${l.exchangeMethod || "manual"} ${l.emailSent ? "<span class='text-green-600'>&bull; Email Sent</span>" : ""}</div>
          </div>
        `).join("") : `<div class='text-gray-400 text-center py-8'>No leads yet.</div>`}
      </div>
    </div>
  `;
  root.querySelectorAll(".lead-card").forEach(card => {
    card.onclick = () => window.location.hash = `/vendor-lead/${card.dataset.id}`;
  });
}
