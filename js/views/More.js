import { getState, setRole, vendorLogout, setTheme, getTheme } from "../store.js";

export default function More(root) {
  const state = getState();
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
      ${state.isAdmin ? `
        <div class="glass-card p-6 mb-6">
          <h3 class="text-lg font-semibold text-glass mb-2">Admin Tools</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button class="glass-button p-3" onclick="window.location.hash='/admin'">Admin Dashboard</button>
            <button class="glass-button p-3" onclick="window.location.hash='/vendors'">Vendor Directory</button>
            <button class="glass-button p-3" onclick="window.location.hash='/vendor-registration'">Vendor Registration</button>
          </div>
          <div class="border-t border-white/10 pt-4">
            <div class="font-semibold mb-2">Admin Management</div>
            <form id="addAdminForm" class="flex gap-2 mb-3">
              <input type="email" required placeholder="Add admin email" class="glass-input flex-1 p-2 rounded border border-white/15 bg-white/10 text-glass" name="email">
              <button class="brand-bg px-3 py-2 rounded">Add</button>
            </form>
            <div id="adminList" class="grid gap-2 text-sm text-glass-secondary">Loading admins…</div>
          </div>
        </div>
      ` : `
        <div class="glass-card p-6 mb-6">
          <div class="text-sm text-glass-secondary mb-2">Quick Links</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button class="glass-button p-3" onclick="window.location.hash='/vendor-registration'">Vendor Registration</button>
            <button class="glass-button p-3" onclick="window.location.hash='/saved-vendors'">Saved Vendors</button>
            <button class="glass-button p-3" onclick="window.location.hash='/cards'">My Cards</button>
          </div>
        </div>
      `}
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-2">Account</h3>
        ${state.isAdmin ? `` : `<div class="text-xs text-glass-secondary mb-3">Role switching is disabled.</div>`}
        ${state.user ? `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button class="brand-bg p-3" id="signOutBtn">Sign out</button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button class="brand-bg p-3" id="googleSignInBtn">Sign in with Google</button>
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
      
      ${state.user && !state.user.isAnonymous ? `
        <div class="glass-card p-6 mt-6 border-red-500/20">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p class="text-sm text-glass-secondary mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-semibold transition-colors" id="deleteAccountBtn">
              <ion-icon name="trash-outline" class="mr-2"></ion-icon>
              Delete Account
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Theme
  const setActive = (mode) => {
    const lightBtn = root.querySelector('#lightThemeBtn');
    const darkBtn = root.querySelector('#darkThemeBtn');
    if (!lightBtn || !darkBtn) return;
    lightBtn.classList.toggle('brand-bg', mode === 'light');
    darkBtn.classList.toggle('brand-bg', mode === 'dark');
  };
  setActive(getTheme());
  root.querySelector('#lightThemeBtn').onclick = () => { setTheme('light'); setActive('light'); };
  root.querySelector('#darkThemeBtn').onclick = () => { setTheme('dark'); setActive('dark'); };

  // Auth buttons
  import("../firebase.js").then(({ signInWithGoogle, signOutUser, signInWithEmailPassword, signUpWithEmailPassword, signInAnonymouslyUser, listAdminEmails, addAdminEmail, removeAdminEmail }) => {
    const signInBtn = root.querySelector('#googleSignInBtn');
    const signOutBtn = root.querySelector('#signOutBtn');
  if (signInBtn) signInBtn.onclick = async () => { try { await signInWithGoogle(); } catch {} };
  if (signOutBtn) signOutBtn.onclick = async () => { try { await signOutUser(); } catch {} };

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

    // Admin management
    if (state.isAdmin) {
      const listEl = root.querySelector('#adminList');
      const refreshAdmins = async () => {
        if (!listEl) return;
        try {
          const admins = await listAdminEmails();
          if (!admins.length) { listEl.textContent = 'No admin emails yet.'; return; }
          listEl.innerHTML = admins.map(a => `
            <div class='flex items-center justify-between p-2 rounded bg-white/10 border border-white/10'>
              <span>${a.id}</span>
              <button class='glass-button px-2 py-1 text-xs remove-admin' data-email='${a.id}'>Remove</button>
            </div>
          `).join("");
          listEl.querySelectorAll('.remove-admin').forEach(btn => {
            btn.onclick = async () => { await removeAdminEmail(btn.dataset.email); refreshAdmins(); };
          });
        } catch {
          listEl.textContent = 'Failed to load admin emails';
        }
      };
      refreshAdmins();
      const addForm = root.querySelector('#addAdminForm');
      if (addForm) {
        addForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(addForm);
          const email = String(fd.get('email')||'').trim().toLowerCase();
          if (!email) return;
          await addAdminEmail(email, state.user?.uid || null);
          addForm.reset();
          refreshAdmins();
        };
      }
    }
    
    // Delete account functionality
    const deleteBtn = root.querySelector('#deleteAccountBtn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const { Modal } = await import("../utils/ui.js");
        
        // Create confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.innerHTML = `
          <div class="space-y-4">
            <div class="text-lg font-semibold text-red-400">Delete Account</div>
            <div class="text-glass-secondary">
              <p class="mb-2">This will permanently delete:</p>
              <ul class="text-sm list-disc list-inside space-y-1">
                <li>Your business card and profile</li>
                <li>All saved vendors and interactions</li>
                <li>Any vendor applications or profiles</li>
                <li>All account data</li>
              </ul>
              <p class="mt-3 font-semibold text-red-400">This action cannot be undone.</p>
            </div>
            <div class="border border-white/20 rounded p-3">
              <label class="text-sm text-glass-secondary">Type "DELETE" to confirm:</label>
              <input type="text" id="confirmDeleteInput" class="w-full mt-1 p-2 rounded border border-white/15 bg-white/10 text-glass" placeholder="DELETE">
            </div>
            <div class="flex justify-end gap-2">
              <button class="glass-button px-4 py-2" id="cancelDelete">Cancel</button>
              <button class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" id="confirmDelete" disabled>Delete Account</button>
            </div>
          </div>
        `;
        
        Modal(confirmModal);
        
        const confirmInput = confirmModal.querySelector('#confirmDeleteInput');
        const confirmDeleteBtn = confirmModal.querySelector('#confirmDelete');
        const cancelBtn = confirmModal.querySelector('#cancelDelete');
        
        // Enable delete button only when "DELETE" is typed
        confirmInput.oninput = () => {
          confirmDeleteBtn.disabled = confirmInput.value !== 'DELETE';
          confirmDeleteBtn.classList.toggle('opacity-50', confirmInput.value !== 'DELETE');
        };
        
        cancelBtn.onclick = () => Modal(null);
        
        confirmDeleteBtn.onclick = async () => {
          try {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Deleting...';
            
            // Import Firebase functions
            const { purgeCurrentUser } = await import("../firebase.js");
            const result = await purgeCurrentUser();
            
            if (!result.ok) {
              throw new Error(result.message || 'Failed to delete account');
            }
            
            Modal(null);
            const { Toast } = await import("../utils/ui.js");
            Toast('Account deleted successfully');
            
            // Redirect to home after deletion
            setTimeout(() => {
              window.location.hash = '/home';
              window.location.reload();
            }, 1000);
            
          } catch (error) {
            console.error('Delete account failed:', error);
            const { Toast } = await import("../utils/ui.js");
            Toast('Failed to delete account: ' + error.message);
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<ion-icon name="trash-outline" class="mr-2"></ion-icon>Delete Account';
          }
        };
      };
    }
  });
}
