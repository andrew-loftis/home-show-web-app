import { getState, setRole, vendorLogout, setTheme, getTheme } from "../store.js";
import { renderInstallButton, wireInstallButton } from "../utils/pwa.js";
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, saveTokenToFirestore, getNotificationStatus } from "../utils/notifications.js";

export default async function More(root) {
  const state = getState();
  
  // Check vendor status for current user
  let vendorStatus = null;
  if (state.user && !state.user.isAnonymous) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const vendorData = snapshot.docs[0].data();
        vendorStatus = {
          exists: true,
          approved: vendorData.approved,
          name: vendorData.name
        };
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    }
  }

  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Profile</h1>
        <div class="text-sm text-glass-secondary">Role: <span class="font-semibold">${state.role || "-"}</span></div>
        ${state.user ? `
          <div class="mt-2 text-sm text-glass-secondary">Signed in as <span class="font-semibold truncate">${state.user.displayName || state.user.email}</span></div>
          ${state.isAdmin ? `<div class="mt-1 text-xs text-green-400">Admin privileges enabled</div>` : ``}
        ` : ``}
      </div>
      ${state.isAdmin ? `
        <div class="glass-card p-4 md:p-6 mb-4 md:mb-6">
          <h3 class="text-base md:text-lg font-semibold text-glass mb-3">Admin Tools</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-4">
            <button class="glass-button p-3 text-sm touch-target" onclick="window.location.hash='/admin'">
              <ion-icon name="settings-outline" class="mr-1"></ion-icon>Dashboard
            </button>
            <button class="glass-button p-3 text-sm touch-target" onclick="window.location.hash='/vendors'">
              <ion-icon name="storefront-outline" class="mr-1"></ion-icon>Vendors
            </button>
            ${getVendorButton(vendorStatus)}
          </div>
          <div class="border-t border-white/10 pt-4">
            <div class="font-semibold mb-2 text-sm">Admin Management</div>
            <form id="addAdminForm" class="flex flex-col sm:flex-row gap-2 mb-3">
              <input type="email" required placeholder="Add admin email" class="glass-input flex-1 p-3 rounded border border-white/15 bg-white/10 text-glass text-sm" name="email">
              <button class="brand-bg px-4 py-3 rounded text-sm touch-target">Add</button>
            </form>
            <div id="adminList" class="grid gap-2 text-sm text-glass-secondary">Loading admins…</div>
          </div>
        </div>
      ` : `
        <div class="glass-card p-4 md:p-6 mb-4 md:mb-6">
          <div class="text-sm text-glass-secondary mb-3">Quick Links</div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            ${getVendorButton(vendorStatus)}
            <button class="glass-button p-3 text-sm touch-target" onclick="window.location.hash='/saved-vendors'">
              <ion-icon name="bookmark-outline" class="mr-1"></ion-icon>Saved
            </button>
            <button class="glass-button p-3 text-sm touch-target col-span-2 md:col-span-1" onclick="window.location.hash='/cards'">
              <ion-icon name="card-outline" class="mr-1"></ion-icon>My Cards
            </button>
          </div>
        </div>
      `}
      <div class="glass-card p-4 md:p-6">
        <h3 class="text-base md:text-lg font-semibold text-glass mb-3">Account</h3>
        ${state.isAdmin ? `` : `<div class="text-xs text-glass-secondary mb-3">Role switching is disabled.</div>`}
        ${state.user ? `
          <div class="mb-4">
            <button class="brand-bg p-3 w-full sm:w-auto text-sm touch-target" id="signOutBtn">
              <ion-icon name="log-out-outline" class="mr-1"></ion-icon>Sign out
            </button>
          </div>
        ` : `
          <div class="mb-4">
            <button class="brand-bg p-3 w-full text-sm touch-target" id="googleSignInBtn">
              <ion-icon name="logo-google" class="mr-1"></ion-icon>Sign in with Google
            </button>
          </div>
          <form id="emailAuthForm" class="space-y-3 mb-4">
            <input type="email" required placeholder="Email" class="glass-input p-3 w-full rounded border border-white/15 bg-white/10 text-glass" name="email">
            <input type="password" required placeholder="Password" class="glass-input p-3 w-full rounded border border-white/15 bg-white/10 text-glass" name="password">
            <div class="flex gap-2">
              <button class="brand-bg px-4 py-3 rounded flex-1 text-sm touch-target" name="action" value="signin">Sign In</button>
              <button class="glass-button px-4 py-3 rounded flex-1 text-sm touch-target" name="action" value="signup" type="button" id="signupBtn">Create Account</button>
            </div>
          </form>
        `}
        <div class="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/10">
          <div>
            <div class="text-sm text-glass">Appearance</div>
            <div class="text-xs text-glass-secondary">Light or Dark mode</div>
          </div>
          <div class="flex gap-2">
            <button class="glass-button px-3 py-2 text-xs touch-target" id="lightThemeBtn">Light</button>
            <button class="glass-button px-3 py-2 text-xs touch-target" id="darkThemeBtn">Dark</button>
          </div>
        </div>
        
        <!-- Notification Settings -->
        ${isNotificationSupported() ? `
          <div class="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/10 mt-3">
            <div>
              <div class="text-sm text-glass">Notifications</div>
              <div class="text-xs text-glass-secondary" id="notificationStatus">
                ${getNotificationStatusText()}
              </div>
            </div>
            <button class="glass-button px-3 py-2 text-xs touch-target ${getNotificationPermission() === 'granted' ? 'bg-green-500/20 border-green-500/30' : ''}" id="notificationBtn">
              <ion-icon name="${getNotificationPermission() === 'granted' ? 'notifications' : 'notifications-outline'}" class="mr-1"></ion-icon>
              ${getNotificationPermission() === 'granted' ? 'Enabled' : 'Enable'}
            </button>
          </div>
        ` : ''}
        
        <!-- Version Stamp -->
        <div class="text-right mt-4 pt-3 border-t border-white/10">
          <span class="text-xs text-glass-secondary opacity-60">V-2.3</span>
        </div>
      </div>
      
      <!-- Install App Section -->
      <div class="mt-4 md:mt-6" id="install-section">
        ${renderInstallButton()}
      </div>
      ${state.user && !state.user.isAnonymous ? `
        <div class="glass-card p-4 md:p-6 mt-4 md:mt-6 border-red-500/20">
          <div class="text-center">
            <h3 class="text-base md:text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p class="text-xs md:text-sm text-glass-secondary mb-4">Permanently delete your account and all associated data.</p>
            <button class="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded font-semibold transition-colors text-sm touch-target" id="deleteAccountBtn">
              <ion-icon name="trash-outline" class="mr-1"></ion-icon>
              Delete Account
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Helper function to get notification status text
  function getNotificationStatusText() {
    const permission = getNotificationPermission();
    if (permission === 'granted') return 'Push notifications enabled';
    if (permission === 'denied') return 'Blocked - check browser settings';
    return 'Get updates about the show';
  }

  // Helper function to determine vendor button
  function getVendorButton(vendorStatus) {
    if (!vendorStatus || !vendorStatus.exists) {
      return `<button class="glass-button p-3" onclick="window.location.hash='/vendor-registration'">Vendor Registration</button>`;
    } else if (vendorStatus.approved) {
      return `<button class="glass-button p-3 bg-green-500/20 border-green-500/30" onclick="window.location.hash='/vendor-dashboard'">
        <div class="flex items-center justify-center">
          <ion-icon name="checkmark-circle" class="mr-2 text-green-400"></ion-icon>
          <span>Vendor Dashboard</span>
        </div>
      </button>`;
    } else {
      return `<button class="glass-button p-3 bg-yellow-500/20 border-yellow-500/30" onclick="window.location.hash='/vendor-registration'">
        <div class="flex items-center justify-center">
          <ion-icon name="hourglass" class="mr-2 text-yellow-400"></ion-icon>
          <span>Vendor Application</span>
        </div>
      </button>`;
    }
  }

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

  // Notification button
  const notificationBtn = root.querySelector('#notificationBtn');
  if (notificationBtn) {
    notificationBtn.onclick = async () => {
      const permission = getNotificationPermission();
      
      if (permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings.');
        return;
      }
      
      if (permission === 'granted') {
        // Already enabled - could show a test notification
        const { showLocalNotification } = await import('../utils/notifications.js');
        showLocalNotification('Notifications Active!', {
          body: 'You\'ll receive updates about the HomeShow.'
        });
        return;
      }
      
      // Request permission
      notificationBtn.disabled = true;
      notificationBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Requesting...';
      
      const result = await requestNotificationPermission();
      
      if (result.success) {
        notificationBtn.innerHTML = '<ion-icon name="notifications" class="mr-1"></ion-icon>Enabled';
        notificationBtn.classList.add('bg-green-500/20', 'border-green-500/30');
        root.querySelector('#notificationStatus').textContent = 'Push notifications enabled';
        
        // Save token to Firestore if user is signed in
        if (state.user && result.token) {
          await saveTokenToFirestore(state.user.uid, result.token);
        }
      } else {
        notificationBtn.innerHTML = '<ion-icon name="notifications-off-outline" class="mr-1"></ion-icon>Blocked';
        root.querySelector('#notificationStatus').textContent = result.error || 'Permission denied';
      }
      
      notificationBtn.disabled = false;
    };
  }

  // Wire up PWA install button
  wireInstallButton();

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
