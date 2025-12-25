/**
 * Admin Ads Module
 * Handles ad management in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast, Modal, closeModal } from '../../utils/ui.js';

/**
 * Render the ads tab HTML template
 */
export function renderAdsTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">Ad Management</h2>
        <div class="flex items-center gap-3">
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshAds">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
          </button>
          <button class="bg-green-600 px-4 py-2 rounded text-white" id="createAdBtn">
            <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Create Ad
          </button>
        </div>
      </div>
      
      <!-- Ad Stats -->
      <div id="adStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-brand" id="totalAdsCount">-</div>
          <div class="text-sm text-glass-secondary">Total Ads</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-green-400" id="activeAdsCount">-</div>
          <div class="text-sm text-glass-secondary">Active</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-yellow-400" id="startupAdsCount">-</div>
          <div class="text-sm text-glass-secondary">Startup Ads</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-purple-400" id="totalImpressions">-</div>
          <div class="text-sm text-glass-secondary">Total Impressions</div>
        </div>
      </div>
      
      <!-- Tips -->
      <div class="glass-card p-4 bg-blue-500/10 border border-blue-500/30">
        <div class="flex items-start gap-3">
          <ion-icon name="information-circle-outline" class="text-blue-400 text-xl mt-0.5"></ion-icon>
          <div class="text-sm text-glass-secondary">
            <p class="font-medium text-glass mb-1">Ad Types:</p>
            <ul class="list-disc list-inside space-y-1">
              <li><strong>Startup Ads:</strong> Shown once when users open the app</li>
              <li><strong>Interval Ads:</strong> Shown periodically while users browse</li>
              <li>Set priority (higher = shown first) to control which ads appear most</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Ads List -->
      <div id="adsList">Loading ads...</div>
    </div>
  `;
}

/**
 * Load ads data and render the list
 */
export async function loadAds(root) {
  const adsList = root.querySelector('#adsList');
  if (!adsList) return;

  try {
    console.log('[AdminAds] Loading ads...');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const adsSnap = await fsm.getDocs(
      fsm.query(fsm.collection(db, 'ads'), fsm.orderBy('priority', 'desc'))
    );
    
    const ads = [];
    adsSnap.forEach(doc => ads.push({ id: doc.id, ...doc.data() }));
    console.log('[AdminAds] Ads loaded:', ads.length);

    // Update stats
    const totalAds = ads.length;
    const activeAds = ads.filter(a => a.active).length;
    const startupAds = ads.filter(a => a.showOnStartup && a.active).length;
    const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions || 0), 0);

    const totalEl = root.querySelector('#totalAdsCount');
    const activeEl = root.querySelector('#activeAdsCount');
    const startupEl = root.querySelector('#startupAdsCount');
    const impressionsEl = root.querySelector('#totalImpressions');
    
    if (totalEl) totalEl.textContent = totalAds;
    if (activeEl) activeEl.textContent = activeAds;
    if (startupEl) startupEl.textContent = startupAds;
    if (impressionsEl) impressionsEl.textContent = totalImpressions.toLocaleString();

    // Render ads list
    if (ads.length === 0) {
      adsList.innerHTML = `
        <div class="glass-card p-8 text-center">
          <ion-icon name="megaphone-outline" class="text-4xl text-glass-secondary mb-3"></ion-icon>
          <p class="text-glass-secondary">No ads created yet. Click "Create Ad" to get started.</p>
        </div>
      `;
    } else {
      adsList.innerHTML = `
        <div class="space-y-4">
          ${ads.map(ad => renderAdCard(ad)).join('')}
        </div>
      `;
    }

    // Setup event listeners
    setupAdListeners(root);

  } catch (error) {
    console.error('[AdminAds] Failed to load ads:', error);
    adsList.innerHTML = '<div class="text-red-400 text-center p-4">Failed to load ads</div>';
  }
}

/**
 * Render a single ad card
 */
function renderAdCard(ad) {
  const statusClass = ad.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400';
  const statusText = ad.active ? 'Active' : 'Inactive';
  
  return `
    <div class="glass-card p-4 border ${ad.active ? 'border-green-500/30' : 'border-gray-500/30'}">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Preview -->
        <div class="md:w-48 flex-shrink-0">
          ${ad.imageUrl ? `
            <img src="${ad.imageUrl}" alt="${ad.title || 'Ad'}" class="w-full h-32 object-cover rounded-lg" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23374151%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2212%22>No Image</text></svg>'">
          ` : `
            <div class="w-full h-32 bg-gradient-to-br from-brand to-purple-600 rounded-lg flex items-center justify-center">
              <ion-icon name="megaphone-outline" class="text-4xl text-white/50"></ion-icon>
            </div>
          `}
        </div>
        
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 mb-2">
            <h3 class="text-lg font-semibold text-glass truncate">${ad.title || 'Untitled Ad'}</h3>
            <span class="px-2 py-1 rounded text-xs font-medium ${statusClass}">${statusText}</span>
          </div>
          
          ${ad.description ? `<p class="text-sm text-glass-secondary mb-2 line-clamp-2">${ad.description}</p>` : ''}
          
          <div class="flex flex-wrap gap-2 mb-3">
            ${ad.showOnStartup ? '<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Startup</span>' : ''}
            ${ad.showAtIntervals ? `<span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Every ${ad.intervalMinutes || 5} min</span>` : ''}
            <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Priority: ${ad.priority || 0}</span>
            <span class="px-2 py-1 bg-glass-surface text-glass-secondary rounded text-xs">${(ad.impressions || 0).toLocaleString()} views</span>
          </div>
          
          ${ad.linkUrl ? `
            <div class="text-xs text-glass-secondary truncate mb-2">
              <ion-icon name="link-outline" class="mr-1"></ion-icon>
              ${ad.linkUrl}
            </div>
          ` : ''}
        </div>
        
        <!-- Actions -->
        <div class="flex md:flex-col gap-2 flex-shrink-0">
          <button class="glass-button px-3 py-2 text-sm rounded flex items-center gap-1 edit-ad-btn" data-id="${ad.id}">
            <ion-icon name="create-outline"></ion-icon>
            Edit
          </button>
          <button class="glass-button px-3 py-2 text-sm rounded flex items-center gap-1 toggle-ad-btn" data-id="${ad.id}" data-active="${ad.active}">
            <ion-icon name="${ad.active ? 'pause-outline' : 'play-outline'}"></ion-icon>
            ${ad.active ? 'Disable' : 'Enable'}
          </button>
          <button class="text-red-400 hover:bg-red-500/20 px-3 py-2 text-sm rounded flex items-center gap-1 delete-ad-btn" data-id="${ad.id}">
            <ion-icon name="trash-outline"></ion-icon>
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup event listeners for ad management
 */
