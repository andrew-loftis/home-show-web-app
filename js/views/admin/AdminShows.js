/**
 * Admin Shows Module
 * Handles show management functionality in the Admin Dashboard
 */

import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';
import { 
  getAllShows, 
  createShow, 
  updateShow, 
  deleteShow, 
  refreshShows,
  getShowColorClasses,
  DEFAULT_SHOW_ID
} from '../../shows.js';

// ============================================
// Render Functions
// ============================================

/**
 * Render the shows management tab
 */
export function renderShowsTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-glass">Show Management</h2>
          <p class="text-sm text-glass-secondary">Create and manage home shows</p>
        </div>
        <div class="flex gap-3">
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshShowsBtn">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
          </button>
          <button class="bg-green-600 px-4 py-2 rounded text-white" id="createShowBtn">
            <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Create Show
          </button>
        </div>
      </div>
      
      <!-- Shows Stats -->
      <div id="showsStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Stats populated by JS -->
      </div>
      
      <!-- Shows List -->
      <div id="showsList" class="space-y-4">
        <div class="glass-card p-8 text-center text-glass-secondary">
          Loading shows...
        </div>
      </div>
    </div>
  `;
}

/**
 * Load and render shows
 */
export async function loadShows(root) {
  const listEl = root.querySelector('#showsList');
  const statsEl = root.querySelector('#showsStats');
  const refreshBtn = root.querySelector('#refreshShowsBtn');
  const createBtn = root.querySelector('#createShowBtn');
  
  if (!listEl) return;
  
  // Wire up buttons
  if (refreshBtn && !refreshBtn._listenerAdded) {
    refreshBtn._listenerAdded = true;
    refreshBtn.onclick = async () => {
      await refreshShows();
      await loadShows(root);
      Toast('Shows refreshed');
    };
  }
  
  if (createBtn && !createBtn._listenerAdded) {
    createBtn._listenerAdded = true;
    createBtn.onclick = () => showCreateShowModal(root);
  }
  
  try {
    const shows = getAllShows();
    
    // Render stats
    if (statsEl) {
      const activeCount = shows.filter(s => s.active).length;
      const registrationOpen = shows.filter(s => s.registrationOpen).length;
      const upcomingCount = shows.filter(s => new Date(s.dates?.end || '2099-12-31') >= new Date()).length;
      
      statsEl.innerHTML = `
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-brand">${shows.length}</div>
          <div class="text-sm text-glass-secondary">Total Shows</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-green-400">${activeCount}</div>
          <div class="text-sm text-glass-secondary">Active</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">${registrationOpen}</div>
          <div class="text-sm text-glass-secondary">Registration Open</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-orange-400">${upcomingCount}</div>
          <div class="text-sm text-glass-secondary">Upcoming</div>
        </div>
      `;
    }
    
    // Render shows list
    if (shows.length === 0) {
      listEl.innerHTML = `
        <div class="glass-card p-8 text-center">
          <ion-icon name="calendar-outline" class="text-4xl text-glass-secondary mb-3"></ion-icon>
          <p class="text-glass-secondary mb-4">No shows configured yet.</p>
          <button class="bg-brand px-4 py-2 rounded text-white" onclick="document.getElementById('createShowBtn').click()">
            Create Your First Show
          </button>
        </div>
      `;
      return;
    }
    
    // Sort by year desc, then by start date
    const sortedShows = [...shows].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return new Date(b.dates?.start || 0) - new Date(a.dates?.start || 0);
    });
    
    listEl.innerHTML = sortedShows.map(show => renderShowCard(show)).join('');
    
    // Wire up card actions
    setupShowCardListeners(root);
    
  } catch (error) {
    console.error('[AdminShows] Failed to load shows:', error);
    listEl.innerHTML = `
      <div class="glass-card p-8 text-center text-red-400">
        <ion-icon name="warning-outline" class="text-3xl mb-2"></ion-icon>
        <p>Failed to load shows</p>
      </div>
    `;
  }
}

/**
 * Render a single show card
 */
function renderShowCard(show) {
  const colors = getShowColorClasses(show);
  const isUpcoming = new Date(show.dates?.end || '2099-12-31') >= new Date();
  const isLive = isShowCurrentlyLive(show);
  
  return `
    <div class="glass-card p-4" data-show-id="${show.id}">
      <div class="flex items-start gap-4">
        <!-- Show Icon -->
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 shadow-lg">
          <ion-icon name="${show.icon || 'calendar-outline'}" class="text-white text-2xl"></ion-icon>
        </div>
        
        <!-- Show Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h3 class="text-lg font-semibold text-glass">${show.name}</h3>
            ${isLive ? '<span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1"><span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>Live</span>' : ''}
            ${show.active ? '<span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Active</span>' : '<span class="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">Inactive</span>'}
            ${show.registrationOpen ? '<span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Registration Open</span>' : ''}
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-glass-secondary mb-3">
            <div class="flex items-center gap-1">
              <ion-icon name="calendar-outline" class="text-glass-secondary"></ion-icon>
              ${show.displayDate || 'Dates TBD'}
            </div>
            <div class="flex items-center gap-1">
              <ion-icon name="location-outline" class="text-glass-secondary"></ion-icon>
              ${show.venue || 'Venue TBD'}
            </div>
            <div class="flex items-center gap-1">
              <ion-icon name="navigate-outline" class="text-glass-secondary"></ion-icon>
              ${show.location || 'Location TBD'}
            </div>
          </div>
          
          <p class="text-sm text-glass-secondary line-clamp-2">${show.description || 'No description'}</p>
        </div>
        
        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <button class="edit-show-btn p-2 rounded-lg bg-glass-surface hover:bg-blue-600/20 text-glass-secondary hover:text-blue-400 transition-colors" title="Edit Show">
            <ion-icon name="create-outline" class="text-lg"></ion-icon>
          </button>
          <button class="toggle-show-btn p-2 rounded-lg bg-glass-surface hover:bg-yellow-600/20 text-glass-secondary hover:text-yellow-400 transition-colors" title="${show.active ? 'Deactivate' : 'Activate'}">
            <ion-icon name="${show.active ? 'eye-off-outline' : 'eye-outline'}" class="text-lg"></ion-icon>
          </button>
          <button class="delete-show-btn p-2 rounded-lg bg-glass-surface hover:bg-red-600/20 text-glass-secondary hover:text-red-400 transition-colors" title="Delete Show">
            <ion-icon name="trash-outline" class="text-lg"></ion-icon>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Check if a show is currently live
 */
