import { Modal, Toast } from "../utils/ui.js";
import { navigate } from "../router.js";
import { getState } from "../store.js";

export default function VendorRegistration(root) {
  const state = getState();
  if (!state.user) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Please sign in to register as a vendor.</div>`;
    return;
  }
  let step = 1;
  let data = {};
  // Expanded categories
  const categories = [
    "Kitchen","Bath","Landscaping","Windows","Doors","Solar","Roofing","Flooring","HVAC","Painting",
    "Plumbing","Electrical","Decks & Patios","Pools & Spas","Siding","Gutters","Insulation","Smart Home",
    "Security","Cabinets","Countertops","Tile & Stone","Appliances","Furniture","Interior Design","Lighting",
    "Garage","Fencing","Masonry","Concrete","Pest Control","Water Treatment","Home Cleaning","Remodeling",
    "General Contractor","Real Estate","Mortgage","Insurance","Energy Efficiency","Outdoor Living",
    "Garden/Nursery","Home Theater/AV","Other"
  ];
  // Booth options (example layout A1-A10, B1-B10, C1-C10)
  const boothOptions = (() => {
    const rows = ['A','B','C'];
    const out = [];
    rows.forEach(r => { for (let i=1;i<=10;i++) out.push(`${r}${i}`); });
    return out;
  })();
  // Official pricing packages
  const PACKAGES = [
    { id: 'inline_8x8', label: '8x8 Inline', price: 795.00 },
    { id: 'double_inline_8x16', label: 'Double Inline Booth 8x16', price: 1590.00 },
    { id: 'triple_inline_8x24', label: 'Triple Inline Booth 8x24', price: 2385.00 },
    { id: 'quad_inline_8x32', label: 'Quad Inline Booth 8x32', price: 3180.00 },
    { id: 'triple_corner_l', label: 'Triple Corner Booth (L-Shape)', price: 2485.00 },
    { id: 'outdoor_10x10', label: 'Outdoor (in Tent) 10x10', price: 695.00 },
    { id: 'outdoor_double_10x20', label: 'Outdoor Double (In Tent) 10x20', price: 1390.00 },
    { id: 'outdoor_triple_10x30', label: 'Outdoor Triple (in tent) 10x30', price: 2085.00 },
    { id: 'sponsorship', label: 'Sponsorship Package', price: 3995.00 }
  ];
  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-4">Vendor Registration</h2>
        <div class="mb-4 flex gap-2 items-center">
          <div class="w-6 h-2 rounded ${step>=1?'bg-primary':'bg-gray-200'}"></div>
          <div class="w-6 h-2 rounded ${step>=2?'bg-primary':'bg-gray-200'}"></div>
          <div class="w-6 h-2 rounded ${step>=3?'bg-primary':'bg-gray-200'}"></div>
        </div>
        <form id="regForm" class="card p-4">
          ${step===1?`
            <input name="companyName" required placeholder="Company Name" class="w-full mb-2 px-3 py-2 border rounded">
            <input name="contactName" required placeholder="Contact Name" class="w-full mb-2 px-3 py-2 border rounded">
          `:step===2?`
            <input name="email" required type="email" placeholder="Email" class="w-full mb-2 px-3 py-2 border rounded">
            <input name="phone" placeholder="Phone" class="w-full mb-2 px-3 py-2 border rounded">
          `:step===3?`
            <div class="mb-3">
              <div class="mb-1 font-medium">Category</div>
              <select name="category" required class="w-full mb-2 px-3 py-2 border rounded">
                <option value="" disabled selected>Select a category</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
              <input name="customCategory" placeholder="If Other, enter your category" class="w-full mb-2 px-3 py-2 border rounded hidden">
            </div>
            <div class="mb-3">
              <div class="mb-1 font-medium">Booth Package</div>
              <div class="grid gap-2">
                ${PACKAGES.map(p => `
                  <label class="glass-button px-3 py-2 flex items-center gap-3">
                    <input type="radio" name="packageId" value="${p.id}" data-price="${p.price}" data-label="${p.label}">
                    <span class="flex-1">${p.label}</span>
                    <span class="text-sm text-glass-secondary">$${p.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </label>
                `).join("")}
              </div>
            </div>
            <div class="mb-3">
              <div class="mb-1 font-medium">Preferred Booth(s) (optional)</div>
              <div class="text-xs text-gray-500 mb-2">Choose your preferred indoor booth numbers (if applicable). We'll do our best to accommodate.</div>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-2" id="boothGrid">
                ${boothOptions.map(b => `
                  <label class="glass-button px-2 py-2 text-center text-sm flex items-center justify-center gap-2">
                    <input type="checkbox" class="booth-choice" value="${b}">
                    <span>${b}</span>
                  </label>
                `).join("")}
              </div>
              <div class="mt-3 text-sm flex items-center gap-2 flex-wrap">
                <div><span class="font-medium">Selected:</span> <span id="selectedCount">0</span> booth(s)</div>
                <div class="opacity-50">•</div>
                <div><span class="font-medium">Package Total:</span> $<span id="totalPrice">0</span></div>
              </div>
            </div>
            <div class="mb-3">
              <div class="mb-1 font-medium">Extras</div>
              <div class="grid sm:grid-cols-2 gap-2">
                <label class="glass-button px-3 py-2 flex items-center justify-between">
                  <span>Power</span>
                  <span class="text-sm text-glass-secondary">$75</span>
                  <input type="checkbox" name="power" class="ml-2">
                </label>
                <label class="glass-button px-3 py-2 flex items-center justify-between">
                  <span>Table & 2 Chairs (2-day rental)</span>
                  <span class="text-sm text-glass-secondary">$25</span>
                  <input type="checkbox" name="tableChairs" class="ml-2">
                </label>
              </div>
              <div class="mt-2 text-sm">
                <div><span class="font-medium">Extras Total:</span> $<span id="extrasTotal">0</span></div>
                <div><span class="font-medium">Grand Total:</span> $<span id="grandTotal">0</span></div>
              </div>
            </div>
            <div class="mb-3">
              <div class="mb-1 font-medium">Exhibitor Agreement</div>
              <div class="text-xs text-gray-500 mb-2">You must agree to the Exhibitor Agreement to submit. <button type="button" id="viewContract" class="text-primary underline">View agreement</button></div>
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="agreeContract" required>
                <span>I have read and agree to the Exhibitor Agreement.</span>
              </label>
            </div>
          `:""}
          <div class="flex gap-2 mt-2">
            ${step>1?'<button type="button" class="px-3 py-1 bg-gray-100 rounded" id="backBtn">Back</button>':''}
            <button class="brand-bg px-4 py-1 rounded flex-1">${step<3?'Next':'Submit'}</button>
          </div>
        </form>
      </div>
    `;
    if (step>1) root.querySelector("#backBtn").onclick = () => { step--; render(); };
    root.querySelector("#regForm").onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (step===1) {
        data.companyName = fd.get("companyName");
        data.contactName = fd.get("contactName");
        step++;
        render();
      } else if (step===2) {
        data.email = fd.get("email");
        data.phone = fd.get("phone");
        step++;
        render();
      } else if (step===3) {
        const selectedCategory = fd.get("category");
        const customCategory = root.querySelector('input[name="customCategory"]').value.trim();
        const finalCategory = selectedCategory === 'Other' && customCategory ? customCategory : selectedCategory;
        const pkgEl = root.querySelector('input[name="packageId"]:checked');
        if (!pkgEl) { Toast('Please select a booth package'); return; }
        const pkgId = pkgEl.value;
        const pkgLabel = pkgEl.dataset.label;
        const pkgPrice = Number(pkgEl.dataset.price || 0);
        const booths = Array.from(root.querySelectorAll('.booth-choice:checked')).map(cb => cb.value);
        const boothCount = booths.length;
        const wantsPower = !!root.querySelector('input[name="power"]')?.checked;
        const wantsTable = !!root.querySelector('input[name="tableChairs"]')?.checked;
        const extras = (wantsPower ? 75 : 0) + (wantsTable ? 25 : 0);
        const totalPrice = pkgPrice;
        const grandTotal = totalPrice + extras;
        const agree = !!root.querySelector('input[name="agreeContract"]')?.checked;
        if (!agree) { Toast('You must agree to the Exhibitor Agreement'); return; }
        data.category = finalCategory;
        data.booths = booths;
        data.boothCount = boothCount;
        data.totalPrice = totalPrice;
        data.packageId = pkgId;
        data.packageLabel = pkgLabel;
        data.packagePrice = pkgPrice;
        data.power = wantsPower;
        data.powerPrice = wantsPower ? 75 : 0;
        data.tableChairs = wantsTable;
        data.tableChairsPrice = wantsTable ? 25 : 0;
        data.extrasTotal = extras;
        data.grandTotal = grandTotal;
        data.agreedToContract = agree;
        data.agreedAt = Date.now();
        // Submit to Firestore
        import("../firebase.js").then(async ({ getDb, initFirebase }) => {
          try {
            try { initFirebase(); } catch {}
            const db = getDb();
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            // Create vendor doc as pending; avoid restricted fields like 'approved' on create
            await addDoc(collection(db, 'vendors'), {
              name: data.companyName,
              category: data.category,
              booth: data.booths.join(', '),
              booths: data.booths,
              boothCount: data.boothCount,
              totalPrice: data.totalPrice,
              packageId: data.packageId,
              packageLabel: data.packageLabel,
              packagePrice: data.packagePrice,
              power: data.power,
              powerPrice: data.powerPrice,
              tableChairs: data.tableChairs,
              tableChairsPrice: data.tableChairsPrice,
              extrasTotal: data.extrasTotal,
              grandTotal: data.grandTotal,
              agreedToContract: data.agreedToContract,
              contactEmail: data.email,
              contactPhone: data.phone || '',
              logoUrl: '',
              ownerUid: state.user.uid,
              status: 'pending',
              profile: {},
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            Modal(document.createTextNode("Registration submitted! Waiting for admin approval."));
            setTimeout(() => { Modal(null); navigate("/home"); }, 1400);
          } catch (e) {
            Toast("Failed to submit registration: " + (e?.message || ''));
          }
        });
      }
    };
    // dynamic UI hooks for step 3
    if (step===3) {
      const sel = root.querySelector('select[name="category"]');
      const custom = root.querySelector('input[name="customCategory"]');
      if (sel && custom) {
        sel.onchange = () => {
          custom.classList.toggle('hidden', sel.value !== 'Other');
        };
      }
      const updatePricing = () => {
        const count = root.querySelectorAll('.booth-choice:checked').length;
        const pkgEl = root.querySelector('input[name="packageId"]:checked');
        const price = pkgEl ? Number(pkgEl.dataset.price || 0) : 0;
        const extras = (root.querySelector('input[name="power"]')?.checked ? 75 : 0) + (root.querySelector('input[name="tableChairs"]')?.checked ? 25 : 0);
        const sc = root.querySelector('#selectedCount');
        const tp = root.querySelector('#totalPrice');
        const et = root.querySelector('#extrasTotal');
        const gt = root.querySelector('#grandTotal');
        if (sc) sc.textContent = String(count);
        if (tp) tp.textContent = price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
        if (et) et.textContent = extras.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
        if (gt) gt.textContent = (price + extras).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
      };
      root.querySelectorAll('.booth-choice').forEach(cb => { cb.onchange = updatePricing; });
      root.querySelectorAll('input[name="packageId"]').forEach(rb => { rb.onchange = updatePricing; });
      const powerEl = root.querySelector('input[name="power"]');
      const tableEl = root.querySelector('input[name="tableChairs"]');
      if (powerEl) powerEl.onchange = updatePricing;
      if (tableEl) tableEl.onchange = updatePricing;
      const vc = root.querySelector('#viewContract');
      if (vc) vc.onclick = () => {
        const node = document.createElement('div');
        node.innerHTML = `
          <div class='max-h-[70vh] overflow-y-auto text-sm text-left px-1'>
            <h3 class='text-lg font-semibold mb-2'>Exhibitor Agreement</h3>
            <ol class='list-decimal pl-5 space-y-2'>
              <li>Your location within the exhibit area will be determined by the organizer. You will occupy only the licensed area and conduct your business at your own risk and in a business-like manner in accordance with all applicable laws. Violations may result in ejection without refund.</li>
              <li>All exhibits must remain intact during show hours and materials must be removed by the specified time after show end. You agree to staff your booth for the entire period the show is open on all show days.</li>
              <li>The organizer and venue are not responsible if the event is cancelled/shortened or dates changed due to inclement weather, acts of God or nature, acts of war, or other reasons.</li>
              <li>No refunds will be made if the exhibitor cancels after submitting the agreement. Unpaid balances by the due date may be charged to a card on file.</li>
              <li>Exhibitor agrees to indemnify and hold harmless the organizer and venue, their successors and assigns, from any liabilities or damages arising from the exhibitor’s operations. Insurance of no less than one million dollars may be required.</li>
              <li>The agreement may be terminated at the organizer’s discretion without notice due to breach by the exhibitor of terms and conditions, without liability to the exhibitor.</li>
              <li>By submitting electronically, you agree your submission is valid.</li>
            </ol>
          </div>
        `;
        Modal(node);
      };
      updatePricing();
    }
  }
  render();
}
