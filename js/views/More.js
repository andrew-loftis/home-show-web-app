import { getState, setRole, vendorLogout, setOnline, dequeueAll, setTheme, getTheme } from "../store.js";
import { navigate } from "../router.js";
import { Toast } from "../utils/ui.js";

export default function More(root) {
  const state = getState();
  let menu = "";
  if (state.role === "attendee") {
    menu = `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Your Card</h3>
        <p class="text-sm text-glass-secondary mb-4">Build and adjust your visitor card details.</p>
        <div class="flex gap-3">
          <button class="brand-bg px-4 py-2 rounded" onclick="window.location.hash='/cards'">Open Cards</button>
          <button class="glass-button px-4 py-2" onclick="window.location.hash='/cards'">Edit Card</button>
        </div>
      </div>
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Explore</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button class="glass-button p-3" onclick="window.location.hash='/vendors'">Browse Vendors</button>
          <button class="glass-button p-3" onclick="window.location.hash='/saved-vendors'">Saved Vendors</button>
          <button class="glass-button p-3" onclick="window.location.hash='/map'">Map</button>
          <button class="glass-button p-3" onclick="window.location.hash='/schedule'">Schedule</button>
        </div>
      </div>
    `;
  } else if (state.role === "vendor") {
    menu = `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Business Card</h3>
        <p class="text-sm text-glass-secondary mb-4">Build and adjust your vendor business card.</p>
        <div class="flex gap-3">
          <button class="brand-bg px-4 py-2" onclick="window.location.hash='/cards'">Open Cards</button>
          <button class="glass-button px-4 py-2" onclick="window.location.hash='/cards'">Edit Card</button>
        </div>
      </div>
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Landing Page</h3>
        <p class="text-sm text-glass-secondary mb-4">Adjust your vendor landing page content.</p>
        <div class="flex gap-3">
          <button class="brand-bg px-4 py-2" onclick="window.location.hash='/edit-vendor'">Edit Landing Page</button>
          <button class="glass-button px-4 py-2" onclick="window.location.hash='/vendor/' + (window.getState().vendorLoginId || '')">Preview</button>
        </div>
      </div>
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Manage</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button class="glass-button p-3" onclick="window.location.hash='/vendor-leads'">View Leads</button>
          <button class="glass-button p-3" id="logoutBtn">Logout</button>
        </div>
      </div>
    `;
  } else if (state.role === "organizer") {
    menu = `
      <div class="glass-card p-6 mb-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Organizer Tools</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button class="glass-button p-3" onclick="window.location.hash='/admin'">Admin Dashboard</button>
          <button class="glass-button p-3" onclick="window.location.hash='/vendors'">Vendor Directory</button>
          <button class="glass-button p-3" onclick="window.location.hash='/schedule'">Event Schedule</button>
          <button class="glass-button p-3" onclick="window.location.hash='/map'">Floor Plan</button>
        </div>
      </div>
    `;
  }
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-glass">Profile</h1>
        <div class="text-sm text-glass-secondary">Role: <span class="font-semibold">${state.role || "-"}</span></div>
        ${state.user ? `
          <div class="mt-2 text-sm text-glass-secondary">Signed in as <span class="font-semibold">${state.user.displayName || state.user.email}</span></div>
          ${state.isAdmin ? `<div class="mt-1 text-xs text-green-400">Admin privileges enabled</div>` : ``}
        ` : ``}
      </div>
      ${menu}
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Account</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <button class="glass-button p-3" id="switchRoleBtn">Switch Role</button>
          <button class="glass-button p-3" onclick="window.location.hash='/vendor-login'">Vendor Login</button>
          <button class="glass-button p-3" id="resetBtn">Reset Role & Logout</button>
        </div>
        ${state.user ? `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button class="brand-bg p-3" id="signOutBtn">Sign out</button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button class="brand-bg p-3" id="googleSignInBtn">Sign in with Google</button>
            <button class="glass-button p-3" id="anonSignInBtn">Continue as Visitor</button>
          </div>
          <form id="emailAuthForm" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
            <input type="email" required placeholder="Email" class="glass-input p-3 rounded border border-white/15 bg-white/10 text-glass" name="email">
            <input type="password" required placeholder="Password" class="glass-input p-3 rounded border border-white/15 bg-white/10 text-glass" name="password">
            <div class="flex gap-2">
              <button class="brand-bg px-3 py-2 rounded flex-1" name="action" value="signin">Sign In</button>
              <button class="glass-button px-3 py-2 rounded flex-1" name="action" value="signup" type="button" id="signupBtn">Create Account</button>
            </div>
          </form>
        `}
        <div class="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/10">
          <div>
            <div class="text-sm text-glass">Appearance</div>
            <div class="text-xs text-glass-secondary">Choose Light or Dark mode</div>
          </div>
          <div class="flex gap-2">
            <button class="glass-button px-3 py-2 text-sm" id="lightThemeBtn">Light</button>
            <button class="glass-button px-3 py-2 text-sm" id="darkThemeBtn">Dark</button>
          </div>
        </div>
      </div>
    </div>
  `;
  if (state.role === "vendor") {
    root.querySelector("#onlineToggle").onchange = e => {
      setOnline(e.target.checked);
      Toast(e.target.checked ? "Online" : "Offline");
    };
    root.querySelector("#syncBtn").onclick = () => {
      dequeueAll();
      Toast("Queue synced");
    };
    root.querySelector("#logoutBtn").onclick = () => {
      vendorLogout();
      navigate("/role");
    };
  }
  root.querySelector("#switchRoleBtn").onclick = () => {
    vendorLogout();
    setRole(null);
    navigate("/role");
  };
  root.querySelector("#resetBtn").onclick = () => {
    vendorLogout();
    setRole(null);
    navigate("/role");
  };
  const theme = getTheme();
  const setActive = (mode) => {
    const lightBtn = root.querySelector('#lightThemeBtn');
    const darkBtn = root.querySelector('#darkThemeBtn');
    if (!lightBtn || !darkBtn) return;
    lightBtn.classList.toggle('brand-bg', mode === 'light');
    darkBtn.classList.toggle('brand-bg', mode === 'dark');
  };
  setActive(theme);
  root.querySelector('#lightThemeBtn').onclick = () => { setTheme('light'); setActive('light'); };
  root.querySelector('#darkThemeBtn').onclick = () => { setTheme('dark'); setActive('dark'); };
  // Auth buttons
  import("../firebase.js").then(({ signInWithGoogle, signOutUser, signInWithEmailPassword, signUpWithEmailPassword, signInAnonymouslyUser }) => {
    const signInBtn = root.querySelector('#googleSignInBtn');
    const signOutBtn = root.querySelector('#signOutBtn');
    const anonBtn = root.querySelector('#anonSignInBtn');
    if (signInBtn) signInBtn.onclick = async () => {
      try { await signInWithGoogle(); } catch {}
    };
    if (signOutBtn) signOutBtn.onclick = async () => {
      try { await signOutUser(); } catch {}
    };
    if (anonBtn) anonBtn.onclick = async () => {
      try { await signInAnonymouslyUser(); } catch {}
    };
    const emailForm = root.querySelector('#emailAuthForm');
    if (emailForm) {
      emailForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(emailForm);
        const email = fd.get('email');
        const password = fd.get('password');
        try {
          await signInWithEmailPassword(email, password);
        } catch (err) {
          import("../utils/ui.js").then(({ Toast }) => Toast('Sign-in failed'));
        }
      };
      const signupBtn = root.querySelector('#signupBtn');
      if (signupBtn) signupBtn.onclick = async () => {
        const email = root.querySelector('input[name="email"]').value;
        const password = root.querySelector('input[name="password"]').value;
        try {
          await signUpWithEmailPassword(email, password);
          import("../utils/ui.js").then(({ Toast }) => Toast('Account created'));
        } catch (err) {
          import("../utils/ui.js").then(({ Toast }) => Toast('Sign-up failed'));
        }
      };
    }
  });
}
