import { hydrateStore, subscribe, getState } from "./store.js";
import { initRouter, navigate, renderCurrentView } from "./router.js";
import { Modal, Toast } from "./utils/ui.js";
import { setupGlobalErrorHandlers } from "./utils/errorBoundary.js";

// Setup global error handlers early
setupGlobalErrorHandlers();

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
  app.appendChild(renderHeader(state));
  app.appendChild(renderTabbar(state));
  const main = document.createElement("main");
  // Ensure content can scroll above the fixed bottom tabbar and below sticky header
  main.className = "pb-28 pt-2"; // Tailwind: padding-bottom ~7rem
  app.appendChild(main);
}

function renderHeader(state) {
  const header = document.createElement("header");
  header.className = "flex items-center justify-between px-4 py-3 nav-glass shadow-glass sticky top-0 z-20";
  const roleLabel = state.user ? (state.role ? state.role.charAt(0).toUpperCase() + state.role.slice(1) : 'Select Role') : 'Guest';
  
  // Role badge styling based on role type
  const roleBadgeClass = state.role === 'admin' 
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
    : state.role === 'vendor' 
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
      : 'glass-button';
  
  header.innerHTML = `
    <a href="#/home" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <img src="assets/logo-dark.svg" alt="Winn-Pro" class="h-10 w-auto" />
    </a>
    <div class="${roleBadgeClass} px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm">
      ${roleLabel}
    </div>
  `;
  return header;
}

function renderTabbar(state) {
  const tabbar = document.createElement("nav");
  tabbar.className = "fixed bottom-0 left-0 right-0 nav-glass border-t border-white/10 z-20 safe-area-inset-bottom";
  
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
        return `
          <button class="group ${isActive ? 'bg-white/10' : ''}" 
                  role="button" 
                  tabindex="0" 
                  aria-label="${tab.label}"
                  onclick="window.location.hash='${tab.route}'">
            <ion-icon name="${isActive ? tab.iconActive : tab.icon}" 
                      class="text-2xl mb-1 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}">
            </ion-icon>
            <span class="text-[10px] font-medium ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}">${tab.label}</span>
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
  console.log('[App] Booting V-1.5...');
  hydrateStore();
  // Expose getState globally for some views
  window.getState = getState;
  // Initialize router; let it render on hash changes
  initRouter(renderShell);
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