function setupAdListeners(root) {
  // Refresh button
  const refreshBtn = root.querySelector('#refreshAds');
  if (refreshBtn) {
    refreshBtn.onclick = () => loadAds(root);
  }

  // Create ad button
  const createBtn = root.querySelector('#createAdBtn');
  if (createBtn) {
    createBtn.onclick = () => showAdFormModal(root);
  }

  // Edit buttons
  root.querySelectorAll('.edit-ad-btn').forEach(btn => {
    btn.onclick = async () => {
      const adId = btn.dataset.id;
      await showAdFormModal(root, adId);
    };
  });

  // Toggle buttons
  root.querySelectorAll('.toggle-ad-btn').forEach(btn => {
    btn.onclick = async () => {
      const adId = btn.dataset.id;
      const currentlyActive = btn.dataset.active === 'true';
      await toggleAdStatus(adId, !currentlyActive);
      loadAds(root);
    };
  });

  // Delete buttons
  root.querySelectorAll('.delete-ad-btn').forEach(btn => {
    btn.onclick = async () => {
      const adId = btn.dataset.id;
      const confirmed = await ConfirmDialog(
        'Delete Ad',
        'Are you sure you want to delete this ad? This cannot be undone.',
        { danger: true, confirmText: 'Delete' }
      );
      if (confirmed) {
        await deleteAd(adId);
        loadAds(root);
      }
    };
  });
}

