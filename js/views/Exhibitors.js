import { getState } from "../store.js";

export default function Exhibitors(root) {
  const { vendors } = getState();
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Exhibitors</h2>
      <input type="text" placeholder="Search vendors..." class="w-full mb-4 px-3 py-2 border rounded" id="searchVendors">
      <div id="vendorList" class="grid gap-3">
        ${vendors.map(v => `
          <div class="card flex items-center gap-4 p-3 cursor-pointer vendor-card" data-id="${v.id}">
            <img src="${v.logoUrl || './assets/splash.svg'}" class="w-10 h-10 rounded" onerror="this.style.display='none'">
            <div>
              <div class="font-semibold">${v.name}</div>
              <div class="text-xs text-gray-500">${v.category}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  const input = root.querySelector("#searchVendors");
  input.oninput = () => {
    const val = input.value.toLowerCase();
    const filtered = vendors.filter(v => v.name.toLowerCase().includes(val) || v.category.toLowerCase().includes(val));
    const list = root.querySelector("#vendorList");
    list.innerHTML = filtered.map(v => `
      <div class="card flex items-center gap-4 p-3 cursor-pointer vendor-card" data-id="${v.id}">
        <img src="${v.logoUrl || './assets/splash.svg'}" class="w-10 h-10 rounded" onerror="this.style.display='none'">
        <div>
          <div class="font-semibold">${v.name}</div>
          <div class="text-xs text-gray-500">${v.category}</div>
        </div>
      </div>
    `).join("");
    list.querySelectorAll(".vendor-card").forEach(card => {
      card.onclick = () => window.location.hash = `/vendor/${card.dataset.id}`;
    });
  };
  root.querySelectorAll(".vendor-card").forEach(card => {
    card.onclick = () => window.location.hash = `/vendor/${card.dataset.id}`;
  });
}
