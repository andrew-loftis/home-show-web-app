// Lightweight hash router
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
  "/edit-vendor": "EditVendorProfile",
  "/saved-vendors": "SavedVendors",
  "/business-cards": "SavedBusinessCards",
  "/schedule": "Schedule",
  "/sponsors": "Sponsors",
  "/admin": "AdminDashboard",
  "/data-manager": "AdminDataManager",
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
    try { localStorage.setItem('lastRoute', window.location.hash || '#/'); } catch {}
    window.scrollTo(0, 0);
    renderShell();
    renderView();
  });
  // If no hash, attempt to restore last route
  if (!window.location.hash) {
    try {
      const last = localStorage.getItem('lastRoute');
      if (last && typeof last === 'string') {
        window.location.hash = last.startsWith('#') ? last : `#${last}`;
      }
    } catch {}
  }
  renderView();
}

async function renderView() {
  const hash = window.location.hash || "#/";
  try { localStorage.setItem('lastRoute', hash); } catch {}
  const { view, params } = parseRoute(hash);
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = "<div class='fade-in'></div>";
  try {
    const mod = await import(`./views/${view}.js`);
    main.innerHTML = "";
    mod.default(main, params);
  } catch (e) {
    main.innerHTML = `<div class='p-8 text-center text-red-500'>View not found: ${view}</div>`;
  }
}

// Expose a safe API to re-render the current route's view
function renderCurrentView() {
  return renderView();
}

export { initRouter, navigate, replace, back, renderCurrentView };
