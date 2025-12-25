/**
 * Ads Utility Module
 * Handles loading and displaying popup ads throughout the app
 * 
 * Features:
 * - Startup ads (shown when app opens)
 * - Random interval ads (shown periodically)
 * - Admin-controlled via Firestore
 */

import { closeModal } from './ui.js';

// Ad display state
let adsLoaded = false;
let activeAds = [];
let startupAdsShown = false;
let intervalId = null;
let lastAdShown = 0;
const MIN_AD_INTERVAL = 60000; // Minimum 60 seconds between random ads

/**
 * Load active ads from Firestore
 */
export async function loadAds() {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
    
    const adsQuery = query(
      collection(db, 'ads'),
      where('active', '==', true),
      orderBy('priority', 'desc')
    );
    
    const snapshot = await getDocs(adsQuery);
    activeAds = [];
    
    snapshot.forEach(doc => {
      activeAds.push({ id: doc.id, ...doc.data() });
    });
    
    adsLoaded = true;
    console.log('[Ads] Loaded', activeAds.length, 'active ads');
    return activeAds;
  } catch (error) {
    console.error('[Ads] Failed to load ads:', error);
    return [];
  }
}

/**
 * Show a popup ad
 */
export function showAdPopup(ad) {
  if (!ad) return;
  
  const root = document.getElementById('modal-root');
  if (!root) return;
  
  // Track impression
  trackAdImpression(ad.id);
  lastAdShown = Date.now();
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm fade-in';
  overlay.id = 'ad-overlay';
  
  const panel = document.createElement('div');
  panel.className = 'relative max-w-lg w-full mx-4 rounded-2xl overflow-hidden shadow-2xl';
  panel.onclick = e => e.stopPropagation();
  
  // Build ad content based on type
  let adContent = '';
  
  if (ad.imageUrl) {
    adContent = `
      <div class="relative">
        <img src="${ad.imageUrl}" alt="${ad.title || 'Advertisement'}" class="w-full h-auto" onerror="this.style.display='none'">
        ${ad.title ? `<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 class="text-xl font-bold text-white">${ad.title}</h3>
          ${ad.description ? `<p class="text-white/80 text-sm mt-1">${ad.description}</p>` : ''}
        </div>` : ''}
      </div>
    `;
  } else {
    // Text-only ad
    adContent = `
      <div class="p-6 bg-gradient-to-br from-brand to-purple-600">
        <h3 class="text-2xl font-bold text-white mb-2">${ad.title || 'Special Offer'}</h3>
        ${ad.description ? `<p class="text-white/90">${ad.description}</p>` : ''}
      </div>
    `;
  }
  
  panel.innerHTML = `
    ${adContent}
    <div class="bg-glass-surface p-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs text-glass-secondary">
        <ion-icon name="megaphone-outline"></ion-icon>
        <span>Sponsored</span>
      </div>
      <div class="flex gap-2">
        ${ad.linkUrl ? `
          <a href="${ad.linkUrl}" target="_blank" rel="noopener" 
             class="brand-bg px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1"
             onclick="window.closeAdPopup && window.closeAdPopup()">
            ${ad.buttonText || 'Learn More'}
            <ion-icon name="open-outline"></ion-icon>
          </a>
        ` : ''}
        <button class="glass-button px-4 py-2 rounded-lg text-sm" onclick="window.closeAdPopup && window.closeAdPopup()">
          Close
        </button>
      </div>
    </div>
  `;
  
  overlay.appendChild(panel);
  root.appendChild(overlay);
  
  // Global close function
  window.closeAdPopup = () => {
    const el = document.getElementById('ad-overlay');
    if (el) el.remove();
    delete window.closeAdPopup;
  };
  
  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      window.closeAdPopup();
    }
  };
  
  // Auto-dismiss after duration (if set)
  if (ad.autoDismiss && ad.dismissAfter) {
    setTimeout(() => {
      if (window.closeAdPopup) window.closeAdPopup();
    }, ad.dismissAfter * 1000);
  }
}

/**
 * Track ad impression
 */
async function trackAdImpression(adId) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
    
    await updateDoc(doc(db, 'ads', adId), {
      impressions: increment(1)
    });
  } catch (error) {
    console.error('[Ads] Failed to track impression:', error);
  }
}

/**
 * Show startup ad (called once when app opens)
 */
export async function showStartupAd() {
  if (startupAdsShown) return;
  
  if (!adsLoaded) {
    await loadAds();
  }
  
  // Find startup ads
  const startupAds = activeAds.filter(ad => ad.showOnStartup);
  
  if (startupAds.length === 0) {
    startupAdsShown = true;
    return;
  }
  
  // Pick a random startup ad
  const randomAd = startupAds[Math.floor(Math.random() * startupAds.length)];
  
  // Delay slightly to let app render first
  setTimeout(() => {
    showAdPopup(randomAd);
    startupAdsShown = true;
  }, 1500);
}

/**
 * Show a random ad (for interval-based display)
 */
export function showRandomAd() {
  // Check minimum interval
  if (Date.now() - lastAdShown < MIN_AD_INTERVAL) return;
  
  // Find interval-eligible ads
  const intervalAds = activeAds.filter(ad => ad.showAtIntervals);
  
  if (intervalAds.length === 0) return;
  
  // Pick a random one
  const randomAd = intervalAds[Math.floor(Math.random() * intervalAds.length)];
  showAdPopup(randomAd);
}

/**
 * Start random ad interval timer
 */
export function startAdInterval(intervalMinutes = 5) {
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  const intervalMs = intervalMinutes * 60 * 1000;
  
  intervalId = setInterval(() => {
    // Only show if user is active (page visible)
    if (document.visibilityState === 'visible') {
      showRandomAd();
    }
  }, intervalMs);
  
  console.log('[Ads] Started ad interval:', intervalMinutes, 'minutes');
}

/**
 * Stop ad interval timer
 */
export function stopAdInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Initialize ads system
 * Call this during app boot
 */
export async function initAds() {
  try {
    await loadAds();
    
    // Show startup ad if any
    await showStartupAd();
    
    // Start interval ads (default 5 minutes)
    // Check if any interval ads exist before starting timer
    const hasIntervalAds = activeAds.some(ad => ad.showAtIntervals);
    if (hasIntervalAds) {
      // Get interval setting from first interval ad, or default to 5 minutes
      const intervalMinutes = activeAds.find(ad => ad.intervalMinutes)?.intervalMinutes || 5;
      startAdInterval(intervalMinutes);
    }
    
    console.log('[Ads] Ads system initialized');
  } catch (error) {
    console.error('[Ads] Failed to initialize ads:', error);
  }
}

/**
 * Refresh ads (reload from Firestore)
 */
export async function refreshAds() {
  startupAdsShown = false; // Allow showing startup ad again if needed
  await loadAds();
}

/**
 * Get current active ads (for admin display)
 */
export function getActiveAds() {
  return activeAds;
}
