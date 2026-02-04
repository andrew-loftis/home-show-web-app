import { getState, leadsForVendor } from "../store.js";
import { formatDate } from "../utils/format.js";
import { EmptyLeads, SkeletonCard } from "../utils/skeleton.js";

export default async function VendorLeads(root) {
  const state = getState();
  
  // Show loading initially
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-glass">My Leads</h1>
          <p class="text-glass-secondary text-sm">Loading...</p>
        </div>
      </div>
      ${SkeletonCard()}
      ${SkeletonCard()}
      ${SkeletonCard()}
    </div>
  `;
  
  // Try multiple ways to find the vendor (same as EditVendorProfile)
  let vendor = null;
  let vendorId = null;
  
  // Method 1: Check vendorLoginId (legacy vendor login flow)
  if (state.vendorLoginId && state.vendors) {
    vendor = state.vendors.find(v => v.id === state.vendorLoginId);
    vendorId = state.vendorLoginId;
  }
  
  // Method 2: Check myVendor
  if (!vendor && state.myVendor) {
    vendor = state.myVendor;
    vendorId = state.myVendor.id;
  }
  
  // Method 3: Query Firestore by ownerUid
  if (!vendor && state.user && !state.user.isAnonymous) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        vendor = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        vendorId = vendor.id;
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  }
  
  if (!vendor) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ion-icon name="alert-circle-outline" class="text-3xl text-red-400"></ion-icon>
          </div>
          <h2 class="text-xl font-bold mb-2 text-glass">Vendor Not Found</h2>
          <p class="text-glass-secondary mb-6">Please make sure you're logged in with your vendor account.</p>
          <button class="glass-button px-6 py-3" onclick="window.location.hash='/vendor-dashboard'">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  // Load leads from Firestore with full attendee data
  let leads = [];
  let attendeeMap = {};
  
  try {
    const { getDb, getLeadsForVendor } = await import("../firebase.js");
    const db = getDb();
    const { collection, query, where, getDocs, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    
    // Fetch leads from Firestore
    const leadsData = await getLeadsForVendor(vendorId, 100);
    leads = leadsData.map(l => ({
      id: l.id,
      attendee_id: l.attendeeId,
      vendor_id: l.vendorId,
      timestamp: l.timestamp || (l.createdAt?.seconds ? l.createdAt.seconds * 1000 : Date.now()),
      exchangeMethod: l.exchangeMethod || 'card_share',
      emailSent: l.emailSent || false,
      cardShared: l.cardShared || false,
      notes: l.notes || '',
      attendeeName: l.attendeeName || '',
      attendeeEmail: l.attendeeEmail || '',
      attendeePhone: l.attendeePhone || ''
    }));
    
    // Fetch attendee details for each lead
    const attendeeIds = [...new Set(leads.map(l => l.attendee_id).filter(Boolean))];
    for (const attId of attendeeIds) {
      try {
        const attDoc = await getDoc(doc(db, 'attendees', attId));
        if (attDoc.exists()) {
          attendeeMap[attId] = { id: attId, ...attDoc.data() };
        }
      } catch (e) {
        console.warn('Could not fetch attendee:', attId, e);
      }
    }
  } catch (error) {
    console.error('Error loading leads:', error);
    // Fall back to local state leads
    leads = leadsForVendor(vendorId);
  }
  
  // Helper function to get display name for a lead
  const getLeadDisplayName = (lead) => {
    // Check if lead already has name/email from lead capture
    if (lead.attendeeName) return lead.attendeeName;
    
    // Check attendee map
    const attendee = attendeeMap[lead.attendee_id];
    if (attendee?.name) return attendee.name;
    if (attendee?.email) return attendee.email;
    
    // Check local state
    const localAttendee = state.attendees.find(a => a.id === lead.attendee_id);
    if (localAttendee?.name) return localAttendee.name;
    if (localAttendee?.email) return localAttendee.email;
    
    return 'Anonymous Visitor';
  };
  
  const getLeadEmail = (lead) => {
    if (lead.attendeeEmail) return lead.attendeeEmail;
    const attendee = attendeeMap[lead.attendee_id];
    if (attendee?.email) return attendee.email;
    const localAttendee = state.attendees.find(a => a.id === lead.attendee_id);
    return localAttendee?.email || '';
  };
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/vendor-dashboard'">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back to Dashboard</span>
      </button>
      
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-glass">My Leads</h1>
          <p class="text-glass-secondary text-sm">${vendor?.name || "Vendor"}</p>
        </div>
        ${leads.length ? `
          <div class="text-right">
            <div class="text-2xl font-bold text-glass">${leads.length}</div>
            <div class="text-xs text-glass-secondary">Total leads</div>
          </div>
        ` : ''}
      </div>
      
      ${leads.length ? `
        <div class="space-y-3">
          ${leads.map(l => {
            const displayName = getLeadDisplayName(l);
            const email = getLeadEmail(l);
            return `
            <div class="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors lead-card touch-target" data-id="${l.id}">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                <span class="font-bold text-emerald-400">${displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-glass truncate">${displayName}</div>
                ${email ? `<div class="text-xs text-glass-secondary truncate">${email}</div>` : ''}
                <div class="text-xs text-glass-secondary flex items-center gap-2 mt-1">
                  <span class="flex items-center gap-1">
                    <ion-icon name="${l.exchangeMethod === 'card_share' ? 'swap-horizontal-outline' : 'pencil-outline'}" class="text-xs"></ion-icon>
                    ${l.exchangeMethod === 'card_share' ? 'Card swap' : 'Manual lead'}
                  </span>
                  ${l.emailSent ? `<span class="text-green-400 flex items-center gap-1"><ion-icon name="mail-outline" class="text-xs"></ion-icon> Email sent</span>` : ""}
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-xs text-glass-secondary">${formatDate(l.timestamp)}</div>
                <ion-icon name="chevron-forward-outline" class="text-glass-secondary"></ion-icon>
              </div>
            </div>
          `}).join("")}
        </div>
      ` : EmptyLeads()}
    </div>
  `;
  
  root.querySelectorAll(".lead-card").forEach(card => {
    card.onclick = () => window.location.hash = `/vendor-lead/${card.dataset.id}`;
  });
}
