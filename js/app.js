import { hydrateStore, subscribe, getState } from "./store.js";
import { initRouter, navigate, renderCurrentView } from "./router.js";
import { Modal, Toast } from "./utils/ui.js";
import { setupGlobalErrorHandlers } from "./utils/errorBoundary.js";
import { renderShowSelector, initShowSelector, getCurrentShow, initShows } from "./shows.js";

// Setup global error handlers early
setupGlobalErrorHandlers();

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    // Required for web push token generation (FCM) and background notifications.
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (e) {
    console.warn('[App] Service worker registration failed:', e);
  }
}

// Setup foreground push notification listener (non-blocking)
async function setupNotificationListener() {
  try {
    const { onForegroundMessage, getNotificationPermission } = await import('./utils/notifications.js');
    
    // Only setup if user has granted permission
    if (getNotificationPermission() === 'granted') {
      onForegroundMessage((payload) => {
        // Toast notification for foreground messages
        if (payload.notification?.body) {
          Toast(payload.notification.body);
        }
      });
    }
  } catch (e) {
    // Silently fail - notifications are optional
  }
}

// App shell rendering
function renderShell() {
  const state = getState();
  // Apply theme class to body
  document.body.classList.toggle('theme-dark', state.theme === 'dark');
  const app = document.getElementById("app");
  app.innerHTML = "";
  
  // Check if we're on the admin dashboard - it has its own layout
  const currentHash = window.location.hash.replace('#', '') || '/home';
  const isAdminPage = currentHash === '/admin' || currentHash.startsWith('/admin/');
  
  if (isAdminPage && state.isAdmin) {
    // Admin page uses its own layout, but keep the standard bottom nav buttons.
    app.appendChild(renderTabbar(state));
    const main = document.createElement("main");
    main.className = "admin-page-container";
    app.appendChild(main);
  } else {
    // Standard app shell with header and tabbar
    app.appendChild(renderHeader(state));
    app.appendChild(renderTabbar(state));
    const main = document.createElement("main");
    // Ensure content can scroll below fixed header and above fixed tabbar
    // Using CSS for safe-area-aware padding (see styles.css)
    main.className = "main-content min-h-screen"; // Let CSS handle the padding
    app.appendChild(main);
  }
}

function renderHeader(state) {
  const header = document.createElement("header");
  header.className = "flex items-center justify-between px-3 py-2 nav-glass shadow-glass fixed top-0 left-0 right-0 z-30 safe-area-inset-top";
  const roleLabel = state.user ? (state.role ? state.role.charAt(0).toUpperCase() + state.role.slice(1) : 'Select Role') : 'Guest';
  
  // Role badge styling based on role type
  const roleBadgeClass = state.role === 'admin' 
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
    : state.role === 'vendor' 
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
      : 'glass-button';
  
  header.innerHTML = `
    <div class="flex items-center gap-2">
      <img src="/assets/House Logo Only.png" alt="WinnPro" class="w-8 h-8 object-contain">
      ${renderShowSelector()}
    </div>
    <div class="${roleBadgeClass} px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm">
      ${roleLabel}
    </div>
  `;
  
  // Initialize show selector after DOM is ready
  setTimeout(() => initShowSelector(), 0);
  
  return header;
}

