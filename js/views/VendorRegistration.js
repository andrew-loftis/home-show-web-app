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
  const BOOTH_PRICE = 950;
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
              <div class="mb-1 font-medium">Select Booth(s)</div>
              <div class="text-xs text-gray-500 mb-2">$${BOOTH_PRICE.toLocaleString()} per booth. Select multiple to request additional space.</div>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-2" id="boothGrid">
                ${boothOptions.map(b => `
                  <label class="glass-button px-2 py-2 text-center text-sm flex items-center justify-center gap-2">
                    <input type="checkbox" class="booth-choice" value="${b}">
                    <span>${b}</span>
                  </label>
                `).join("")}
              </div>
              <div class="mt-3 text-sm"><span class="font-medium">Selected:</span> <span id="selectedCount">0</span> booth(s) — <span class="font-medium">Total:</span> $<span id="totalPrice">0</span></div>
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
        const booths = Array.from(root.querySelectorAll('.booth-choice:checked')).map(cb => cb.value);
        const boothCount = booths.length;
        const totalPrice = boothCount * BOOTH_PRICE;
        if (!boothCount) { Toast('Please select at least one booth'); return; }
        data.category = finalCategory;
        data.booths = booths;
        data.boothCount = boothCount;
        data.totalPrice = totalPrice;
        // Submit to Firestore: vendors with approved=false
        import("../firebase.js").then(async ({ getDb }) => {
          try {
            const db = getDb();
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await addDoc(collection(db, 'vendors'), {
              name: data.companyName,
              category: data.category,
              booth: data.booths.join(', '),
              booths: data.booths,
              boothCount: data.boothCount,
              totalPrice: data.totalPrice,
              contactEmail: data.email,
              contactPhone: data.phone || '',
              logoUrl: '',
              ownerUid: state.user.uid,
              approved: false,
              status: 'pending',
              verified: false,
              profile: {},
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            Modal(document.createTextNode("Registration submitted! Waiting for admin approval."));
            setTimeout(() => { Modal(null); navigate("/home"); }, 1400);
          } catch (e) {
            Toast("Failed to submit registration");
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
        const total = count * BOOTH_PRICE;
        const sc = root.querySelector('#selectedCount');
        const tp = root.querySelector('#totalPrice');
        if (sc) sc.textContent = String(count);
        if (tp) tp.textContent = total.toLocaleString();
      };
      root.querySelectorAll('.booth-choice').forEach(cb => { cb.onchange = updatePricing; });
      updatePricing();
    }
  }
  render();
}
