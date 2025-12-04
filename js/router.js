// Lightweight hash router
import { renderErrorUI, renderNotFoundError, logError } from './utils/errorBoundary.js';

const routes = {
  "/": "Onboarding",
  "/onboarding": "Onboarding",
  "/role": "RoleSelect",
  "/home": "Home",
  "/vendors": "Vendors",
  // Backward-compat routes -> unified Vendors
  "/exhibitors": "Vendors",
  "/vendor-gallery": "Vendors",
  "/map": "Map",
  "/interactive-map": "InteractiveMap",
  "/cards": "Cards",
  "/my-card": "MyCard",
  "/vendor-login": "VendorLogin",
  "/vendor-leads": "VendorLeads",
  "/vendor-lead/:id": "VendorLeadDetail",
  "/vendor/:vendorId": "VendorLandingPage",
  "/share-card/:vendorId": "ShareCard",
  "/vendor-registration": "VendorRegistration",
  "/vendor-dashboard": "VendorDashboard", 
  "/edit-vendor": "EditVendorProfile",
  "/saved-vendors": "SavedVendors",
  "/business-cards": "SavedBusinessCards",
  "/schedule": "Schedule",
  "/sponsors": "Sponsors",
  "/admin": "AdminDashboard",
  "/more": "More"
};

function parseRoute(hash) {
  const path = hash.replace(/^#/, "");
  for (const route in routes) {
    const paramNames = [];
    const regexPath = route.replace(/:[^/]+\??/g, (m) => {
      paramNames.push(m.replace(/[:?]/g, ""));
      return "([^/]+)";
    }).replace(/\//g, "\\/");
    const regex = new RegExp(`^${regexPath}$`);
    const match = path.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => params[name] = match[i + 1]);
      return { view: routes[route], params };
    }
  }
  return { view: "Home", params: {} };
}

function navigate(path) {
  window.location.hash = path;
}
function replace(path) {
  window.location.replace(`#${path}`);
}
function back() {
  window.history.back();
}

function initRouter(renderShell) {
  window.addEventListener("hashchange", () => {
    window.scrollTo(0, 0);
    renderShell();
    renderView();
  });
  renderView();
}

async function renderView() {
  const hash = window.location.hash || "#/";
  const { view, params } = parseRoute(hash);
  const main = document.querySelector("main");
  if (!main) return;
  
  // Show loading state
  main.innerHTML = `
    <div class="flex items-center justify-center min-h-[50vh] fade-in">
      <div class="text-center">
        <div class="relative mx-auto w-10 h-10 mb-3">
          <div class="w-10 h-10 border-4 border-white/10 rounded-full"></div>
          <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
        </div>
        <p class="text-sm text-glass-secondary">Loading...</p>
      </div>
    </div>
  `;
  
  try {
    const mod = await import(`./views/${view}.js`);
    main.innerHTML = "";
    
    // Wrap view execution in try-catch
    try {
      await mod.default(main, params);
    } catch (viewError) {
      console.error(`[Router] Error in view ${view}:`, viewError);
      logError(viewError, { view, params });
      renderErrorUI(main, {
        title: "Page Error",
        message: "Something went wrong loading this page. Please try again.",
        error: viewError,
        showDetails: localStorage.getItem('debug') === 'true',
        retryAction: () => renderView()
      });
    }
  } catch (e) {
    console.error(`[Router] Failed to load view ${view}:`, e);
    
    // Check if it's a module not found error
    if (e.message?.includes('Failed to fetch') || e.message?.includes('not found')) {
      renderNotFoundError(main, "page");
    } else {
      renderErrorUI(main, {
        title: "View Not Found",
        message: `Could not load the "${view}" page. It may have been moved or doesn't exist.`,
        error: e,
        showDetails: localStorage.getItem('debug') === 'true'
      });
    }
  }
}

// Expose a safe API to re-render the current route's view
function renderCurrentView() {
  return renderView();
}

export { initRouter, navigate, replace, back, renderCurrentView };
