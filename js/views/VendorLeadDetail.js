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
      <h2 class="text-xl font-bold mb-4">Lead Detail</h2>
      <div class="mb-2 font-semibold">${attendee?.name || lead.attendee_id}</div>
      <div class="text-xs text-gray-500 mb-2">${attendee?.email || ""}</div>
      <div class="text-xs text-gray-400 mb-2">${formatDate(lead.timestamp)}</div>
      <div class="mb-2">Method: <span class="text-xs">${lead.exchangeMethod || "manual"}</span></div>
      <form id="noteForm" class="mb-2">
        <textarea name="note" class="w-full border rounded p-2 mb-2" rows="3" placeholder="Add notes...">${lead.notes || ""}</textarea>
        <button class="brand-bg px-3 py-1 rounded">Save Note</button>
      </form>
      <div class="flex gap-2 items-center mb-2">
        <label class="inline-flex items-center gap-1"><input type="checkbox" id="emailSent" ${lead.emailSent ? "checked" : ""}> Email Sent</label>
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