function isShowCurrentlyLive(show) {
  if (!show.dates) return false;
  const now = new Date();
  const start = new Date(show.dates.start);
  const end = new Date(show.dates.end);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

/**
 * Setup event listeners for show cards
 */
function setupShowCardListeners(root) {
  // Edit buttons
  root.querySelectorAll('.edit-show-btn').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('[data-show-id]');
      const showId = card?.dataset.showId;
      if (showId) showEditShowModal(root, showId);
    };
  });
  
  // Toggle active buttons
  root.querySelectorAll('.toggle-show-btn').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('[data-show-id]');
      const showId = card?.dataset.showId;
      if (!showId) return;
      
      const shows = getAllShows();
      const show = shows.find(s => s.id === showId);
      if (!show) return;
      
      const newActive = !show.active;
      const result = await updateShow(showId, { active: newActive });
      
      if (result.success) {
        Toast(`Show ${newActive ? 'activated' : 'deactivated'}`);
        await loadShows(root);
      } else {
        Toast(`Failed to update show: ${result.error}`);
      }
    };
  });
  
  // Delete buttons
  root.querySelectorAll('.delete-show-btn').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('[data-show-id]');
      const showId = card?.dataset.showId;
      if (!showId) return;
      
      const shows = getAllShows();
      const show = shows.find(s => s.id === showId);
      if (!show) return;
      
      const confirmed = await ConfirmDialog(
        'Delete Show',
        `Are you sure you want to delete "${show.name}"? This cannot be undone. Note: This will NOT delete vendors, attendees, or leads associated with this show.`,
        { confirmText: 'Delete', type: 'danger' }
      );
      
      if (!confirmed) return;
      
      const result = await deleteShow(showId);
      
      if (result.success) {
        Toast('Show deleted');
        await loadShows(root);
      } else {
        Toast(`Failed to delete show: ${result.error}`);
      }
    };
  });
}

