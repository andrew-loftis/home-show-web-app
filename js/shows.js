/**
 * Shows Configuration - WinnPro Shows
 * 
 * Multi-show support with Firestore backend.
 * Shows are fetched from Firestore `shows` collection and cached locally.
 * Falls back to hardcoded defaults if Firestore is unavailable.
 */

// ============================================
// Default/Fallback Shows (used until Firestore loads)
// ============================================
const DEFAULT_SHOWS = {
  'putnam-spring-2026': {
    id: 'putnam-spring-2026',
    name: 'Putnam County Spring Home Show',
    shortName: 'Spring 2026',
    venue: 'Putnam County Fairgrounds',
    location: 'Cookeville, TN',
    dates: {
      start: '2026-02-20',
      end: '2026-02-22'
    },
    displayDate: 'February 20-22, 2026',
    season: 'spring',
    year: 2026,
    active: true,
    registrationOpen: true,
    color: 'from-blue-600 to-slate-600',
    icon: 'calendar-outline',
    description: 'Discover the latest in home improvement, remodeling, and outdoor living at the Putnam County Spring Home Show.',
  },
  'putnam-fall-2026': {
    id: 'putnam-fall-2026',
    name: 'Putnam County Fall Home Show',
    shortName: 'Fall 2026',
    venue: 'Putnam County Fairgrounds',
    location: 'Cookeville, TN',
    dates: {
      start: '2026-09-18',
      end: '2026-09-20'
    },
    displayDate: 'September 18-20, 2026',
    season: 'fall',
    year: 2026,
    active: true,
    registrationOpen: true,
    color: 'from-orange-600 to-slate-600',
    icon: 'calendar-outline',
    description: 'Get ready for fall and winter projects at the Putnam County Fall Home Show.',
  }
};

// ============================================
// State Management
// ============================================

// In-memory cache of shows (starts with defaults, updated from Firestore)
let SHOWS = { ...DEFAULT_SHOWS };
let showsInitialized = false;
let showsInitPromise = null;

// Default show ID (can be updated from Firestore settings)
export let DEFAULT_SHOW_ID = 'putnam-spring-2026';

// Storage keys
const SHOW_STORAGE_KEY = 'winnpro_selected_show';
const SHOWS_CACHE_KEY = 'winnpro_shows_cache';
const SHOWS_CACHE_TIME_KEY = 'winnpro_shows_cache_time';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================
// Firestore Integration
// ============================================

/**
 * Helper to create a timeout promise
 */
function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

/**
 * Initialize shows from Firestore
 * Called on app boot - caches results for performance
 */
export async function initShows() {
  // Return existing promise if already initializing
  if (showsInitPromise) return showsInitPromise;
  
  showsInitPromise = (async () => {
    try {
      // Check cache first
      const cached = loadShowsFromCache();
      if (cached) {
        SHOWS = cached;
        showsInitialized = true;
        console.log('[Shows] Loaded from cache:', Object.keys(SHOWS).length, 'shows');
        // Still try to refresh from Firestore in background
      }
      
      // Wait for Firebase app to be ready (with timeout)
      const { getApps } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
      
      // If no Firebase app initialized yet, use defaults
      if (getApps().length === 0) {
        console.log('[Shows] Firebase not initialized, using defaults');
        showsInitialized = true;
        return;
      }
      
      // Fetch fresh from Firestore with a 5-second timeout
      const fetchShows = async () => {
        const { getFirestore, collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
        const { getApp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
        
        const db = getFirestore(getApp());
        const showsRef = collection(db, 'shows');
        const q = query(showsRef, orderBy('year', 'asc'));
        return await getDocs(q);
      };
      
      const snapshot = await withTimeout(fetchShows(), 5000, null);
      
      // If timeout or error occurred, use cached/defaults
      if (!snapshot) {
        console.log('[Shows] Firestore fetch timed out, using cached/defaults');
        showsInitialized = true;
        return;
      }
      
      if (!snapshot.empty) {
        const firestoreShows = {};
        let defaultFound = false;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          // Normalize dates if they're Firestore timestamps
          if (data.dates) {
            if (data.dates.start?.toDate) {
              data.dates.start = data.dates.start.toDate().toISOString().split('T')[0];
            }
            if (data.dates.end?.toDate) {
              data.dates.end = data.dates.end.toDate().toISOString().split('T')[0];
            }
          }
          firestoreShows[doc.id] = { id: doc.id, ...data };
          
          // Set default show to first active upcoming show
          if (!defaultFound && data.active) {
            const endDate = new Date(data.dates?.end || '2099-12-31');
            if (endDate >= new Date()) {
              DEFAULT_SHOW_ID = doc.id;
              defaultFound = true;
            }
          }
        });
        
        SHOWS = firestoreShows;
        saveShowsToCache(firestoreShows);
        console.log('[Shows] Loaded from Firestore:', Object.keys(SHOWS).length, 'shows');
      } else {
        console.log('[Shows] No shows in Firestore, seeding defaults');
        // Seed defaults to Firestore if empty
        await seedDefaultShows();
      }
      
      showsInitialized = true;
    } catch (error) {
      console.warn('[Shows] Failed to load from Firestore, using defaults:', error);
      showsInitialized = true; // Mark as initialized even on error
    }
  })();
  
  return showsInitPromise;
}

