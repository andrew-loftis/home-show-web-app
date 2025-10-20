import { getState } from "../store.js";

export default function AdminDataManager(root) {
  const state = getState();
  if (!state.isAdmin) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Admin access required.</div>`;
    return;
  }
  root.innerHTML = `
    <div class='p-6 fade-in'>
      <div class='flex items-center justify-between mb-4'>
        <h2 class='text-2xl font-bold'>Data Manager</h2>
        <div class='flex gap-2'>
          <button class='glass-button px-3 py-1 text-xs' id='dm-refresh'>Refresh</button>
        </div>
      </div>
      <div class='grid gap-6'>
        <section class='glass-card p-4'>
          <div class='font-semibold mb-2'>Users</div>
          <div id='dm-users' class='grid gap-2 text-sm'><div class='text-glass-secondary text-xs'>Loading…</div></div>
        </section>
        <section class='glass-card p-4'>
          <div class='font-semibold mb-2'>Vendors (Approved + Pending)</div>
          <div id='dm-vendors' class='grid gap-2 text-sm'><div class='text-glass-secondary text-xs'>Loading…</div></div>
        </section>
        <section class='glass-card p-4'>
          <div class='font-semibold mb-2'>Attendees</div>
          <div id='dm-attendees' class='grid gap-2 text-sm'><div class='text-glass-secondary text-xs'>Loading…</div></div>
        </section>
        <section class='glass-card p-4'>
          <div class='font-semibold mb-2'>Leads</div>
          <div id='dm-leads' class='grid gap-2 text-sm'><div class='text-glass-secondary text-xs'>Loading…</div></div>
        </section>
      </div>
    </div>
  `;
  const q = (sel) => root.querySelector(sel);
  const renderList = async () => {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const fsm = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    // Users
    try {
      const snap = await fsm.getDocs(fsm.collection(db, 'users'));
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      const box = q('#dm-users');
      box.innerHTML = rows.length ? rows.map(u => `
        <div class='p-2 rounded bg-white/5 border border-white/10 flex items-center justify-between'>
          <div>
            <div class='font-medium'>${u.displayName || u.email || u.id}</div>
            <div class='text-xxs text-glass-secondary'>${u.email || ''} • role: ${u.role || '-'} ${u.linkedVendorId ? '• vendor: '+u.linkedVendorId : ''}</div>
          </div>
          <div class='flex gap-2'>
            ${u.linkedVendorId ? `<button class='btn-danger px-2 py-1 text-xxs dm-del-vendor' data-vid='${u.linkedVendorId}'>Delete Vendor</button>` : ''}
            <button class='btn-danger px-2 py-1 text-xxs dm-del-user' data-uid='${u.id}'>Delete User</button>
          </div>
        </div>
      `).join('') : `<div class='text-xxs text-glass-secondary'>No users found</div>`;
      box.querySelectorAll('.dm-del-user').forEach(btn => btn.onclick = async () => {
        if (!confirm('Delete this user profile document?')) return;
        try { await fsm.deleteDoc(fsm.doc(db, 'users', btn.dataset.uid)); btn.closest('div.p-2')?.remove(); } catch { try { await fsm.setDoc(fsm.doc(db, 'users', btn.dataset.uid), { status: 'disabled' }, { merge: true }); btn.closest('div.p-2')?.remove(); } catch {} }
      });
      box.querySelectorAll('.dm-del-vendor').forEach(btn => btn.onclick = async () => {
        if (!confirm('Delete this vendor?')) return;
        try { await fsm.deleteDoc(fsm.doc(db, 'vendors', btn.dataset.vid)); btn.closest('div.p-2')?.remove(); } catch { try { await fsm.updateDoc(fsm.doc(db, 'vendors', btn.dataset.vid), { status: 'deleted', approved: false, published: false }); btn.closest('div.p-2')?.remove(); } catch {} }
      });
    } catch {}
    // Vendors (approved + pending)
    try {
      const [snapA, snapP] = await Promise.all([
        fsm.getDocs(fsm.query(fsm.collection(db,'vendors'), fsm.where('approved','==', true))),
        fsm.getDocs(fsm.query(fsm.collection(db,'vendors'), fsm.where('approved','==', false)))
      ]);
      const rows = [];
      snapA.forEach(d=>rows.push({ id:d.id, ...d.data() }));
      snapP.forEach(d=>rows.push({ id:d.id, ...d.data() }));
      const box = q('#dm-vendors');
      box.innerHTML = rows.length ? rows.map(v => `
        <div class='p-2 rounded bg-white/5 border border-white/10 flex items-center justify-between'>
          <div>
            <div class='font-medium'>${v.name || 'Untitled'}</div>
            <div class='text-xxs text-glass-secondary'>${v.id} • ${v.contactEmail || ''} ${v.ownerUid ? '• owner: '+v.ownerUid : ''}</div>
          </div>
          <div class='flex gap-2'>
            <button class='btn-danger px-2 py-1 text-xxs dm-del-vendor-id' data-vid='${v.id}'>Delete</button>
          </div>
        </div>
      `).join('') : `<div class='text-xxs text-glass-secondary'>No vendors found</div>`;
      box.querySelectorAll('.dm-del-vendor-id').forEach(btn => btn.onclick = async () => {
        if (!confirm('Delete this vendor?')) return;
        try { await fsm.deleteDoc(fsm.doc(db, 'vendors', btn.dataset.vid)); btn.closest('div.p-2')?.remove(); } catch { try { await fsm.updateDoc(fsm.doc(db, 'vendors', btn.dataset.vid), { status: 'deleted', approved: false, published: false }); btn.closest('div.p-2')?.remove(); } catch {} }
      });
    } catch {}
    // Attendees
    try {
      const snap = await fsm.getDocs(fsm.collection(db, 'attendees'));
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      const box = q('#dm-attendees');
      box.innerHTML = rows.length ? rows.map(a => `
        <div class='p-2 rounded bg-white/5 border border-white/10 flex items-center justify-between'>
          <div>
            <div class='font-medium'>${a.name || a.email || a.id}</div>
            <div class='text-xxs text-glass-secondary'>${a.id} • owner: ${a.ownerUid || '-'} • saved: ${(a.savedVendors||[]).length}</div>
          </div>
          <div class='flex gap-2'>
            <button class='btn-danger px-2 py-1 text-xxs dm-del-att' data-id='${a.id}'>Delete</button>
          </div>
        </div>
      `).join('') : `<div class='text-xxs text-glass-secondary'>No attendees found</div>`;
      box.querySelectorAll('.dm-del-att').forEach(btn => btn.onclick = async () => {
        if (!confirm('Delete this attendee and their leads?')) return;
        try {
          const attId = btn.dataset.id;
          const qLeads = fsm.query(fsm.collection(db, 'leads'), fsm.where('attendeeId','==', attId));
          const lsnap = await fsm.getDocs(qLeads);
          const dels = [];
          lsnap.forEach(d => dels.push(fsm.deleteDoc(fsm.doc(db, 'leads', d.id))));
          await Promise.allSettled(dels);
          await fsm.deleteDoc(fsm.doc(db, 'attendees', attId));
          btn.closest('div.p-2')?.remove();
        } catch {}
      });
    } catch {}
    // Leads
    try {
      const snap = await fsm.getDocs(fsm.collection(db, 'leads'));
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      const box = q('#dm-leads');
      box.innerHTML = rows.length ? rows.map(l => `
        <div class='p-2 rounded bg-white/5 border border-white/10 flex items-center justify-between'>
          <div>
            <div class='font-medium'>${l.id}</div>
            <div class='text-xxs text-glass-secondary'>attendee: ${l.attendeeId || '-'} • vendor: ${l.vendorId || '-'} • createdBy: ${l.createdByUid || '-'}</div>
          </div>
          <div class='flex gap-2'>
            <button class='btn-danger px-2 py-1 text-xxs dm-del-lead' data-id='${l.id}'>Delete</button>
          </div>
        </div>
      `).join('') : `<div class='text-xxs text-glass-secondary'>No leads found</div>`;
      box.querySelectorAll('.dm-del-lead').forEach(btn => btn.onclick = async () => {
        if (!confirm('Delete this lead?')) return;
        try { await fsm.deleteDoc(fsm.doc(db, 'leads', btn.dataset.id)); btn.closest('div.p-2')?.remove(); } catch {}
      });
    } catch {}
  };
  renderList();
  const refresh = q('#dm-refresh');
  if (refresh) refresh.onclick = () => renderList();
}
