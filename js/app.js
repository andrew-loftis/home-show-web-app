import { hydrateStore, subscribe, getState } from "./store.js";
import { initRouter, navigate, renderCurrentView } from "./router.js";
import { Modal, Toast } from "./utils/ui.js";

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
  header.className = "flex items-center justify-between px-6 py-4 nav-glass shadow-glass sticky top-0 z-20";
  // Prefer showing Admin for admins regardless of persisted role value
  const roleLabel = state.user
    ? (state.isAdmin
        ? 'Admin'
        : (state.role ? state.role.charAt(0).toUpperCase() + state.role.slice(1) : 'Attendee'))
    : 'Guest';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <span class="text-white font-bold text-[10px] tracking-wide">HS</span>
      </div>
      <span class="font-bold text-xl text-glass">HomeShow</span>
    </div>
    <div class="glass-button px-3 py-1 text-sm font-medium">
      ${roleLabel}
    </div>
  `;
  return header;
}

function renderTabbar(state) {
  const tabbar = document.createElement("nav");
  tabbar.className = "fixed bottom-0 left-0 right-0 nav-glass border-t border-white/20 flex justify-around py-3 z-20 safe-area-inset-bottom";
  const tabs = [
    { label: "Home", icon: "home-outline", route: "/home" },
    { label: "Vendors", icon: "storefront-outline", route: "/vendors" },
    { label: "Cards", icon: "card-outline", route: "/cards" },
    { label: "Profile", icon: "person-circle-outline", route: "/more" }
  ];
  
  const currentHash = window.location.hash.replace('#', '') || '/home';
  
  tabbar.innerHTML = tabs.map(tab => {
    const isActive = currentHash === tab.route;
    return `
      <button class="flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-300 ${isActive ? 'glass-button scale-110' : 'hover:scale-105'}" 
              role="button" tabindex="0" onclick="window.location.hash='${tab.route}'">
        <ion-icon name="${tab.icon}" class="text-xl ${isActive ? 'text-blue-400' : 'text-glass'}"></ion-icon>
        <span class="text-xs mt-1 font-medium ${isActive ? 'text-blue-400' : 'text-glass-secondary'}">${tab.label}</span>
      </button>
    `;
  }).join("");
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
    // After first render, consider showing walkthrough if first time
    try {
      import('./utils/tour.js').then(({ ensureFirstTimeWalkthrough }) => {
        setTimeout(() => ensureFirstTimeWalkthrough(), 200);
      });
    } catch {}
  });
}

function boot() {
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
  // Onboarding gate
  const state = getState();
  if (!state.hasOnboarded) navigate("/onboarding");
  else navigate("/home");
}

window.addEventListener("DOMContentLoaded", boot);