/**
 * Show ad creation/edit modal
 */
async function showAdFormModal(root, adId = null) {
  let ad = {
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    buttonText: 'Learn More',
    active: true,
    showOnStartup: true,
    showAtIntervals: false,
    intervalMinutes: 5,
    priority: 0,
    autoDismiss: false,
    dismissAfter: 10
  };

  // Load existing ad if editing
  if (adId) {
    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();
      const docSnap = await fsm.getDoc(fsm.doc(db, 'ads', adId));
      if (docSnap.exists()) {
        ad = { ...ad, ...docSnap.data() };
      }
    } catch (error) {
      console.error('Failed to load ad:', error);
      Toast('Failed to load ad');
      return;
    }
  }

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="max-h-[80vh] overflow-y-auto">
      <h2 class="text-xl font-bold text-glass mb-4">${adId ? 'Edit Ad' : 'Create New Ad'}</h2>
      
      <form id="adForm" class="space-y-4">
        <!-- Basic Info -->
        <div>
          <label class="block text-sm font-medium text-glass-secondary mb-1">Title *</label>
          <input type="text" name="title" value="${ad.title}" required
                 class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass"
                 placeholder="Ad title (shown to users)">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-glass-secondary mb-1">Description</label>
          <textarea name="description" rows="2"
                    class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass"
                    placeholder="Optional description text">${ad.description}</textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-glass-secondary mb-1">Image URL</label>
          <input type="url" name="imageUrl" value="${ad.imageUrl}"
                 class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass"
                 placeholder="https://example.com/ad-image.jpg">
          <p class="text-xs text-glass-secondary mt-1">Leave blank for a gradient background with title</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-glass-secondary mb-1">Link URL</label>
            <input type="url" name="linkUrl" value="${ad.linkUrl}"
                   class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass"
                   placeholder="https://...">
          </div>
          <div>
            <label class="block text-sm font-medium text-glass-secondary mb-1">Button Text</label>
            <input type="text" name="buttonText" value="${ad.buttonText}"
                   class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass"
                   placeholder="Learn More">
          </div>
        </div>
        
        <!-- Display Options -->
        <div class="border-t border-white/10 pt-4">
          <h3 class="text-sm font-semibold text-glass mb-3">Display Options</h3>
          
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="showOnStartup" ${ad.showOnStartup ? 'checked' : ''} class="w-4 h-4">
              <div>
                <span class="text-glass">Show on app startup</span>
                <p class="text-xs text-glass-secondary">Displayed when users first open the app</p>
              </div>
            </label>
            
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="showAtIntervals" ${ad.showAtIntervals ? 'checked' : ''} class="w-4 h-4" id="intervalCheck">
              <div>
                <span class="text-glass">Show at random intervals</span>
                <p class="text-xs text-glass-secondary">Periodically while users browse</p>
              </div>
            </label>
            
            <div id="intervalSettings" class="${ad.showAtIntervals ? '' : 'hidden'} ml-7">
              <label class="block text-sm text-glass-secondary mb-1">Interval (minutes)</label>
              <input type="number" name="intervalMinutes" value="${ad.intervalMinutes}" min="1" max="60"
                     class="w-24 px-3 py-2 rounded border border-white/20 bg-white/10 text-glass">
            </div>
            
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="autoDismiss" ${ad.autoDismiss ? 'checked' : ''} class="w-4 h-4" id="autoDismissCheck">
              <div>
                <span class="text-glass">Auto-dismiss</span>
                <p class="text-xs text-glass-secondary">Automatically close after a duration</p>
              </div>
            </label>
            
            <div id="dismissSettings" class="${ad.autoDismiss ? '' : 'hidden'} ml-7">
              <label class="block text-sm text-glass-secondary mb-1">Dismiss after (seconds)</label>
              <input type="number" name="dismissAfter" value="${ad.dismissAfter}" min="3" max="60"
                     class="w-24 px-3 py-2 rounded border border-white/20 bg-white/10 text-glass">
            </div>
          </div>
        </div>
        
        <!-- Priority & Status -->
        <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div>
            <label class="block text-sm font-medium text-glass-secondary mb-1">Priority</label>
            <input type="number" name="priority" value="${ad.priority}" min="0" max="100"
                   class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass">
            <p class="text-xs text-glass-secondary mt-1">Higher = shown more often</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-glass-secondary mb-1">Status</label>
            <label class="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" name="active" ${ad.active ? 'checked' : ''} class="w-4 h-4">
              <span class="text-glass">Active</span>
            </label>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex gap-3 pt-4 border-t border-white/10">
          <button type="button" class="glass-button px-4 py-2 rounded flex-1" onclick="window.closeAdModal && window.closeAdModal()">
            Cancel
          </button>
          <button type="submit" class="brand-bg px-4 py-2 rounded flex-1">
            ${adId ? 'Save Changes' : 'Create Ad'}
          </button>
        </div>
      </form>
    </div>
  `;

  Modal(content, { preventClose: true, size: 'large' });

  // Toggle interval settings visibility
  const intervalCheck = content.querySelector('#intervalCheck');
  const intervalSettings = content.querySelector('#intervalSettings');
  intervalCheck.onchange = () => {
    intervalSettings.classList.toggle('hidden', !intervalCheck.checked);
  };

  // Toggle dismiss settings visibility
  const autoDismissCheck = content.querySelector('#autoDismissCheck');
  const dismissSettings = content.querySelector('#dismissSettings');
  autoDismissCheck.onchange = () => {
    dismissSettings.classList.toggle('hidden', !autoDismissCheck.checked);
  };

  // Close modal function
  window.closeAdModal = () => {
    closeModal();
    delete window.closeAdModal;
  };

  // Form submission
  const form = content.querySelector('#adForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const adData = {
      title: formData.get('title'),
      description: formData.get('description'),
      imageUrl: formData.get('imageUrl'),
      linkUrl: formData.get('linkUrl'),
      buttonText: formData.get('buttonText') || 'Learn More',
      showOnStartup: formData.get('showOnStartup') === 'on',
      showAtIntervals: formData.get('showAtIntervals') === 'on',
      intervalMinutes: parseInt(formData.get('intervalMinutes')) || 5,
      autoDismiss: formData.get('autoDismiss') === 'on',
      dismissAfter: parseInt(formData.get('dismissAfter')) || 10,
      priority: parseInt(formData.get('priority')) || 0,
      active: formData.get('active') === 'on',
      updatedAt: new Date()
    };

    try {
      const db = await getAdminDb();
      const fsm = await getFirestoreModule();

      if (adId) {
        await fsm.updateDoc(fsm.doc(db, 'ads', adId), adData);
        Toast('Ad updated successfully');
      } else {
        adData.createdAt = new Date();
        adData.impressions = 0;
        await fsm.addDoc(fsm.collection(db, 'ads'), adData);
        Toast('Ad created successfully');
      }

      window.closeAdModal();
      loadAds(root);
    } catch (error) {
      console.error('Failed to save ad:', error);
      Toast('Failed to save ad');
    }
  };
}

/**
 * Toggle ad active status
 */
async function toggleAdStatus(adId, active) {
  try {
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();
    
    await fsm.updateDoc(fsm.doc(db, 'ads', adId), {
      active,
      updatedAt: new Date()
    });
    
    Toast(active ? 'Ad enabled' : 'Ad disabled');
  } catch (error) {
    console.error('Failed to toggle ad:', error);
    Toast('Failed to update ad');
  }
}

/**
 * Delete an ad
 */
async function deleteAd(adId) {
  try {
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();
    
    await fsm.deleteDoc(fsm.doc(db, 'ads', adId));
    Toast('Ad deleted');
  } catch (error) {
    console.error('Failed to delete ad:', error);
    Toast('Failed to delete ad');
  }
}
