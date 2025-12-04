import { getState, vendorLogin } from "../store.js";
import { navigate } from "../router.js";

export default function VendorLogin(root) {
  const { vendors, myVendor, isAdmin } = getState();
  const list = isAdmin ? vendors : (myVendor ? vendors.filter(v => v.id === myVendor.id) : []);
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Vendor Login</h2>
      <div class="grid gap-3">
        ${list.length ? list.map(v => `
          <div class="card flex items-center gap-4 p-3 cursor-pointer vendor-login-card" data-id="${v.id}">
            <img src="${v.logoUrl || './assets/splash.svg'}" class="w-10 h-10 rounded" onerror="this.style.display='none'">
            <div>
              <div class="font-semibold">${v.name}</div>
              <div class="text-xs text-gray-500">${v.category}</div>
            </div>
          </div>
        `).join("") : `<div class='text-gray-400 text-sm'>${isAdmin ? 'No vendors found.' : 'You do not have a vendor assigned. Please register.'}</div>`}
      </div>
      ${!isAdmin && !myVendor ? `
        <div class="mt-4">
          <button class="brand-bg px-4 py-2 rounded" onclick="window.location.hash='/vendor-registration'">Register as Vendor</button>
        </div>
      ` : ''}
    </div>
  `;
  root.querySelectorAll(".vendor-login-card").forEach(card => {
    card.onclick = () => {
      vendorLogin(card.dataset.id);
      navigate("/home");
    };
  });
}
