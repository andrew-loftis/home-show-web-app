import { getState, setRole, vendorLogout, setTheme, getTheme } from "../store.js";
import { renderInstallButton, wireInstallButton } from "../utils/pwa.js";
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, saveTokenToFirestore, getNotificationStatus } from "../utils/notifications.js";
import { Toast } from "../utils/ui.js";
import { handleAuthError } from "../utils/authErrors.js";

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

  // Determine friendly role description
  const getRoleDescription = () => {
    if (state.isAdmin) return { label: 'Admin', color: 'text-green-400', icon: 'shield-checkmark' };
    if (state.myVendor?.approved) return { label: 'Vendor', color: 'text-blue-400', icon: 'storefront' };
    if (state.myVendor) return { label: 'Vendor (Pending)', color: 'text-yellow-400', icon: 'time' };
    if (state.user && !state.user.isAnonymous) return { label: 'Attendee', color: 'text-purple-400', icon: 'person' };
    return { label: 'Guest', color: 'text-glass-secondary', icon: 'person-outline' };
  };
  const roleInfo = getRoleDescription();

  root.innerHTML = `
    <div class="container-glass fade-in">
      <!-- Profile header - compact -->
      <div class="text-center mb-5">
        <h1 class="text-xl font-bold text-glass">Profile</h1>
        <div class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-white/10 text-sm">
          <ion-icon name="${roleInfo.icon}" class="${roleInfo.color}"></ion-icon>
          <span class="${roleInfo.color} font-medium">${roleInfo.label}</span>
        </div>
        ${state.user ? `
          <div class="mt-1 text-xs text-glass-secondary truncate">${state.user.displayName || state.user.email}</div>
        ` : ``}
      </div>
      ${state.isAdmin ? `
        <div class="glass-card mb-4">
          <h3 class="text-sm font-semibold text-glass mb-3">Admin Tools</h3>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <button class="glass-button p-2.5 text-xs touch-target" onclick="window.location.hash='/admin'">
              <ion-icon name="settings-outline" class="mr-1"></ion-icon>Dashboard
            </button>
            <button class="glass-button p-2.5 text-xs touch-target" onclick="window.location.hash='/vendors'">
              <ion-icon name="storefront-outline" class="mr-1"></ion-icon>Vendors
            </button>
            ${getVendorButton(vendorStatus)}
          </div>
          <div class="border-t border-white/10 pt-3">
            <div class="font-medium mb-2 text-xs text-glass-secondary">Add Admin</div>
            <form id="addAdminForm" class="flex gap-2 mb-2">
              <input type="email" required placeholder="admin@email.com" class="flex-1 p-2.5 rounded text-sm" name="email">
              <button class="brand-bg px-3 py-2.5 rounded text-xs touch-target">Add</button>
            </form>
            <div id="adminList" class="text-xs text-glass-secondary">Loading admins…</div>
          </div>
        </div>
      ` : `
        <div class="glass-card mb-4">
          <div class="text-xs text-glass-secondary mb-2">Quick Links</div>
          <div class="grid grid-cols-3 gap-2">
            ${getVendorButton(vendorStatus)}
            <button class="glass-button p-2.5 text-xs touch-target" onclick="window.location.hash='/saved-vendors'">
              <ion-icon name="bookmark-outline" class="mr-1"></ion-icon>Saved
            </button>
            <button class="glass-button p-2.5 text-xs touch-target" onclick="window.location.hash='/cards'">
              <ion-icon name="card-outline" class="mr-1"></ion-icon>Cards
            </button>
          </div>
        </div>
      `}
      <div class="glass-card">
        <h3 class="text-sm font-semibold text-glass mb-3">Account</h3>
        ${state.user ? `
          <div class="mb-3 space-y-2">
            <button class="brand-bg p-2.5 w-full text-sm touch-target" id="signOutBtn">
              <ion-icon name="log-out-outline" class="mr-1"></ion-icon>Sign out
            </button>
          </div>
        ` : `
          <div class="mb-3 space-y-2">
            <button class="brand-bg p-3 w-full text-sm touch-target" id="googleSignInBtn">
              <ion-icon name="logo-google" class="mr-1"></ion-icon>Sign in with Google
            </button>
            <!-- Sign in with Apple (iOS only) -->
            <button class="glass-button p-3 w-full text-sm touch-target hidden" id="appleSignInBtn" style="background: #000; color: #fff; border-color: #333;">
              <ion-icon name="logo-apple" class="mr-1"></ion-icon>Sign in with Apple
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
          <span class="text-xs text-glass-secondary opacity-60">V-3.1</span>
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
      // Native (Capacitor) push flow
      try {
        const { isNative, requestPushPermissions, setupPushListeners } = await import('../utils/native.js');
        if (isNative()) {
          notificationBtn.disabled = true;
          notificationBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Enabling...';

          const allowed = await requestPushPermissions();
          if (!allowed) {
            notificationBtn.innerHTML = '<ion-icon name="notifications-off-outline" class="mr-1"></ion-icon>Blocked';
            root.querySelector('#notificationStatus').textContent = 'Permission denied';
            notificationBtn.disabled = false;
            return;
          }

          const token = await new Promise((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
              if (settled) return;
              settled = true;
              reject(new Error('Timed out registering for push notifications'));
            }, 12000);

            setupPushListeners({
              onRegistration: (t) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                resolve(t);
              },
              onRegistrationError: (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                reject(err instanceof Error ? err : new Error('Push registration failed'));
              }
            });
          });

          if (state.user && token) {
            await saveTokenToFirestore(state.user.uid, token);
          }

          notificationBtn.innerHTML = '<ion-icon name="notifications" class="mr-1"></ion-icon>Enabled';
          notificationBtn.classList.add('bg-green-500/20', 'border-green-500/30');
          root.querySelector('#notificationStatus').textContent = 'Push notifications enabled';
          notificationBtn.disabled = false;
          return;
        }
      } catch {
        // fall through to web flow
      }

      const permission = getNotificationPermission();
      
      if (permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings.');
        return;
      }
      
      if (permission === 'granted') {
        // Already enabled - could show a test notification
        const { showLocalNotification } = await import('../utils/notifications.js');
        showLocalNotification('Notifications Active!', {
          body: 'You\'ll receive updates about WinnPro Shows.'
        });
        return;
      }
      
      // Request permission
      notificationBtn.disabled = true;
      notificationBtn.innerHTML = '<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Requesting...';

      // If VAPID key isn't configured, web token generation will fail.
      // Allow a runtime override via localStorage for quick setup.
      if (!window.FCM_VAPID_KEY && !localStorage.getItem('fcmVapidKey')) {
        const key = prompt('Push notifications require the Firebase Web Push VAPID key. Paste it here to enable notifications on this device:');
        if (key && key.trim()) {
          localStorage.setItem('fcmVapidKey', key.trim());
        }
      }
      
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
  import("../firebase.js").then(({ signInWithGoogle, signInWithApple, signOutUser, signInWithEmailPassword, signUpWithEmailPassword, signInAnonymouslyUser, listAdminEmails, addAdminEmail, removeAdminEmail, isIOSDevice }) => {
    const signInBtn = root.querySelector('#googleSignInBtn');
    const signOutBtn = root.querySelector('#signOutBtn');
    const appleSignInBtn = root.querySelector('#appleSignInBtn');
    
    // Show Apple Sign In button on iOS
    if (appleSignInBtn && isIOSDevice()) {
      appleSignInBtn.classList.remove('hidden');
      appleSignInBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          console.log('[More] Starting Apple sign in...');
          await signInWithApple();
          console.log('[More] Apple sign in successful');
        } catch (error) {
          handleAuthError(error, 'Apple');
        }
      };
    }
    
  if (signInBtn) signInBtn.onclick = async (e) => { 
    e.preventDefault();
    try { 
      console.log('[More] Starting Google sign in...');
      await signInWithGoogle(); 
      console.log('[More] Google sign in successful');
    } catch (error) {
      handleAuthError(error, 'Google');
    }
  };
  if (signOutBtn) signOutBtn.onclick = async () => {
    try {
      await signOutUser();
    } catch {}
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
          handleAuthError(err, 'Email');
        }
      };
      const signupBtn = root.querySelector('#signupBtn');
      if (signupBtn) signupBtn.onclick = async () => {
        const email = root.querySelector('input[name="email"]').value;
        const password = root.querySelector('input[name="password"]').value;
        if (!email || !password) {
          Toast('Please enter both email and password.');
          return;
        }
        try {
          await signUpWithEmailPassword(email, password);
          Toast('Account created successfully!');
        } catch (err) {
          handleAuthError(err, 'Sign up');
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
