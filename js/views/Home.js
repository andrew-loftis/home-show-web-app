import { getState, currentVendor, leadsForVendor } from "../store.js";
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

// Helper to get vendor lead count from Firestore
async function getVendorLeadCount(vendorId) {
  try {
    const { getDb } = await import("../firebase.js");
    const db = getDb();
    const { collection, query, where, getCountFromServer } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('vendor_id', '==', vendorId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting lead count:', error);
    return 0;
  }
}

export default async function Home(root) {
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
    const isPending = state.myVendor && !state.myVendor.approved;
    
    // Get real lead count from local state (synced from Firestore)
    const leadCount = vendor ? leadsForVendor(vendor.id).length : 0;
    
    if (isPending) {
      // Pending vendor experience
      html = `
        <div class="container-glass fade-in">
          <!-- Pending Status Banner -->
          <div class="glass-card p-8 mb-8 border border-yellow-500/30">
            <div class="text-center">
              <div class="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 mx-auto mb-4 flex items-center justify-center">
                <ion-icon name="time-outline" class="text-yellow-400 text-4xl"></ion-icon>
              </div>
              <h1 class="text-2xl font-bold text-glass mb-2">Registration Under Review</h1>
              <p class="text-glass-secondary mb-4">Your vendor application is being reviewed by our team. You'll receive an email once approved.</p>
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                <span class="text-yellow-300 text-sm font-medium">Pending Approval</span>
              </div>
            </div>
          </div>
          
          <!-- What to Expect -->
          <div class="glass-card p-6 mb-8">
            <h3 class="text-lg font-semibold text-glass mb-4">What Happens Next?</h3>
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="checkmark" class="text-green-400"></ion-icon>
                </div>
                <div>
                  <div class="font-medium text-glass">Registration Submitted</div>
                  <div class="text-sm text-glass-secondary">Your application has been received</div>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="hourglass-outline" class="text-yellow-400 animate-pulse"></ion-icon>
                </div>
                <div>
                  <div class="font-medium text-glass">Admin Review</div>
                  <div class="text-sm text-glass-secondary">Our team is reviewing your application</div>
                </div>
              </div>
              <div class="flex items-start gap-4 opacity-50">
                <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="mail-outline" class="text-glass-secondary"></ion-icon>
                </div>
                <div>
                  <div class="font-medium text-glass">Email Notification</div>
                  <div class="text-sm text-glass-secondary">You'll be notified when approved</div>
                </div>
              </div>
              <div class="flex items-start gap-4 opacity-50">
                <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="storefront-outline" class="text-glass-secondary"></ion-icon>
                </div>
                <div>
                  <div class="font-medium text-glass">Set Up Your Booth</div>
                  <div class="text-sm text-glass-secondary">Customize your landing page and start collecting leads</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- While You Wait -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer" onclick="window.location.hash='/vendors'">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="storefront-outline" class="text-white text-xl"></ion-icon>
                </div>
                <div>
                  <h3 class="font-semibold text-glass">Browse Other Vendors</h3>
                  <p class="text-sm text-glass-secondary">See how other vendors present their booths</p>
                </div>
              </div>
            </div>
            <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer" onclick="window.location.hash='/map'">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="map-outline" class="text-white text-xl"></ion-icon>
                </div>
                <div>
                  <h3 class="font-semibold text-glass">Venue Map</h3>
                  <p class="text-sm text-glass-secondary">Preview the floor plan and booth locations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Approved vendor experience
      html = `
        <div class="container-glass fade-in">
          <div class="glass-card p-8 mb-8">
            <div class="flex items-center gap-6 mb-6">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
                ${vendor?.logoUrl ? '<img src="' + vendor.logoUrl + '" class="w-full h-full object-cover lazy-img" loading="lazy" onerror="this.style.display=\'none\'">' : '<ion-icon name="business-outline" class="text-white text-2xl"></ion-icon>'}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h1 class="text-2xl font-bold text-glass">${vendor?.name || "Your Business"}</h1>
                  <span class="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs">Approved</span>
                </div>
                <p class="text-glass-secondary">Booth ${vendor?.booth || "-"} • ${vendor?.category || "General"}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="glass-card p-4 text-center">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-2 flex items-center justify-center">
                  <ion-icon name="people-outline" class="text-white text-lg"></ion-icon>
                </div>
                <div class="text-xs text-glass-secondary mb-1">Total Leads</div>
                <div class="text-2xl font-bold text-glass">${leadCount}</div>
              </div>
              <div class="glass-card p-4 text-center">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-teal-600 to-green-600 mx-auto mb-2 flex items-center justify-center">
                  <ion-icon name="card-outline" class="text-white text-lg"></ion-icon>
                </div>
                <div class="text-xs text-glass-secondary mb-1">Cards Shared</div>
                <div class="text-2xl font-bold text-glass">${leadCount}</div>
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/vendor-leads'">
              <ion-icon name="scan-outline" class="text-2xl text-blue-400 mb-2"></ion-icon>
              <div class="text-sm font-medium text-glass">Scan Lead</div>
            </button>
            <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/edit-vendor'">
              <ion-icon name="create-outline" class="text-2xl text-purple-400 mb-2"></ion-icon>
              <div class="text-sm font-medium text-glass">Edit Profile</div>
            </button>
            <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/vendor/' + '${vendor?.id || ''}'">
              <ion-icon name="eye-outline" class="text-2xl text-teal-400 mb-2"></ion-icon>
              <div class="text-sm font-medium text-glass">View Page</div>
            </button>
            <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/vendor-dashboard'">
              <ion-icon name="stats-chart-outline" class="text-2xl text-orange-400 mb-2"></ion-icon>
              <div class="text-sm font-medium text-glass">Dashboard</div>
            </button>
          </div>
          
          <!-- Main Actions -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-blue-500/30" onclick="window.location.hash='/vendor-leads'">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="analytics-outline" class="text-white text-xl"></ion-icon>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-glass group-hover:text-blue-400 transition-colors">Lead Management</h3>
                  <p class="text-glass-secondary text-sm">View, organize, and follow up with your leads</p>
                </div>
              </div>
            </div>
            
            <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-purple-500/30" onclick="window.location.hash='/cards'">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0">
                  <ion-icon name="card-outline" class="text-white text-xl"></ion-icon>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-glass group-hover:text-purple-400 transition-colors">Collected Cards</h3>
                  <p class="text-glass-secondary text-sm">Business cards from interested attendees</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  } else if (state.role === "admin") {
    // Count pending vendors for admin dashboard
    const pendingVendors = (state.allVendors || []).filter(v => !v.approved).length;
    const approvedVendors = (state.vendors || []).length;
    
    html = `
      <div class="container-glass fade-in">
        <!-- Admin Header -->
        <div class="glass-card p-8 mb-8 border border-green-500/20">
          <div class="flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/30 to-teal-500/20 flex items-center justify-center">
              <ion-icon name="shield-checkmark" class="text-green-400 text-3xl"></ion-icon>
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-glass">Admin Dashboard</h1>
              <p class="text-glass-secondary">Manage vendors, schedule, and event settings</p>
            </div>
            ${pendingVendors > 0 ? `
              <div class="text-right">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  <span class="text-yellow-300 font-medium">${pendingVendors} pending</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Stats Overview -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="glass-card p-4 text-center">
            <div class="text-3xl font-bold text-glass">${approvedVendors}</div>
            <div class="text-xs text-glass-secondary">Approved Vendors</div>
          </div>
          <div class="glass-card p-4 text-center ${pendingVendors > 0 ? 'border border-yellow-500/30' : ''}">
            <div class="text-3xl font-bold ${pendingVendors > 0 ? 'text-yellow-400' : 'text-glass'}">${pendingVendors}</div>
            <div class="text-xs text-glass-secondary">Pending Review</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-3xl font-bold text-glass">${(state.attendees || []).length}</div>
            <div class="text-xs text-glass-secondary">Attendees</div>
          </div>
          <div class="glass-card p-4 text-center">
            <div class="text-3xl font-bold text-green-400">Live</div>
            <div class="text-xs text-glass-secondary">Event Status</div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform ${pendingVendors > 0 ? 'border border-yellow-500/30' : ''}" onclick="window.location.hash='/admin'">
            <ion-icon name="${pendingVendors > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}" class="text-2xl ${pendingVendors > 0 ? 'text-yellow-400' : 'text-green-400'} mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">Review Vendors</div>
          </button>
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/schedule'">
            <ion-icon name="calendar-outline" class="text-2xl text-blue-400 mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">Schedule</div>
          </button>
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/map'">
            <ion-icon name="map-outline" class="text-2xl text-purple-400 mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">Floor Plan</div>
          </button>
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/admin-data'">
            <ion-icon name="server-outline" class="text-2xl text-orange-400 mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">Data Manager</div>
          </button>
        </div>
        
        <!-- Main Admin Tools -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-blue-500/30" onclick="window.location.hash='/admin'">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <ion-icon name="settings-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-glass group-hover:text-blue-400 transition-colors">Admin Dashboard</h3>
                <p class="text-glass-secondary text-sm">Approve vendors, manage admins, and configure event settings</p>
              </div>
            </div>
          </div>
          
          <div class="glass-card p-6 group hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-purple-500/30" onclick="window.location.hash='/vendors'">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0">
                <ion-icon name="storefront-outline" class="text-white text-xl"></ion-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-glass group-hover:text-purple-400 transition-colors">Vendor Directory</h3>
                <p class="text-glass-secondary text-sm">Browse all approved vendors and their booth information</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // User is signed in but role is still being auto-detected
    // Show a brief loading state - the store subscription will re-render when role is set
    html = `<div class="container-glass fade-in">
      <div class="glass-card p-8 text-center">
        <div class="mb-4">
          <ion-icon name="hourglass-outline" class="text-4xl text-glass-secondary animate-pulse"></ion-icon>
        </div>
        <div class="text-lg font-semibold text-glass mb-2">Setting things up...</div>
        <div class="text-glass-secondary text-sm">Detecting your account type</div>
      </div>
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
      if (g) g.onclick = async (event) => { 
        event.preventDefault();
        try { 
          console.log('[Home] Starting Google sign in...');
          await signInWithGoogle(); 
          console.log('[Home] Google sign in successful');
        } catch (error) {
          console.error('[Home] Google sign in failed:', error);
          console.error('[Home] Error code:', error.code);
          console.error('[Home] Error message:', error.message);
          if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup, no action needed
          } else if (error.code === 'auth/popup-blocked') {
            Toast('Please allow popups for this site');
          } else if (error.code === 'auth/cancelled-popup-request') {
            // Multiple popups, ignore
          } else if (error.code === 'auth/network-request-failed') {
            Toast('Network error. Please check your connection.');
          } else {
            Toast('Sign in failed: ' + (error.code || error.message || 'Unknown error'));
          }
        }
      };
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