function renderTabbar(state) {
  const tabbar = document.createElement("nav");
  tabbar.className = "fixed bottom-0 left-0 right-0 nav-glass border-t border-white/10 z-30 safe-area-inset-bottom";
  
  // Role-adaptive tabs
  let tabs = [];
  
  if (state.isAdmin) {
    // Admin: Home, Vendors, Admin Dashboard, Profile
    tabs = [
      { label: "Home", icon: "home-outline", iconActive: "home", route: "/home" },
      { label: "Vendors", icon: "storefront-outline", iconActive: "storefront", route: "/vendors" },
      { label: "Admin", icon: "shield-checkmark-outline", iconActive: "shield-checkmark", route: "/admin" },
      { label: "Profile", icon: "person-circle-outline", iconActive: "person-circle", route: "/more" }
    ];
  } else if (state.myVendor?.approved) {
    // Approved Vendor: Home, Vendors, Leads, Profile
    tabs = [
      { label: "Home", icon: "home-outline", iconActive: "home", route: "/home" },
      { label: "Vendors", icon: "storefront-outline", iconActive: "storefront", route: "/vendors" },
      { label: "Leads", icon: "people-outline", iconActive: "people", route: "/vendor-leads" },
      { label: "Profile", icon: "person-circle-outline", iconActive: "person-circle", route: "/more" }
    ];
  } else if (state.myVendor) {
    // Pending Vendor: Home, Vendors, Cards, Profile
    tabs = [
      { label: "Home", icon: "home-outline", iconActive: "home", route: "/home" },
      { label: "Vendors", icon: "storefront-outline", iconActive: "storefront", route: "/vendors" },
      { label: "Cards", icon: "card-outline", iconActive: "card", route: "/cards" },
      { label: "Profile", icon: "person-circle-outline", iconActive: "person-circle", route: "/more" }
    ];
  } else {
    // Attendee/Guest: Home, Vendors, Cards, Profile
    tabs = [
      { label: "Home", icon: "home-outline", iconActive: "home", route: "/home" },
      { label: "Vendors", icon: "storefront-outline", iconActive: "storefront", route: "/vendors" },
      { label: "Cards", icon: "card-outline", iconActive: "card", route: "/cards" },
      { label: "Profile", icon: "person-circle-outline", iconActive: "person-circle", route: "/more" }
    ];
  }
  
  const currentHash = window.location.hash.replace('#', '') || '/home';
  
  tabbar.innerHTML = `
    <div class="bottom-tabbar">
      ${tabs.map(tab => {
        const isActive = currentHash === tab.route || currentHash.startsWith(tab.route + '/');
        // Special handling for Home tab - use house logo image
        if (tab.route === '/home') {
          return `
            <button class="group tab-item ${isActive ? 'tab-active' : ''}" 
                    role="button" 
                    tabindex="0" 
                    aria-label="${tab.label}"
                    onclick="window.location.hash='${tab.route}'">
              <img src="/assets/House Logo Only.png" 
                   alt="Home" 
                   class="w-6 h-6 mb-1 object-contain ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}"
                   style="${isActive ? 'filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));' : ''}">
              <span class="text-[10px] font-medium ${isActive ? 'text-blue-500' : 'tab-label'}">${tab.label}</span>
            </button>
          `;
        }
        return `
          <button class="group tab-item ${isActive ? 'tab-active' : ''}" 
                  role="button" 
                  tabindex="0" 
                  aria-label="${tab.label}"
                  onclick="window.location.hash='${tab.route}'">
            <ion-icon name="${isActive ? tab.iconActive : tab.icon}" 
                      class="text-2xl mb-1 ${isActive ? 'text-blue-500' : 'tab-icon'}">
            </ion-icon>
            <span class="text-[10px] font-medium ${isActive ? 'text-blue-500' : 'tab-label'}">${tab.label}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  return tabbar;
}

// Coalesce renders to avoid multiple flashes during boot/auth hydration
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderShell();
    renderCurrentView();
  });
}

// Initialize ads system (non-blocking)
async function initAdsSystem() {
  try {
    const state = getState();
    // Only show ads after onboarding is complete
    if (!state.hasOnboarded) return;
    
    const { initAds } = await import('./utils/ads.js');
    await initAds();
  } catch (e) {
    // Silently fail - ads are optional
    console.log('[App] Ads system not initialized:', e.message);
  }
}

function boot() {
  console.log('[App] Booting V-3.1...');
  hydrateStore();
  // Expose getState globally for some views
  window.getState = getState;
  
  // Initialize shows from Firestore (non-blocking)
  initShows().then(() => {
    console.log('[App] Shows initialized');
    // Re-render if shows loaded after initial render
    scheduleRender();
  }).catch(e => {
    console.warn('[App] Shows init failed, using defaults:', e);
  });
  
  // Initialize router; let it render on hash changes
  initRouter(renderShell);

  // Register service worker early (non-blocking)
  registerServiceWorker();
  // Render once after boot
  scheduleRender();
  // On any state change (e.g., theme toggle), coalesce renders
  subscribe(() => {
    scheduleRender();
  });
  
  // Setup foreground push notification listener
  setupNotificationListener();
  
  // Initialize ads system (after a short delay to let app render first)
  setTimeout(initAdsSystem, 2000);
  
  // Listen for notification click messages from service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        console.log('[App] Navigating from notification:', event.data.url);
        navigate(event.data.url);
      }
    });
  }
  
  // Onboarding gate - roles are auto-detected by store.js
  const state = getState();
  const currentHash = window.location.hash;
  console.log('[App] State:', { hasOnboarded: state.hasOnboarded, user: !!state.user, role: state.role, currentHash });
  
  if (!state.hasOnboarded) {
    navigate("/onboarding");
  } else if (!currentHash || currentHash === '#' || currentHash === '#/') {
    // Only go to home if there's no current route
    navigate("/home");
  }
  // Otherwise, stay on current page (hash already set)
  
  console.log('[App] Boot complete');
}

window.addEventListener("DOMContentLoaded", boot);