/**
 * Seed default shows to Firestore (first-time setup)
 */
async function seedDefaultShows() {
  try {
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
    
    const db = getFirestore(getApp());
    
    for (const [id, show] of Object.entries(DEFAULT_SHOWS)) {
      await setDoc(doc(db, 'shows', id), show);
    }
    
    SHOWS = { ...DEFAULT_SHOWS };
    saveShowsToCache(SHOWS);
    console.log('[Shows] Seeded default shows to Firestore');
  } catch (error) {
    console.warn('[Shows] Failed to seed default shows:', error);
  }
}

/**
 * Save shows to localStorage cache
 */
function saveShowsToCache(shows) {
  try {
    localStorage.setItem(SHOWS_CACHE_KEY, JSON.stringify(shows));
    localStorage.setItem(SHOWS_CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('[Shows] Failed to cache shows:', e);
  }
}

/**
 * Load shows from localStorage cache
 */
function loadShowsFromCache() {
  try {
    const cacheTime = parseInt(localStorage.getItem(SHOWS_CACHE_TIME_KEY) || '0');
    if (Date.now() - cacheTime > CACHE_DURATION) {
      return null; // Cache expired
    }
    const cached = localStorage.getItem(SHOWS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn('[Shows] Failed to read cache:', e);
    return null;
  }
}

/**
 * Clear the shows cache (force refresh from Firestore)
 */
export function clearShowsCache() {
  try {
    localStorage.removeItem(SHOWS_CACHE_KEY);
    localStorage.removeItem(SHOWS_CACHE_TIME_KEY);
    showsInitialized = false;
    showsInitPromise = null;
  } catch (e) {
    console.warn('[Shows] Failed to clear cache:', e);
  }
}

/**
 * Refresh shows from Firestore
 */
export async function refreshShows() {
  clearShowsCache();
  await initShows();
  window.dispatchEvent(new CustomEvent('showsUpdated', { detail: { shows: SHOWS } }));
}

// ============================================
// Admin Functions (CRUD)
// ============================================

/**
 * Create a new show
 */
export async function createShow(showData) {
  try {
    const { getFirestore, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
    
    const db = getFirestore(getApp());
    
    // Generate ID from name if not provided
    const id = showData.id || generateShowId(showData.name, showData.year);
    
    const show = {
      ...showData,
      id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'shows', id), show);
    
    // Update local cache
    SHOWS[id] = { ...show, createdAt: new Date(), updatedAt: new Date() };
    saveShowsToCache(SHOWS);
    
    console.log('[Shows] Created show:', id);
    return { success: true, id, show: SHOWS[id] };
  } catch (error) {
    console.error('[Shows] Failed to create show:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing show
 */
export async function updateShow(showId, updates) {
  try {
    const { getFirestore, doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
    
    const db = getFirestore(getApp());
    
    await updateDoc(doc(db, 'shows', showId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Update local cache
    if (SHOWS[showId]) {
      SHOWS[showId] = { ...SHOWS[showId], ...updates, updatedAt: new Date() };
      saveShowsToCache(SHOWS);
    }
    
    console.log('[Shows] Updated show:', showId);
    return { success: true };
  } catch (error) {
    console.error('[Shows] Failed to update show:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a show
 */
export async function deleteShow(showId) {
  try {
    const { getFirestore, doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const { getApp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js");
    
    const db = getFirestore(getApp());
    
    await deleteDoc(doc(db, 'shows', showId));
    
    // Update local cache
    delete SHOWS[showId];
    saveShowsToCache(SHOWS);
    
    console.log('[Shows] Deleted show:', showId);
    return { success: true };
  } catch (error) {
    console.error('[Shows] Failed to delete show:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a URL-safe show ID from name and year
 */
function generateShowId(name, year) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return year ? `${base}-${year}` : base;
}

// ============================================
// Show Getters (sync - use cached data)
// ============================================

/**
 * Get the currently selected show ID
 */
export function getCurrentShowId() {
  try {
    const stored = localStorage.getItem(SHOW_STORAGE_KEY);
    if (stored && SHOWS[stored]) {
      return stored;
    }
  } catch (e) {
    console.warn('Could not read show from storage:', e);
  }
  // Return first active show or default
  const activeShows = Object.values(SHOWS).filter(s => s.active);
  if (activeShows.length > 0) {
    return activeShows[0].id;
  }
  return DEFAULT_SHOW_ID;
}

/**
 * Set the current show
 */
export function setCurrentShow(showId) {
  if (!SHOWS[showId]) {
    console.error('Invalid show ID:', showId);
    return false;
  }
  try {
    localStorage.setItem(SHOW_STORAGE_KEY, showId);
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('showChanged', { detail: { showId, show: SHOWS[showId] } }));
    return true;
  } catch (e) {
    console.error('Could not save show to storage:', e);
    return false;
  }
}

/**
 * Get the current show object
 */
export function getCurrentShow() {
  return SHOWS[getCurrentShowId()] || Object.values(SHOWS)[0] || DEFAULT_SHOWS[DEFAULT_SHOW_ID];
}

/**
 * Get a show by ID
 */
export function getShowById(showId) {
  return SHOWS[showId] || null;
}

/**
 * Get all available shows
 */
export function getAllShows() {
  return Object.values(SHOWS);
}

/**
 * Get shows that are currently active
 */
export function getActiveShows() {
  return Object.values(SHOWS).filter(show => show.active);
}

/**
 * Get shows with registration open
 */
export function getRegistrationOpenShows() {
  return Object.values(SHOWS).filter(show => show.active && show.registrationOpen);
}

/**
 * Get upcoming shows (sorted by start date)
 */
export function getUpcomingShows() {
  const now = new Date();
  return Object.values(SHOWS)
    .filter(show => new Date(show.dates?.end || '2099-12-31') >= now)
    .sort((a, b) => new Date(a.dates?.start || 0) - new Date(b.dates?.start || 0));
}

/**
 * Check if a show is currently happening
 */
export function isShowLive(showId) {
  const show = SHOWS[showId];
  if (!show || !show.dates) return false;
  
  const now = new Date();
  const start = new Date(show.dates.start);
  const end = new Date(show.dates.end);
  end.setHours(23, 59, 59, 999); // End of day
  
  return now >= start && now <= end;
}

/**
 * Get time until show starts
 */
export function getTimeUntilShow(showId) {
  const show = SHOWS[showId];
  if (!show || !show.dates) return null;
  
  const now = new Date();
  const start = new Date(show.dates.start);
  const diff = start - now;
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} away`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} away`;
  } else {
    return 'Starting soon!';
  }
}

// ============================================
// UI Helpers
// ============================================

/**
 * Get season color classes for a show
 */
export function getShowColorClasses(show) {
  if (!show) return { bg: 'bg-gray-600', gradient: 'from-gray-600 to-gray-700' };
  
  const season = show.season || 'spring';
  if (season === 'spring') {
    return { 
      bg: 'bg-blue-600', 
      gradient: show.color || 'from-blue-600 to-slate-600',
      text: 'text-blue-600',
      border: 'border-blue-600'
    };
  } else if (season === 'fall') {
    return { 
      bg: 'bg-orange-600', 
      gradient: show.color || 'from-orange-600 to-slate-600',
      text: 'text-orange-600',
      border: 'border-orange-600'
    };
  }
  return { bg: 'bg-gray-600', gradient: 'from-gray-600 to-gray-700', text: 'text-gray-600', border: 'border-gray-600' };
}

/**
 * Format a show for display in dropdowns
 */
export function formatShowOption(show) {
  if (!show) return '';
  return `${show.shortName || show.name} - ${show.displayDate || 'TBD'}`;
}

// ============================================
// UI Components
// ============================================

/**
 * Render the show selector dropdown HTML
 */
export function renderShowSelector() {
  const currentShow = getCurrentShow();
  const shows = getActiveShows();
  
  // If only one show, just display the name without dropdown
  if (shows.length <= 1) {
    return `
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-white">${currentShow?.shortName || 'Home Show'}</span>
      </div>
    `;
  }
  
  // Multiple shows - render dropdown
  return `
    <div class="relative" id="show-selector-container">
      <button id="show-selector-btn" class="flex items-center gap-2 glass-button px-3 py-2 rounded-lg touch-target">
        <span class="text-sm font-semibold text-white">${currentShow?.shortName || 'Select Show'}</span>
        <ion-icon name="chevron-down-outline" class="text-white/70 text-sm"></ion-icon>
      </button>
      <div id="show-selector-dropdown" class="hidden absolute top-full left-0 mt-2 min-w-48 glass-card rounded-xl shadow-xl z-50 overflow-hidden">
        ${shows.map(show => `
          <button class="show-option w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 ${show.id === getCurrentShowId() ? 'bg-white/10' : ''}" data-show-id="${show.id}">
            <div class="w-3 h-3 rounded-full bg-gradient-to-r ${show.color || 'from-blue-500 to-slate-500'}"></div>
            <div>
              <div class="text-sm font-semibold text-white">${show.shortName}</div>
              <div class="text-xs text-white/60">${show.displayDate || 'TBD'}</div>
            </div>
            ${show.id === getCurrentShowId() ? '<ion-icon name="checkmark" class="ml-auto text-green-400"></ion-icon>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Initialize show selector event listeners
 */
// Single document-level click listener for show selector (event delegation).
// Avoids adding a new listener on every header render.
let _selectorDelegationInstalled = false;
function _installSelectorDelegation() {
  if (_selectorDelegationInstalled) return;
  _selectorDelegationInstalled = true;

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('show-selector-dropdown');
    if (!dropdown) return;

    // Toggle if the selector button was clicked
    if (e.target.closest('#show-selector-btn')) {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
      return;
    }

    // Handle show option click
    const option = e.target.closest('.show-option');
    if (option && dropdown.contains(option)) {
      e.stopPropagation();
      const showId = option.dataset.showId;
      if (showId) {
        setCurrentShow(showId);
        dropdown.classList.add('hidden');
        window.dispatchEvent(new CustomEvent('showChanged', { detail: { showId } }));
        window.location.reload();
      }
      return;
    }

    // Close dropdown on any other click
    dropdown.classList.add('hidden');
  });
}

export function initShowSelector() {
  _installSelectorDelegation();
}

// ============================================
// Exports
// ============================================

// Export SHOWS as a getter for reactive updates
export { SHOWS };

export default SHOWS;
