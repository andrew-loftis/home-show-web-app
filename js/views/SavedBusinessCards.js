import { getState } from "../store.js";

export default function SavedBusinessCards(root) {
  const state = getState();
  const attendee = state.attendees[0];
  const saved = attendee?.savedBusinessCards || [];
  const vendors = state.vendors.filter(v => saved.includes(v.id));
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Saved Business Cards</h2>
      ${vendors.length ? vendors.map(v => `
        <div class="card flex items-center gap-4 p-3 mb-2">
          <img src="${v.logoUrl || './assets/splash.svg'}" class="w-10 h-10 rounded" onerror="this.style.display='none'">
          <div class="flex-1">
            <div class="font-semibold">${v.name}</div>
            <div class="text-xs text-gray-500">${v.category}</div>
          </div>
          <button class="brand-bg px-3 py-1 rounded" onclick="window.location.hash='/vendor/${v.id}'">Open</button>
        </div>
      `).join("") : `<div class='text-gray-400 text-center py-8'>No business cards saved.<br><span class='text-xs'>Tap 'Save Business Card' on a vendor page.</span></div>`}
    </div>
  `;
}