// ============================================
// Modal Functions
// ============================================

/**
 * Show create show modal
 */
function showCreateShowModal(root) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const modalHtml = `
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" id="showModal">
      <div class="bg-glass-surface border border-glass-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-glass">Create New Show</h3>
          <button id="closeShowModal" class="p-2 hover:bg-glass-surface rounded-lg text-glass-secondary hover:text-glass">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
        
        <form id="showForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Show Name *</label>
              <input type="text" name="name" required placeholder="e.g., Putnam County Spring Home Show" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Short Name *</label>
              <input type="text" name="shortName" required placeholder="e.g., Spring 2026" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary">
            </div>
          </div>
          
          <!-- Venue & Location -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Venue *</label>
              <input type="text" name="venue" required placeholder="e.g., Putnam County Fairgrounds" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Location *</label>
              <input type="text" name="location" required placeholder="e.g., Cookeville, TN" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary">
            </div>
          </div>
          
          <!-- Dates -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Start Date *</label>
              <input type="date" name="startDate" required 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">End Date *</label>
              <input type="date" name="endDate" required 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Display Date *</label>
              <input type="text" name="displayDate" required placeholder="e.g., February 20-22, 2026" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary">
            </div>
          </div>
          
          <!-- Season & Year -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Season *</label>
              <select name="season" required class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
                <option value="spring">Spring</option>
                <option value="fall">Fall</option>
                <option value="summer">Summer</option>
                <option value="winter">Winter</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Year *</label>
              <input type="number" name="year" required value="${nextYear}" min="2020" max="2099" 
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-glass mb-1">Description</label>
            <textarea name="description" rows="3" placeholder="Brief description of the show..." 
              class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass placeholder-glass-secondary resize-none"></textarea>
          </div>
          
          <!-- Status Toggles -->
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="active" checked class="w-5 h-5 rounded border-glass-border bg-glass-surface text-brand focus:ring-brand">
              <span class="text-sm text-glass">Active (visible to users)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="registrationOpen" checked class="w-5 h-5 rounded border-glass-border bg-glass-surface text-brand focus:ring-brand">
              <span class="text-sm text-glass">Registration Open (vendors can sign up)</span>
            </label>
          </div>
          
          <!-- Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t border-glass-border">
            <button type="button" id="cancelShowBtn" class="px-4 py-2 rounded-lg bg-glass-surface text-glass hover:bg-glass-surface/70">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/80">
              Create Show
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  const modal = document.getElementById('showModal');
  const form = document.getElementById('showForm');
  const closeBtn = document.getElementById('closeShowModal');
  const cancelBtn = document.getElementById('cancelShowBtn');
  
  const closeModal = () => modal?.remove();
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const showData = {
      name: formData.get('name'),
      shortName: formData.get('shortName'),
      venue: formData.get('venue'),
      location: formData.get('location'),
      dates: {
        start: formData.get('startDate'),
        end: formData.get('endDate')
      },
      displayDate: formData.get('displayDate'),
      season: formData.get('season'),
      year: parseInt(formData.get('year')),
      description: formData.get('description'),
      active: formData.get('active') === 'on',
      registrationOpen: formData.get('registrationOpen') === 'on',
      icon: 'calendar-outline',
      color: formData.get('season') === 'spring' ? 'from-blue-600 to-slate-600' : 
             formData.get('season') === 'fall' ? 'from-orange-600 to-slate-600' :
             formData.get('season') === 'summer' ? 'from-yellow-600 to-orange-600' :
             'from-blue-700 to-slate-700'
    };
    
    const result = await createShow(showData);
    
    if (result.success) {
      Toast('Show created successfully!');
      closeModal();
      await loadShows(root);
    } else {
      await AlertDialog('Error', `Failed to create show: ${result.error}`, { type: 'error' });
    }
  });
}

/**
 * Show edit show modal
 */
function showEditShowModal(root, showId) {
  const shows = getAllShows();
  const show = shows.find(s => s.id === showId);
  if (!show) {
    Toast('Show not found');
    return;
  }
  
  const modalHtml = `
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" id="showModal">
      <div class="bg-glass-surface border border-glass-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-glass">Edit Show</h3>
          <button id="closeShowModal" class="p-2 hover:bg-glass-surface rounded-lg text-glass-secondary hover:text-glass">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
        
        <form id="showForm" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Show Name *</label>
              <input type="text" name="name" required value="${show.name || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Short Name *</label>
              <input type="text" name="shortName" required value="${show.shortName || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
          </div>
          
          <!-- Venue & Location -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Venue *</label>
              <input type="text" name="venue" required value="${show.venue || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Location *</label>
              <input type="text" name="location" required value="${show.location || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
          </div>
          
          <!-- Dates -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Start Date *</label>
              <input type="date" name="startDate" required value="${show.dates?.start || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">End Date *</label>
              <input type="date" name="endDate" required value="${show.dates?.end || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Display Date *</label>
              <input type="text" name="displayDate" required value="${show.displayDate || ''}"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
          </div>
          
          <!-- Season & Year -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Season *</label>
              <select name="season" required class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
                <option value="spring" ${show.season === 'spring' ? 'selected' : ''}>Spring</option>
                <option value="fall" ${show.season === 'fall' ? 'selected' : ''}>Fall</option>
                <option value="summer" ${show.season === 'summer' ? 'selected' : ''}>Summer</option>
                <option value="winter" ${show.season === 'winter' ? 'selected' : ''}>Winter</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-glass mb-1">Year *</label>
              <input type="number" name="year" required value="${show.year || new Date().getFullYear()}" min="2020" max="2099"
                class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass">
            </div>
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-glass mb-1">Description</label>
            <textarea name="description" rows="3" 
              class="w-full p-3 rounded-lg bg-glass-surface border border-glass-border text-glass resize-none">${show.description || ''}</textarea>
          </div>
          
          <!-- Status Toggles -->
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="active" ${show.active ? 'checked' : ''} class="w-5 h-5 rounded border-glass-border bg-glass-surface text-brand focus:ring-brand">
              <span class="text-sm text-glass">Active (visible to users)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="registrationOpen" ${show.registrationOpen ? 'checked' : ''} class="w-5 h-5 rounded border-glass-border bg-glass-surface text-brand focus:ring-brand">
              <span class="text-sm text-glass">Registration Open (vendors can sign up)</span>
            </label>
          </div>
          
          <!-- Show ID (readonly) -->
          <div class="p-3 bg-glass-surface/50 rounded-lg">
            <span class="text-xs text-glass-secondary">Show ID: </span>
            <code class="text-xs text-glass">${show.id}</code>
          </div>
          
          <!-- Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t border-glass-border">
            <button type="button" id="cancelShowBtn" class="px-4 py-2 rounded-lg bg-glass-surface text-glass hover:bg-glass-surface/70">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/80">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  const modal = document.getElementById('showModal');
  const form = document.getElementById('showForm');
  const closeBtn = document.getElementById('closeShowModal');
  const cancelBtn = document.getElementById('cancelShowBtn');
  
  const closeModal = () => modal?.remove();
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const updates = {
      name: formData.get('name'),
      shortName: formData.get('shortName'),
      venue: formData.get('venue'),
      location: formData.get('location'),
      dates: {
        start: formData.get('startDate'),
        end: formData.get('endDate')
      },
      displayDate: formData.get('displayDate'),
      season: formData.get('season'),
      year: parseInt(formData.get('year')),
      description: formData.get('description'),
      active: formData.get('active') === 'on',
      registrationOpen: formData.get('registrationOpen') === 'on',
      color: formData.get('season') === 'spring' ? 'from-blue-600 to-slate-600' : 
             formData.get('season') === 'fall' ? 'from-orange-600 to-slate-600' :
             formData.get('season') === 'summer' ? 'from-yellow-600 to-orange-600' :
             'from-blue-700 to-slate-700'
    };
    
    const result = await updateShow(showId, updates);
    
    if (result.success) {
      Toast('Show updated successfully!');
      closeModal();
      await loadShows(root);
    } else {
      await AlertDialog('Error', `Failed to update show: ${result.error}`, { type: 'error' });
    }
  });
}
