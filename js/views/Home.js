import { getState, currentVendor } from "../store.js";

export default function Home(root) {
  const state = getState();
  let html = "";
  if (!state.user || state.user.isAnonymous) {
    // Guest experience: sign-in/sign-up section prominent
    html = `
      <div class="container-glass fade-in">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold mb-3 text-glass">Welcome</h1>
          <p class="text-xl text-glass-secondary">Swap cards. Discover vendors. Connect fast.</p>
        </div>
        <div class="glass-card p-8 mb-8">
          <h3 class="text-xl font-semibold mb-3 text-glass text-center">Create your account</h3>
          <p class="text-glass-secondary text-center mb-4">Sign in to create your card, save vendors, and share your info.</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button class="brand-bg p-3" id="homeGoogleSignIn">Continue with Google</button>
            <button class="glass-button p-3" id="homeEmailSignIn">Sign in with Email</button>
            <button class="glass-button p-3" id="homeSignUp">Create Account</button>
          </div>
          <div class="text-center mt-4">
            <button class="glass-button px-4 py-2" id="goToMyCard">Create My Business Card</button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/vendors'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-slate-600 to-slate-800 mb-4 flex items-center justify-center">
              <ion-icon name="storefront-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Browse Vendors</h3>
            <p class="text-glass-secondary text-sm">Explore the directory. Create an account to save favorites.</p>
          </div>
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/map'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 mb-4 flex items-center justify-center">
              <ion-icon name="map-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Interactive Map</h3>
            <p class="text-glass-secondary text-sm">Find booths. An account lets you share your card on the floor.</p>
          </div>
        </div>
      </div>
    `;
  } else if (state.role === "attendee") {
    const attendee = (state.attendees && state.attendees[0]) || null;
    const hasCard = !!(attendee && attendee.card && (attendee.name || attendee.card.profileImage || attendee.card.backgroundImage || attendee.card.bio || (attendee.card.visitingReasons||[]).length));
    const renderCard = () => {
      const card = attendee?.card || {};
      const initials = (attendee?.name||'A').charAt(0).toUpperCase();
      const bg = card.backgroundImage ? `background-image:url('${card.backgroundImage}')` : '';
      return `
        <div class="glass-card p-6 mb-6">
          <div class="relative rounded-xl overflow-hidden border border-white/15" style="${bg}; background-size:cover; background-position:center;">
            <div class="backdrop-blur-sm bg-black/30 p-4 flex items-center gap-3">
              ${card.profileImage ? `<img src='${card.profileImage}' class='w-14 h-14 rounded-full object-cover border border-white/20' onerror="this.style.display='none'">` : `
                <div class='w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center border border-white/20'>
                  <span class='text-white font-bold text-xl'>${initials}</span>
                </div>
              `}
              <div>
                <div class="text-white font-semibold text-lg">${attendee?.name || 'Your Name'}</div>
                <div class="text-white/80 text-sm">${attendee?.email || ''}${attendee?.phone ? ' • ' + attendee.phone : ''}</div>
                ${card.location ? `<div class='text-white/80 text-xs mt-1'>${card.location}</div>` : ''}
              </div>
            </div>
          </div>
          ${card.bio ? `<div class='text-glass mt-3 text-sm'>${card.bio}</div>` : ''}
          ${(card.visitingReasons||[]).length ? `<div class='mt-2 text-xs text-glass-secondary'>Reasons: ${(card.visitingReasons||[]).join(', ')}</div>` : ''}
          <div class='mt-4 flex gap-2'>
            <button class='glass-button px-4 py-2' onclick="window.location.hash='/cards'">View Card</button>
            <button class='brand-bg px-4 py-2' onclick="window.location.hash='/my-card'">Edit Card</button>
          </div>
        </div>
      `;
    };
    html = `
      <div class="container-glass fade-in">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold mb-3 text-glass">Welcome Back</h1>
          <p class="text-xl text-glass-secondary">${hasCard ? 'Here’s your card. You can share it with vendors on the floor.' : 'Create your digital business card and connect with amazing vendors'}</p>
        </div>
        ${hasCard ? renderCard() : `
          <div class="glass-card p-8 mb-8 text-center">
            <div class="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 mx-auto mb-4 flex items-center justify-center">
              <ion-icon name="card-outline" class="text-white text-2xl"></ion-icon>
            </div>
            <h3 class="text-xl font-semibold mb-2 text-glass">Your Digital Business Card</h3>
            <p class="text-glass-secondary mb-6">Share your information instantly with vendors you're interested in</p>
            <button class="brand-bg px-8 py-4 text-lg font-semibold" onclick="window.location.hash='/cards'">
              Create My Business Card
            </button>
          </div>
        `}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/vendors'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-slate-600 to-slate-800 mb-4 flex items-center justify-center">
              <ion-icon name="storefront-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Browse Vendors</h3>
            <p class="text-glass-secondary text-sm">Explore vendor galleries and find the perfect services for your needs</p>
          </div>
          
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/map'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 mb-4 flex items-center justify-center">
              <ion-icon name="map-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Interactive Map</h3>
            <p class="text-glass-secondary text-sm">Navigate the venue and locate vendor booths with ease</p>
          </div>
        </div>
      </div>
    `;
  } else if (state.role === "vendor") {
    const vendor = currentVendor();
    html = `
      <div class="container-glass fade-in">
        <div class="glass-card p-8 mb-8">
          <div class="flex items-center gap-6 mb-6">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
              ${vendor?.logoUrl ? `<img src="${vendor.logoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : `<ion-icon name="business-outline" class="text-white text-2xl"></ion-icon>`}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-glass">${vendor?.name || "Vendor Dashboard"}</h1>
              <p class="text-glass-secondary">Booth ${vendor?.booth || "-"} • ${vendor?.category || "General"}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="glass-card p-6 text-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-3 flex items-center justify-center">
                <ion-icon name="people-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div class="text-sm text-glass-secondary mb-1">Total Leads</div>
              <div class="text-3xl font-bold text-glass">${vendor ? vendor.leadCount || 0 : 0}</div>
            </div>
            <div class="glass-card p-6 text-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-r from-teal-600 to-green-600 mx-auto mb-3 flex items-center justify-center">
                <ion-icon name="trending-up-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div class="text-sm text-glass-secondary mb-1">This Hour</div>
              <div class="text-3xl font-bold text-glass">0</div>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/cards'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-slate-600 to-blue-600 mb-4 flex items-center justify-center">
              <ion-icon name="card-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Business Cards</h3>
            <p class="text-glass-secondary text-sm">View and manage your digital business cards</p>
          </div>
          
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/vendor-leads'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 mb-4 flex items-center justify-center">
              <ion-icon name="analytics-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Lead Management</h3>
            <p class="text-glass-secondary text-sm">Track and analyze your leads and interactions</p>
          </div>
          
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/edit-vendor'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-slate-700 mb-4 flex items-center justify-center">
              <ion-icon name="settings-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Profile Settings</h3>
            <p class="text-glass-secondary text-sm">Update your vendor profile and preferences</p>
          </div>
        </div>
      </div>
    `;
  } else if (state.role === "organizer") {
    html = `
      <div class="p-6 fade-in">
        <div class="dark-bg rounded-xl p-4 mb-4">
          <div class="font-bold text-lg">Organizer Dashboard</div>
        </div>
        <div class="grid gap-3">
          <button class="card p-4 text-left w-full" onclick="window.location.hash='/admin'">Admin Dashboard</button>
          <button class="card p-4 text-left w-full" onclick="window.location.hash='/vendors'">Vendor Directory</button>
          <button class="card p-4 text-left w-full" onclick="window.location.hash='/schedule'">Schedule</button>
          <button class="card p-4 text-left w-full" onclick="window.location.hash='/map'">Floor Plan</button>
        </div>
      </div>
    `;
  } else {
    html = `<div class="p-8 text-center text-gray-400">Please select a role.</div>`;
  }
  root.innerHTML = html;

  // Wire up home auth buttons if present
  if (!state.user || state.user.isAnonymous) {
    import("../firebase.js").then(({ signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword }) => {
      const g = root.querySelector('#homeGoogleSignIn');
      const e = root.querySelector('#homeEmailSignIn');
      const s = root.querySelector('#homeSignUp');
      const go = root.querySelector('#goToMyCard');
      if (g) g.onclick = async () => { try { await signInWithGoogle(); } catch {} };
      if (e) e.onclick = () => { window.location.hash = '/more'; };
      if (s) s.onclick = () => { window.location.hash = '/more'; };
      if (go) go.onclick = () => { window.location.hash = '/my-card'; };
    });
  }
}
