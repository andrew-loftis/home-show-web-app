import { getState, currentVendor, leadsForVendor } from "../store.js";
import { shouldShowTour, markTourComplete, maybeRunTour } from "../utils/tour.js";
import { Toast } from "../utils/ui.js";
import { initLazyBackgrounds } from "../utils/lazyImages.js";
import { getCurrentShow, getTimeUntilShow, isShowLive, getActiveShows, setCurrentShow, getCurrentShowId } from "../shows.js";
import { handleAuthError } from "../utils/authErrors.js";

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
    const q = query(leadsRef, where('vendorId', '==', vendorId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting lead count:', error);
    return 0;
  }
}

export default async function Home(root) {
  const state = getState();
  const currentShow = getCurrentShow();
  const showLive = isShowLive(currentShow.id);
  const timeUntil = getTimeUntilShow(currentShow.id);
  
  let html = "";
  if (!state.user || state.user.isAnonymous) {
    // Guest experience: sign-in/sign-up section prominent
    const gradientClass = currentShow.season === 'spring' ? 'show-gradient-spring' : 'show-gradient-fall';
    html = `
      <div class="container-glass fade-in">
        <!-- Hero Section - Responsive -->
        <div class="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-6 p-4 sm:p-6 ${gradientClass}">
          <div class="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/15 rounded-full blur-2xl -mr-6 -mt-6"></div>
          
          <div class="relative text-center">
            <div class="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] sm:text-xs font-medium mb-2 sm:mb-3">
              ${showLive ? `
                <span class="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-400 rounded-full animate-pulse"></span>
                Live Now
              ` : timeUntil ? `
                <ion-icon name="calendar-outline" class="text-xs sm:text-sm"></ion-icon>
                ${timeUntil}
              ` : `
                <ion-icon name="${currentShow.icon}" class="text-xs sm:text-sm"></ion-icon>
                ${currentShow.season === 'spring' ? 'Spring' : 'Fall'} Show
              `}
            </div>
            <h1 class="text-lg sm:text-2xl font-bold mb-1 sm:mb-2 text-white drop-shadow-lg">${currentShow.name.replace(' Home Show', '')}<br><span class="text-white/90 text-base sm:text-xl">Home Show</span></h1>
            <p class="text-[10px] sm:text-xs text-white/80">${currentShow.displayDate}</p>
            <p class="text-[10px] sm:text-xs text-white/70 mb-2 sm:mb-3">${currentShow.venue} • ${currentShow.location}</p>
            <button id="startTour" class="inline-flex items-center gap-1 sm:gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs sm:text-sm font-medium border border-white/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all">
              <ion-icon name="help-circle-outline" class="text-sm sm:text-base"></ion-icon>
              Take a Tour
            </button>
          </div>
        </div>
        
        <!-- Show Selector -->
        <div class="flex justify-center gap-2 mb-4 sm:mb-6">
          ${getActiveShows().map(s => `
            <button class="show-select-btn px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${s.id === getCurrentShowId() 
              ? (s.season === 'spring' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white') 
              : 'bg-white/10 text-glass-secondary hover:bg-white/20'}" data-show-id="${s.id}">
              ${s.shortName}
            </button>
          `).join('')}
        </div>
        
        <!-- Sign Up CTA - Responsive -->
        <div class="glass-card mb-4 sm:mb-6">
          <h3 class="text-sm sm:text-lg font-semibold mb-0.5 sm:mb-1 text-glass text-center">Get Started</h3>
          <p class="text-glass-secondary text-center text-xs sm:text-sm mb-3 sm:mb-4">Sign in to save vendors and share your info</p>
          <div class="space-y-2">
            <button class="brand-bg w-full py-2.5 sm:py-3 flex items-center justify-center gap-2 text-xs sm:text-sm" id="homeGoogleSignIn">
              <ion-icon name="logo-google"></ion-icon>
              Continue with Google
            </button>
            <!-- Sign in with Apple (iOS only) -->
            <button class="glass-button w-full py-2.5 sm:py-3 flex items-center justify-center gap-2 text-xs sm:text-sm hidden" id="homeAppleSignIn" style="background: #000; color: #fff; border-color: #333;">
              <ion-icon name="logo-apple"></ion-icon>
              Sign in with Apple
            </button>
            <div class="grid grid-cols-2 gap-2">
              <button class="glass-button py-2 sm:py-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm" id="homeEmailSignIn">
                <ion-icon name="mail-outline"></ion-icon>
                Email
              </button>
              <button class="glass-button py-2 sm:py-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm" id="homeSignUp">
                <ion-icon name="person-add-outline"></ion-icon>
                Sign Up
              </button>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions - Responsive -->
        <div class="space-y-2 sm:space-y-3">
          <div class="action-card p-3 sm:p-4 group cursor-pointer" onclick="window.location.hash='/vendors'">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                <ion-icon name="storefront-outline" class="text-white text-sm sm:text-lg"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-glass">Browse Vendors</h3>
                <p class="text-glass-secondary text-[10px] sm:text-xs">Explore the directory</p>
              </div>
              <ion-icon name="chevron-forward" class="text-glass-secondary text-sm sm:text-base"></ion-icon>
            </div>
          </div>
          <div class="action-card p-3 sm:p-4 group cursor-pointer" onclick="window.location.hash='/map'">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center flex-shrink-0">
                <ion-icon name="map-outline" class="text-white text-sm sm:text-lg"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-glass">Interactive Map</h3>
                <p class="text-glass-secondary text-[10px] sm:text-xs">Find booths easily</p>
              </div>
              <ion-icon name="chevron-forward" class="text-glass-secondary text-sm sm:text-base"></ion-icon>
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
        <!-- Welcome header - responsive -->
        <div class="text-center mb-4 sm:mb-6">
          <h1 class="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 text-glass">Welcome Back</h1>
          <p class="text-xs sm:text-sm text-glass-secondary">${hasCard ? 'Your card is ready to share' : 'Create your digital business card'}</p>
        </div>
        
        <!-- Show Selector -->
        <div class="flex justify-center gap-2 mb-4 sm:mb-6">
          ${getActiveShows().map(s => `
            <button class="show-select-btn px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${s.id === getCurrentShowId() 
              ? (s.season === 'spring' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white') 
              : 'bg-white/10 text-glass-secondary hover:bg-white/20'}" data-show-id="${s.id}">
              ${s.shortName}
            </button>
          `).join('')}
        </div>
        
        ${hasCard ? `
          <!-- Card preview - responsive -->
          <div class="glass-card mb-4 sm:mb-5">
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <h3 class="text-sm sm:text-base font-semibold text-glass">Your Card</h3>
              <button class="glass-button px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm" onclick="window.location.hash='/my-card'">
                <ion-icon name="create-outline" class="mr-0.5 sm:mr-1"></ion-icon>
                Edit
              </button>
            </div>
            <div class="max-w-xs mx-auto">
              ${renderCompactCard(attendee)}
            </div>
          </div>
        ` : `
          <!-- Create card CTA - responsive -->
          <div class="glass-card mb-4 sm:mb-5 text-center py-4 sm:py-6">
            <div class="w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
              <ion-icon name="card-outline" class="text-white text-lg sm:text-xl"></ion-icon>
            </div>
            <h3 class="text-sm sm:text-lg font-semibold mb-0.5 sm:mb-1 text-glass">Digital Business Card</h3>
            <p class="text-glass-secondary text-xs sm:text-sm mb-3 sm:mb-4">Share your info with vendors instantly</p>
            <button class="brand-bg px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold" onclick="window.location.hash='/my-card'">
              Create My Card
            </button>
          </div>
        `}
        
        <!-- Quick actions - responsive -->
        <div class="space-y-2 sm:space-y-3">
          <div class="action-card p-3 sm:p-4 cursor-pointer" onclick="window.location.hash='/vendors'">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                <ion-icon name="storefront-outline" class="text-white text-sm sm:text-lg"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-glass">Browse Vendors</h3>
                <p class="text-glass-secondary text-[10px] sm:text-xs">Find services for your home</p>
              </div>
              <ion-icon name="chevron-forward" class="text-glass-secondary text-sm sm:text-base"></ion-icon>
            </div>
          </div>
          
          <div class="action-card p-3 sm:p-4 cursor-pointer" onclick="window.location.hash='/map'">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center flex-shrink-0">
                <ion-icon name="map-outline" class="text-white text-sm sm:text-lg"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-glass">Interactive Map</h3>
                <p class="text-glass-secondary text-[10px] sm:text-xs">Navigate vendor booths</p>
              </div>
              <ion-icon name="chevron-forward" class="text-glass-secondary text-sm sm:text-base"></ion-icon>
            </div>
          </div>
          
          <div class="action-card p-3 sm:p-4 cursor-pointer" onclick="window.location.hash='/saved-vendors'">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <div class="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-500 to-slate-400 flex items-center justify-center flex-shrink-0">
                <ion-icon name="bookmark-outline" class="text-white text-sm sm:text-lg"></ion-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-glass">Saved Vendors</h3>
                <p class="text-glass-secondary text-[10px] sm:text-xs">Your favorites list</p>
              </div>
              <ion-icon name="chevron-forward" class="text-glass-secondary text-sm sm:text-base"></ion-icon>
            </div>
          </div>
        </div>
        
        <!-- Tour button - responsive -->
        <div class="text-center mt-4 sm:mt-5">
          <button id="startTour" class="glass-button px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
            <ion-icon name="help-circle-outline" class="mr-0.5 sm:mr-1"></ion-icon>
            Take a Tour
          </button>
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
                <div class="w-8 h-8 rounded-full icon-circle flex-shrink-0">
                  <ion-icon name="mail-outline" class="text-glass-secondary"></ion-icon>
                </div>
                <div>
                  <div class="font-medium text-glass">Email Notification</div>
                  <div class="text-sm text-glass-secondary">You'll be notified when approved</div>
                </div>
              </div>
              <div class="flex items-start gap-4 opacity-50">
                <div class="w-8 h-8 rounded-full icon-circle flex-shrink-0">
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
    // Fetch real counts from Firestore for admin stats
    let pendingVendors = 0;
    let approvedVendors = (state.vendors || []).length;
    let totalAttendees = 0;
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getCountFromServer } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      const [pendingSnap, attendeeSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'vendors'), where('approved', '==', false), where('status', '!=', 'denied'))),
        getCountFromServer(collection(db, 'attendees'))
      ]);
      pendingVendors = pendingSnap.data().count || 0;
      totalAttendees = attendeeSnap.data().count || 0;
    } catch {}
    
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
            <div class="text-3xl font-bold text-glass">${totalAttendees}</div>
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
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/my-card'">
            <ion-icon name="card-outline" class="text-2xl text-cyan-400 mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">My Card</div>
          </button>
          <button class="glass-card p-4 text-center group hover:scale-105 transition-transform" onclick="window.location.hash='/cards'">
            <ion-icon name="swap-horizontal-outline" class="text-2xl text-pink-400 mb-2"></ion-icon>
            <div class="text-sm font-medium text-glass">Card Swap</div>
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
    import("../firebase.js").then(({ signInWithGoogle, signInWithApple, signInWithEmailPassword, signUpWithEmailPassword, isIOSDevice }) => {
      const g = root.querySelector('#homeGoogleSignIn');
      const e = root.querySelector('#homeEmailSignIn');
      const s = root.querySelector('#homeSignUp');
      const go = root.querySelector('#goToMyCard');
      const appleBtn = root.querySelector('#homeAppleSignIn');
      
      // Show Apple Sign In button on iOS devices
      if (appleBtn && isIOSDevice()) {
        appleBtn.classList.remove('hidden');
        appleBtn.onclick = async (event) => {
          event.preventDefault();
          try {
            console.log('[Home] Starting Apple sign in...');
            await signInWithApple();
            console.log('[Home] Apple sign in successful');
          } catch (error) {
            console.error('[Home] Apple sign in failed:', error);
            handleAuthError(error, 'Apple');
          }
        };
      }
      
      if (g) g.onclick = async (event) => { 
        event.preventDefault();
        try { 
          console.log('[Home] Starting Google sign in...');
          await signInWithGoogle(); 
          console.log('[Home] Google sign in successful');
        } catch (error) {
          console.error('[Home] Google sign in failed:', error);
          handleAuthError(error, 'Google');
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
  
  // Wire up show selector buttons
  root.querySelectorAll('.show-select-btn').forEach(btn => {
    btn.onclick = () => {
      const showId = btn.dataset.showId;
      if (showId && showId !== getCurrentShowId()) {
        setCurrentShow(showId);
        // Re-render the page with new show
        Home(root);
        Toast(`Switched to ${getActiveShows().find(s => s.id === showId)?.shortName || showId}`);
      }
    };
  });
}
