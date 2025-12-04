import { getState, currentVendor } from "../store.js";
import { shouldShowTour, markTourComplete, maybeRunTour } from "../utils/tour.js";
import { Toast } from "../utils/ui.js";
import { initLazyBackgrounds } from "../utils/lazyImages.js";

// Compact card renderer for preview
function renderCompactCard(attendee) {
  if (!attendee.card) return "";
  
  const card = attendee.card;
  return `
    <div class="glass-card overflow-hidden max-w-xs shadow-glass">
      ${card.backgroundImage ? `
        <div class="h-24 lazy-bg bg-cover bg-center relative" data-bg="${card.backgroundImage}" style="background: linear-gradient(to bottom right, #334155, #1e293b);">
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
      ` : `<div class="h-24 bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900"></div>`}
      
      <div class="p-3 relative">
        ${card.profileImage ? `
          <div class="w-12 h-12 -top-6 left-3 rounded-full border-4 border-white/50 absolute overflow-hidden backdrop-blur-sm bg-white/20">
            <img src="${card.profileImage}"
                 class="lazy-img"
                 loading="lazy"
                 style="width:100%;height:100%;object-fit:cover;object-position:${(card.profileImageX ?? 50)}% ${(card.profileImageY ?? 50)}%;transform:scale(${(card.profileImageZoom ?? 100) / 100})"
                 onerror="this.style.display='none'"/>
          </div>
        ` : `
          <div class="w-12 h-12 -top-6 left-3 rounded-full border-4 border-white/50 absolute bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
            <span class="text-white font-bold text-sm">${(attendee.name || 'A').charAt(0)}</span>
          </div>
        `}
        
        <div class="mt-8">
          <div class="font-bold text-sm text-glass mb-1">${attendee.name}</div>
          ${card.location ? `<div class="text-xs text-glass-secondary mb-2">${card.location}</div>` : ""}
          ${card.visitingReasons?.length ? `
            <div class="text-xs text-glass-secondary mt-2">
              ${card.visitingReasons.slice(0, 2).join(", ")}${card.visitingReasons.length > 2 ? ` +${card.visitingReasons.length - 2} more` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

export default function Home(root) {
  const state = getState();
  let html = "";
  if (!state.user || state.user.isAnonymous) {
    // Guest experience: sign-in/sign-up section prominent
    html = `
      <div class="container-glass fade-in">
        <!-- Hero Section -->
        <div class="relative overflow-hidden rounded-2xl glass-card mb-8 p-8">
          <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -mr-12 -mt-12"></div>
          <div class="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl -ml-8 -mb-8"></div>
          
          <div class="relative text-center">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium mb-4">
              <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live Event
            </div>
            <h1 class="text-3xl md:text-4xl font-bold mb-3 text-glass">Putnam County<br><span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Home Show 2025</span></h1>
            <p class="text-lg text-glass-secondary mb-4">Swap cards. Discover vendors. Connect fast.</p>
            <button id="startTour" class="inline-flex items-center gap-2 glass-button px-4 py-2">
              <ion-icon name="help-circle-outline"></ion-icon>
              Take a Quick Tour
            </button>
          </div>
        </div>
        
        <!-- Sign Up CTA -->
        <div class="glass-card p-6 md:p-8 mb-8">
          <h3 class="text-xl font-semibold mb-2 text-glass text-center">Get Started</h3>
          <p class="text-glass-secondary text-center mb-6">Sign in to create your card, save vendors, and share your info.</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button class="brand-bg p-3 flex items-center justify-center gap-2" id="homeGoogleSignIn">
              <ion-icon name="logo-google"></ion-icon>
              Continue with Google
            </button>
            <button class="glass-button p-3 flex items-center justify-center gap-2" id="homeEmailSignIn">
              <ion-icon name="mail-outline"></ion-icon>
              Sign in with Email
            </button>
            <button class="glass-button p-3 flex items-center justify-center gap-2" id="homeSignUp">
              <ion-icon name="person-add-outline"></ion-icon>
              Create Account
            </button>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="glass-card p-6 group hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-transparent hover:border-blue-500/30" onclick="window.location.hash='/vendors'">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center flex-shrink-0">
                <ion-icon name="storefront-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold mb-1 text-glass group-hover:text-blue-400 transition-colors">Browse Vendors</h3>
                <p class="text-glass-secondary text-sm">Explore the directory and save your favorites</p>
              </div>
            </div>
          </div>
          <div class="glass-card p-6 group hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-transparent hover:border-purple-500/30" onclick="window.location.hash='/map'">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0">
                <ion-icon name="map-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold mb-1 text-glass group-hover:text-purple-400 transition-colors">Interactive Map</h3>
                <p class="text-glass-secondary text-sm">Find booths and navigate the venue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (state.role === "attendee") {
    const attendee = state.attendees[0];
    const hasCard = attendee?.card && (attendee.name || attendee.card.profileImage || attendee.card.bio || attendee.card.location);
    
    html = `
      <div class="container-glass fade-in">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold mb-3 text-glass">Welcome Back</h1>
          <p class="text-xl text-glass-secondary">${hasCard ? 'Your digital business card is ready to share!' : 'Create your digital business card and connect with amazing vendors'}</p>
          <button id="startTour" class="glass-button px-4 py-2 mt-2">
            <ion-icon name="help-circle-outline" class="mr-2"></ion-icon>
            Take a Tour
          </button>
        </div>
        
        ${hasCard ? `
          <div class="glass-card p-8 mb-8">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-semibold text-glass">Your Business Card</h3>
                <p class="text-glass-secondary">Ready to share with vendors</p>
              </div>
              <button class="brand-bg px-4 py-2" onclick="window.location.hash='/my-card'">
                Edit Card
              </button>
            </div>
            <div class="max-w-xs mx-auto">
              ${renderCompactCard(attendee)}
            </div>
          </div>
        ` : `
          <div class="glass-card p-8 mb-8 text-center">
            <div class="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 mx-auto mb-4 flex items-center justify-center">
              <ion-icon name="card-outline" class="text-white text-2xl"></ion-icon>
            </div>
            <h3 class="text-xl font-semibold mb-2 text-glass">Your Digital Business Card</h3>
            <p class="text-glass-secondary mb-6">Share your information instantly with vendors you're interested in</p>
            <button class="brand-bg px-8 py-4 text-lg font-semibold" onclick="window.location.hash='/my-card'">
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
              ${vendor?.logoUrl ? '<img src="' + vendor.logoUrl + '" class="w-full h-full object-cover lazy-img" loading="lazy" onerror="this.style.display=\'none\'">' : '<ion-icon name="business-outline" class="text-white text-2xl"></ion-icon>'}
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
          
          <div class="glass-card p-6 group hover:scale-105 transition-transform duration-300 cursor-pointer" onclick="window.location.hash='/vendor-dashboard'">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-slate-700 mb-4 flex items-center justify-center">
              <ion-icon name="settings-outline" class="text-white text-xl"></ion-icon>
            </div>
            <h3 class="text-lg font-semibold mb-2 text-glass">Vendor Dashboard</h3>
            <p class="text-glass-secondary text-sm">Manage your business info, profile, and settings</p>
          </div>
        </div>
      </div>
    `;
  } else if (state.role === "admin") {
    html = `
      <div class="p-6 fade-in">
        <div class="dark-bg rounded-xl p-4 mb-4">
          <div class="font-bold text-lg">Admin Dashboard</div>
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
    // User is signed in but hasn't selected a role - redirect to role selection
    import("../router.js").then(({ navigate }) => {
      navigate("/role");
    });
    html = `<div class="p-8 text-center text-gray-400">
      <div class="mb-4">
        <ion-icon name="person-outline" class="text-4xl text-glass-secondary"></ion-icon>
      </div>
      <div class="text-lg font-semibold text-glass mb-2">Welcome!</div>
      <div class="text-glass-secondary">Redirecting to role selection...</div>
    </div>`;
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

  // Wire up tour button if present
  const tourBtn = root.querySelector('#startTour');
  if (tourBtn) {
    tourBtn.onclick = () => {
      const roleKey = state.role || 'general';
      Toast(`Starting ${roleKey} tour...`);
      maybeRunTour(roleKey, () => {
        const steps = [
          'Welcome to HomeShow! This tour will show you around.',
          'Use the bottom tabs to navigate between sections.',
          'Cards section: Create and manage your digital business card.',
          'Vendors section: Browse and save your favorite vendors.',
          'Profile section: Manage your account and settings.'
        ];
        
        let currentStep = 0;
        const showNextStep = () => {
          if (currentStep < steps.length) {
            Toast(steps[currentStep], { duration: 3000 });
            currentStep++;
            setTimeout(showNextStep, 3500);
          } else {
            Toast('Tour completed! You can restart it anytime.', { duration: 2000 });
            markTourComplete(roleKey);
          }
        };
        showNextStep();
      });
    };
  }
}
