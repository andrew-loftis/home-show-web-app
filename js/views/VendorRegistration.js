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
            <div class="mb-2">Category</div>
            <div class="flex flex-wrap gap-1 mb-2">
              ${["Kitchen","Bath","Landscaping","Windows","Solar","Roofing","Flooring","HVAC","Painting"].map(i => `<label class='inline-flex items-center gap-1'><input type='radio' name='category' value='${i}' required> <span>${i}</span></label>`).join("")}
            </div>
            <input name="boothPreference" placeholder="Booth Preference" class="w-full mb-2 px-3 py-2 border rounded">
            <div class="text-xs text-gray-500 mb-2">Standard booth: $500. Premium: $900.</div>
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
        data.category = fd.get("category");
        data.boothPreference = fd.get("boothPreference");
        // Submit to Firestore: vendors with approved=false
        import("../firebase.js").then(async ({ getDb }) => {
          try {
            const db = getDb();
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await addDoc(collection(db, 'vendors'), {
              name: data.companyName,
              category: data.category,
              booth: data.boothPreference || '',
              contactEmail: data.email,
              contactPhone: data.phone || '',
              logoUrl: '',
              ownerUid: state.user.uid,
              approved: false,
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
  }
  render();
}
