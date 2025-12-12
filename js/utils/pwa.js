/**
 * PWA Install Prompt Handler
 * Manages the "Add to Home Screen" experience
 */

import { logTagged } from './logger.js';

let deferredPrompt = null;
let installPromptShown = false;

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  logTagged('PWA', 'Install prompt captured');
  
  // Show install button if user hasn't dismissed recently
  const lastDismissed = localStorage.getItem('pwa-install-dismissed');
  const daysSinceDismiss = lastDismissed 
    ? (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) 
    : 999;
  
  if (daysSinceDismiss > 7) {
    showInstallPrompt();
  }
});

// Track successful installs
window.addEventListener('appinstalled', () => {
  logTagged('PWA', 'App was installed');
  deferredPrompt = null;
  hideInstallPrompt();
  localStorage.setItem('pwa-installed', 'true');
});

/**
 * Check if the app is running as installed PWA
 */
export function isInstalledPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         localStorage.getItem('pwa-installed') === 'true';
}

/**
 * Check if install prompt is available
 */
export function canInstall() {
  return deferredPrompt !== null;
}

/**
 * Trigger the install prompt
 */
export async function promptInstall() {
  if (!deferredPrompt) {
    logTagged('PWA', 'No install prompt available');
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;
  logTagged('PWA', 'User response:', outcome);
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  return outcome === 'accepted';
}

/**
 * Show the install prompt UI
 */
function showInstallPrompt() {
  if (installPromptShown || isInstalledPWA()) return;
  installPromptShown = true;
  
  // Wait a bit before showing (let user interact first)
  setTimeout(() => {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 fade-in';
    banner.innerHTML = `
      <div class="glass-card p-4 shadow-xl border border-white/20">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-sm">WP</span>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-glass text-sm">Install Winn-Pro</h4>
            <p class="text-glass-secondary text-xs mt-1">Add to your home screen for the best experience</p>
          </div>
          <button id="pwa-dismiss" class="text-glass-secondary hover:text-glass p-1">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
        <div class="flex gap-2 mt-3">
          <button id="pwa-install" class="flex-1 brand-bg py-2 text-sm rounded-lg">
            Install
          </button>
          <button id="pwa-later" class="flex-1 glass-button py-2 text-sm rounded-lg">
            Later
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // Wire up buttons
    document.getElementById('pwa-install').onclick = async () => {
      const installed = await promptInstall();
      if (installed) {
        hideInstallPrompt();
      }
    };
    
    document.getElementById('pwa-dismiss').onclick = () => {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      hideInstallPrompt();
    };
    
    document.getElementById('pwa-later').onclick = () => {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      hideInstallPrompt();
    };
  }, 5000); // Show after 5 seconds
}

/**
 * Hide the install prompt UI
 */
function hideInstallPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(20px)';
    setTimeout(() => banner.remove(), 300);
  }
}

/**
 * Manual install button for settings/more page
 */
export function renderInstallButton() {
  if (isInstalledPWA()) {
    return `
      <div class="glass-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <ion-icon name="checkmark-circle" class="text-green-400 text-xl"></ion-icon>
        </div>
        <div>
          <div class="font-semibold text-glass">App Installed</div>
          <div class="text-xs text-glass-secondary">Winn-Pro is installed on your device</div>
        </div>
      </div>
    `;
  }
  
  if (!canInstall()) {
    return ''; // Browser doesn't support install or already installed
  }
  
  return `
    <button id="manual-install-btn" class="glass-card p-4 w-full flex items-center gap-3 hover:bg-white/10 transition-colors text-left">
      <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
        <ion-icon name="download-outline" class="text-blue-400 text-xl"></ion-icon>
      </div>
      <div class="flex-1">
        <div class="font-semibold text-glass">Install App</div>
        <div class="text-xs text-glass-secondary">Add Winn-Pro to your home screen</div>
      </div>
      <ion-icon name="chevron-forward-outline" class="text-glass-secondary"></ion-icon>
    </button>
  `;
}

/**
 * Wire up the manual install button
 */
export function wireInstallButton() {
  const btn = document.getElementById('manual-install-btn');
  if (btn) {
    btn.onclick = promptInstall;
  }
}
