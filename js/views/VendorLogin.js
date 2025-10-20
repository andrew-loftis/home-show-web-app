import { getState, vendorLogin } from "../store.js";
import { navigate } from "../router.js";

export default function VendorLogin(root) {
  const { vendors, myVendor, isAdmin } = getState();
  // If owner and approved, first visit after approval -> jump to Edit Vendor Profile
  if (!isAdmin && myVendor && myVendor.approved) {
    try {
      const key = `vendor:firstEditShown:${myVendor.id}`;
      const seen = localStorage.getItem(key);
      if (!seen) {
        localStorage.setItem(key, '1');
        // Ensure vendorLoginId set and route to editor
        try { vendorLogin(myVendor.id); } catch {}
        navigate('/edit-vendor');
        return;
      }
    } catch {}
  }
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
        `).join("") : `<div class='text-gray-400 text-sm'>${isAdmin ? 'No vendors found.' : 'You do not have a vendor assigned.'}</div>`}
      </div>
      ${!isAdmin ? `
        <div class="mt-4" id="vendorCta"></div>
      ` : ''}
    </div>
  `;
  root.querySelectorAll(".vendor-login-card").forEach(card => {
    card.onclick = () => {
      vendorLogin(card.dataset.id);
      navigate("/home");
    };
  });
  // Dynamic CTA: show status or registration based on existing vendor doc by owner
  if (!isAdmin) {
    import("../firebase.js").then(async ({ getDb }) => {
      try {
        const db = getDb();
        const { collection, query, where, getDocs, limit } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const state = getState();
        const owner = state.user?.uid || null;
        const el = root.querySelector('#vendorCta');
        if (!el) return;
        if (!owner) { el.innerHTML = `<div class='text-gray-400 text-sm'>Sign in to register as a vendor.</div>`; return; }
        const q = query(collection(db, 'vendors'), where('ownerUid', '==', owner), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          let v = null; snap.forEach(d => v = { id: d.id, ...d.data() });
          try { (await import('../store.js')).vendorLogin(v.id); } catch {}
          // Persist mapping on the user doc for robust future lookup
          try {
            const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
            await fsm.setDoc(fsm.doc(db, 'users', state.user.uid), { linkedVendorId: v.id }, { merge: true });
          } catch {}
          const editBtn = `<button class='glass-button px-3 py-2 ml-2' id='editVendorBtn'>Edit Vendor Profile</button>`;
          if (v.approved === true) {
            el.innerHTML = `<div class='text-green-400 text-sm'>Your vendor is approved.</div><div class='mt-2'>${editBtn}</div>`;
          } else {
            el.innerHTML = `<div class='text-yellow-400 text-sm'>Your registration is pending approval.</div><div class='mt-2'>${editBtn}</div>`;
          }
          const btn = el.querySelector('#editVendorBtn');
          if (btn) btn.onclick = async () => {
            try { (await import('../store.js')).vendorLogin(v.id); } catch {}
            navigate('/edit-vendor');
          };
        } else {
          el.innerHTML = `<button class='brand-bg px-4 py-2 rounded' onclick="window.location.hash='/vendor-registration'">Register as Vendor</button>`;
        }
      } catch {}
    });
  }
}
