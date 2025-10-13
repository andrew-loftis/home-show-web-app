import { getState, topVendorsByLeadCount } from "../store.js";

export default function AdminDashboard(root) {
  const state = getState();
  if (!state.isAdmin) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Admin access required.</div>`;
    return;
  }
  const topVendors = topVendorsByLeadCount();
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Admin Dashboard</h2>
      <div class="grid grid-cols-2 gap-4 mb-4" id="counts">
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Attendees</div>
          <div class="text-xl font-bold" id="count-attendees">…</div>
        </div>
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Vendors</div>
          <div class="text-xl font-bold" id="count-vendors">…</div>
        </div>
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Leads</div>
          <div class="text-xl font-bold" id="count-leads">…</div>
        </div>
      </div>
      <div class="mb-2 font-semibold">Top Vendors by Leads</div>
      <div class="grid gap-2 mb-4">
        ${topVendors.map(v => `<div class='card p-2 flex items-center gap-3'><img src='${v.logoUrl || './assets/splash.svg'}' class='w-8 h-8 rounded' onerror='this.style.display="none"'><div class='flex-1'>${v.name}</div><div class='text-xs text-gray-500'>${v.leadCount} leads</div></div>`).join("")}
      </div>
      <div class="font-semibold mb-2">Approvals</div>
      <div id="pendingVendors" class="grid gap-2 mb-4">
        <div class="text-gray-400 text-xs">Loading pending vendors…</div>
      </div>

      <div class="font-semibold mb-2">User Management</div>
      <div id="userManagement" class="grid gap-2">
        <div class="text-gray-400 text-xs">Loading users…</div>
      </div>
    </div>
  `;
  // Server-side counts (admins only)
  if (state.isAdmin) {
    import("../firebase.js").then(async ({ getCollectionCount }) => {
      const set = (id, val) => { const el = root.querySelector(id); if (el) el.textContent = String(val); };
      try { set('#count-attendees', await getCollectionCount('attendees')); } catch { set('#count-attendees', state.attendees.length); }
      try { set('#count-vendors', await getCollectionCount('vendors')); } catch { set('#count-vendors', state.vendors.length); }
      try { set('#count-leads', await getCollectionCount('leads')); } catch { set('#count-leads', state.leads.length); }
    });
  } else {
    // Fallback to local state lengths
    const set = (id, val) => { const el = root.querySelector(id); if (el) el.textContent = String(val); };
    set('#count-attendees', state.attendees.length);
    set('#count-vendors', state.vendors.length);
    set('#count-leads', state.leads.length);
  }
  // If admin, load pending vendors
  if (state.isAdmin) {
    import("../firebase.js").then(async ({ getDb }) => {
      try {
        const db = getDb();
        const { collection, query, where, getDocs, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const q = query(collection(db, 'vendors'), where('approved', '==', false));
        const snap = await getDocs(q);
        const container = root.querySelector('#pendingVendors');
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (!list.length) {
          container.innerHTML = `<div class='text-gray-400 text-xs'>No pending vendors.</div>`;
        } else {
          container.innerHTML = list.map(v => `
            <div class='card p-3'>
              <div class='flex items-start gap-3'>
                <img src='${v.logoUrl || './assets/splash.svg'}' class='w-10 h-10 rounded' onerror='this.style.display="none"'>
                <div class='flex-1'>
                  <div class='font-semibold'>${v.name || 'Untitled'} <span class='text-xs text-gray-500'>${v.ownerUid ? 'by ' + v.ownerUid : ''}</span></div>
                  <div class='text-xs text-gray-500 mt-1'>Category: ${v.category || '-'} | Booths: ${(v.booths||[]).join(', ') || v.booth || '-'} | Package: ${v.packageLabel || '-'} ($${(v.packagePrice||0).toLocaleString()}) | Extras: ${v.power? 'Power ($75)' : ''} ${v.tableChairs? (v.power? ' + ' : '') + 'Table & 2 Chairs ($25)' : ''} | Grand Total: $${(v.grandTotal||v.totalPrice||0).toLocaleString()}</div>
                </div>
                <div class='flex gap-2'>
                  <button class='brand-bg px-3 py-1 rounded approve-btn' data-id='${v.id}'>Approve</button>
                  <button class='glass-button px-3 py-1 rounded deny-btn' data-id='${v.id}'>Deny</button>
                </div>
              </div>
            </div>
          `).join("");
          container.querySelectorAll('.approve-btn').forEach(btn => {
            btn.onclick = async () => {
              try {
                await updateDoc(doc(db, 'vendors', btn.dataset.id), { approved: true });
                btn.closest('.card').remove();
              } catch {}
            };
          });
          container.querySelectorAll('.deny-btn').forEach(btn => {
            btn.onclick = async () => {
              try {
                await updateDoc(doc(db, 'vendors', btn.dataset.id), { status: 'denied' });
                btn.closest('.card').remove();
              } catch {}
            };
          });
        }
      } catch (e) {
        const container = root.querySelector('#pendingVendors');
        if (container) container.innerHTML = `<div class='text-red-500 text-xs'>Failed to load pending vendors</div>`;
      }
    });
  }

  // User management
  if (state.isAdmin) {
    import("../firebase.js").then(async ({ getDb, addAdminEmail, removeAdminEmail }) => {
      try {
        const db = getDb();
        const { collection, getDocs, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = [];
        usersSnap.forEach(d => users.push({ id: d.id, ...d.data() }));
        const container = root.querySelector('#userManagement');
        if (!users.length) {
          container.innerHTML = `<div class='text-gray-400 text-xs'>No users found.</div>`;
        } else {
          container.innerHTML = users.map(u => `
            <div class='card p-3 flex items-center gap-3'>
              <div class='flex-1'>
                <div class='font-semibold'>${u.displayName || u.email || u.id}</div>
                <div class='text-xs text-gray-500'>${u.email || '-'} • Role: ${u.role || 'visitor'} ${u.security?.isAdmin ? '• Admin' : ''}</div>
              </div>
              <div class='flex items-center gap-2'>
                <select class='glass-input text-sm role-select' data-uid='${u.id}'>
                  ${['visitor','attendee','vendor','organizer','admin','super_admin'].map(r => `<option value='${r}' ${u.role===r?'selected':''}>${r}</option>`).join('')}
                </select>
                <button class='glass-button px-2 py-1 text-xs grant-admin' data-email='${(u.email||'').toLowerCase()}'>Grant Admin</button>
                <button class='glass-button px-2 py-1 text-xs revoke-admin' data-email='${(u.email||'').toLowerCase()}'>Revoke Admin</button>
              </div>
            </div>
          `).join("");
          // Wire role change
          container.querySelectorAll('.role-select').forEach(sel => {
            sel.onchange = async () => {
              const uid = sel.dataset.uid;
              const role = sel.value;
              try {
                await setDoc(doc(db, 'users', uid), { role }, { merge: true });
                sel.classList.add('brand-bg');
                setTimeout(()=>sel.classList.remove('brand-bg'), 600);
              } catch {}
            };
          });
          // Admin grant/revoke
          container.querySelectorAll('.grant-admin').forEach(btn => {
            btn.onclick = async () => {
              const email = btn.dataset.email;
              if (!email) return;
              await addAdminEmail(email, state.user?.uid||null);
              btn.textContent = 'Granted';
              setTimeout(()=>btn.textContent='Grant Admin', 800);
            };
          });
          container.querySelectorAll('.revoke-admin').forEach(btn => {
            btn.onclick = async () => {
              const email = btn.dataset.email;
              if (!email) return;
              await removeAdminEmail(email);
              btn.textContent = 'Revoked';
              setTimeout(()=>btn.textContent='Revoke Admin', 800);
            };
          });
        }
      } catch (e) {
        const container = root.querySelector('#userManagement');
        if (container) container.innerHTML = `<div class='text-red-500 text-xs'>Failed to load users</div>`;
      }
    });
  }
}