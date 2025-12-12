import { getState, addLeadNote, sendExchangeEmails } from "../store.js";
import { formatDate } from "../utils/format.js";
import { Toast } from "../utils/ui.js";

export default function VendorLeadDetail(root, params) {
  const { leads, attendees } = getState();
  const lead = leads.find(l => l.id === params.id);
  if (!lead) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Lead not found.</div>`;
    return;
  }
  const attendee = attendees.find(a => a.id === lead.attendee_id);
  root.innerHTML = `
    <div class="p-6 fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.history.back()">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back to Leads</span>
      </button>
      <h2 class="text-xl font-bold mb-4 text-glass">Lead Detail</h2>
      <div class="glass-card p-4 mb-4">
        <div class="mb-2 font-semibold text-glass">${attendee?.name || lead.attendee_id}</div>
        <div class="text-xs text-glass-secondary mb-2">${attendee?.email || ""}</div>
        <div class="text-xs text-glass-secondary mb-2">${formatDate(lead.timestamp)}</div>
        <div class="mb-2 text-glass-secondary">Method: <span class="text-xs">${lead.exchangeMethod || "manual"}</span></div>
      </div>
      <form id="noteForm" class="glass-card p-4 mb-4">
        <label class="block text-sm font-medium mb-2 text-glass">Notes</label>
        <textarea name="note" class="w-full border rounded p-2 mb-3 bg-white/10 text-glass border-white/20" rows="3" placeholder="Add notes...">${lead.notes || ""}</textarea>
        <button class="brand-bg px-4 py-2 rounded-xl">Save Note</button>
      </form>
      <div class="glass-card p-4 flex gap-2 items-center">
        <label class="inline-flex items-center gap-2 text-glass"><input type="checkbox" id="emailSent" ${lead.emailSent ? "checked" : ""} class="w-5 h-5"> Email Sent</label>
      </div>
    </div>
  `;
  root.querySelector("#noteForm").onsubmit = e => {
    e.preventDefault();
    const note = e.target.note.value;
    addLeadNote(lead.id, note);
    Toast("Note saved");
  };
  root.querySelector("#emailSent").onchange = e => {
    if (e.target.checked) sendExchangeEmails(lead.attendee_id, lead.vendor_id);
    else {
      lead.emailSent = false;
      Toast("Email marked unsent");
    }
  };
}
