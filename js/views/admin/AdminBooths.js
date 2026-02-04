/**
 * Admin Booths Module
 * Handles all booth management functionality in the Admin Dashboard
 */

import { getAdminDb, getFirestoreModule, setButtonLoading } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog } from '../../utils/ui.js';

// Booth configuration - can be overridden via window.BOOTH_CONFIG
const DEFAULT_BOOTH_CONFIG = {
  indoor: {
    count: 66,
    size: '8ft x 8ft',
    price: 250,
    startNumber: 1
  },
  outdoor: {
    count: 31,
    size: '10ft x 10ft',
    price: 200,
    startNumber: 101
  }
};

/**
 * Get booth configuration (allows runtime override)
 */
export function getBoothConfig() {
  return window.BOOTH_CONFIG || DEFAULT_BOOTH_CONFIG;
}

/**
 * Render the booths tab HTML template
 */
export function renderBoothsTab() {
  const config = getBoothConfig();
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">Booth Management</h2>
        <div class="flex items-center gap-3">
          <button class="bg-brand px-4 py-2 rounded text-white" id="refreshBooths">
            <ion-icon name="refresh-outline" class="mr-1"></ion-icon>Refresh
          </button>
          <button class="bg-green-600 px-4 py-2 rounded text-white" id="generateStockBtn">
            <ion-icon name="add-circle-outline" class="mr-1"></ion-icon>Generate Stock
          </button>
          <button class="bg-red-600 px-4 py-2 rounded text-white" id="deleteAllBoothsBtn">
            <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete All
          </button>
        </div>
      </div>
      
      <!-- Booth Config Info -->
      <div class="glass-card p-4">
        <h3 class="text-lg font-semibold text-glass mb-3">Booth Configuration</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-glass-surface/30 p-3 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <ion-icon name="home-outline" class="text-brand"></ion-icon>
              <span class="font-medium text-glass">Indoor Booths</span>
            </div>
            <p class="text-sm text-glass-secondary">Count: ${config.indoor.count} | Size: ${config.indoor.size} | Price: $${config.indoor.price}</p>
          </div>
          <div class="bg-glass-surface/30 p-3 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <ion-icon name="sunny-outline" class="text-yellow-400"></ion-icon>
              <span class="font-medium text-glass">Outdoor Booths</span>
            </div>
            <p class="text-sm text-glass-secondary">Count: ${config.outdoor.count} | Size: ${config.outdoor.size} | Price: $${config.outdoor.price}</p>
          </div>
        </div>
      </div>
      
      <!-- Stats -->
      <div id="boothStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Stats will be populated dynamically -->
      </div>
      
      <!-- Booth Grid -->
      <div id="boothsList">Loading booths...</div>
    </div>
  `;
}

/**
 * Load booths data and render the list
 * @param {HTMLElement} root - The root container element
 * @param {Object} options - Additional options (includes showId for show filtering)
 */
export async function loadBooths(root, options = {}) {
  const { showId = null } = options;
  const boothsList = root.querySelector('#boothsList');
  const boothStats = root.querySelector('#boothStats');
  if (!boothsList) return;

  try {
    console.log('[AdminBooths] Loading booths...', showId ? `for show: ${showId}` : '(all shows)');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const boothsSnap = await fsm.getDocs(fsm.collection(db, 'boothLayout'));
    const booths = [];
    boothsSnap.forEach(doc => booths.push({ id: doc.id, ...doc.data() }));
    console.log('[AdminBooths] Booths loaded:', booths.length);

    booths.sort((a, b) => a.displayNumber - b.displayNumber);

    // Calculate stats
    const indoorBooths = booths.filter(b => b.type === 'indoor');
    const outdoorBooths = booths.filter(b => b.type === 'outdoor');
    const availableCount = booths.filter(b => b.available).length;
    const occupiedCount = booths.filter(b => !b.available).length;

    // Render stats
    if (boothStats) {
      boothStats.innerHTML = `
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-brand">${booths.length}</div>
          <div class="text-sm text-glass-secondary">Total Booths</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">${indoorBooths.length}</div>
          <div class="text-sm text-glass-secondary">Indoor</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-green-400">${availableCount}</div>
          <div class="text-sm text-glass-secondary">Available</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-red-400">${occupiedCount}</div>
          <div class="text-sm text-glass-secondary">Occupied</div>
        </div>
      `;
    }

    // Render booth grid
    boothsList.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        ${booths.length === 0 ? `
          <div class="col-span-full glass-card p-8 text-center">
            <div class="text-glass-secondary">
              <ion-icon name="grid-outline" class="text-2xl mb-2"></ion-icon>
              <p>No booths configured. Click "Generate Stock" to create booths.</p>
            </div>
          </div>
        ` : booths.map(booth => `
          <div class="glass-card p-3 ${booth.available ? 'border-green-500/30' : 'border-red-500/30'} border">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-glass">#${booth.displayNumber}</h3>
              <div class="w-3 h-3 rounded-full ${booth.available ? 'bg-green-400' : 'bg-red-400'}"></div>
            </div>
            <div class="text-xs text-glass-secondary space-y-1">
              <p class="flex items-center gap-1">
                <ion-icon name="${booth.type === 'indoor' ? 'home-outline' : 'sunny-outline'}"></ion-icon>
                ${booth.type}
              </p>
              <p>${booth.size}</p>
              <p class="text-green-400">$${booth.price}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Setup event listeners
    setupBoothListeners(root);

  } catch (error) {
    console.error('[AdminBooths] Failed to load booths:', error);
    boothsList.innerHTML = '<div class="text-red-400">Failed to load booths</div>';
  }
}

/**
 * Setup all booth-related event listeners
 */
function setupBoothListeners(root) {
  const refreshBtn = root.querySelector('#refreshBooths');
  const generateStockBtn = root.querySelector('#generateStockBtn');
  const deleteAllBoothsBtn = root.querySelector('#deleteAllBoothsBtn');

  // Refresh button
  if (refreshBtn && !refreshBtn._listenerAdded) {
    refreshBtn._listenerAdded = true;
    refreshBtn.addEventListener('click', () => loadBooths(root));
  }

  // Generate stock button
  if (generateStockBtn && !generateStockBtn._listenerAdded) {
    generateStockBtn._listenerAdded = true;
    generateStockBtn.addEventListener('click', async () => {
      const config = getBoothConfig();
      const totalBooths = config.indoor.count + config.outdoor.count;
      
      const confirmed = await ConfirmDialog(
        'Generate Booths', 
        `Generate booth stock? This will create ${config.indoor.count} indoor + ${config.outdoor.count} outdoor booths (${totalBooths} total).`, 
        { confirmText: 'Generate' }
      );
      if (!confirmed) return;

      try {
        setButtonLoading(generateStockBtn, true, 'Generating...');
        const db = await getAdminDb();
        const fsm = await getFirestoreModule();

        const batch = fsm.writeBatch(db);

        // Clear existing booths
        const existingBooths = await fsm.getDocs(fsm.collection(db, 'boothLayout'));
        existingBooths.forEach(d => batch.delete(d.ref));

        // Generate indoor booths
        for (let i = 0; i < config.indoor.count; i++) {
          const docRef = fsm.doc(fsm.collection(db, 'boothLayout'));
          batch.set(docRef, {
            displayNumber: config.indoor.startNumber + i,
            type: 'indoor',
            size: config.indoor.size,
            price: config.indoor.price,
            available: true
          });
        }

        // Generate outdoor booths
        for (let i = 0; i < config.outdoor.count; i++) {
          const docRef = fsm.doc(fsm.collection(db, 'boothLayout'));
          batch.set(docRef, {
            displayNumber: config.outdoor.startNumber + i,
            type: 'outdoor',
            size: config.outdoor.size,
            price: config.outdoor.price,
            available: true
          });
        }

        await batch.commit();
        await AlertDialog('Success', `Booth stock generated successfully! (${totalBooths} booths)`, { type: 'success' });
        await loadBooths(root);

      } catch (error) {
        console.error('[AdminBooths] Failed to generate booths:', error);
        await AlertDialog('Failed', 'Failed to generate booth stock', { type: 'error' });
      } finally {
        setButtonLoading(generateStockBtn, false);
      }
    });
  }

  // Delete all button
  if (deleteAllBoothsBtn && !deleteAllBoothsBtn._listenerAdded) {
    deleteAllBoothsBtn._listenerAdded = true;
    deleteAllBoothsBtn.addEventListener('click', async () => {
      const confirmed = await ConfirmDialog(
        'Delete All Booths', 
        'Delete ALL booths? This action cannot be undone!', 
        { danger: true, confirmText: 'Delete All' }
      );
      if (!confirmed) return;

      try {
        setButtonLoading(deleteAllBoothsBtn, true, 'Deleting...');
        const db = await getAdminDb();
        const fsm = await getFirestoreModule();

        const batch = fsm.writeBatch(db);
        const boothsSnap = await fsm.getDocs(fsm.collection(db, 'boothLayout'));
        boothsSnap.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        await AlertDialog('Success', 'All booths deleted successfully!', { type: 'success' });
        await loadBooths(root);

      } catch (error) {
        console.error('[AdminBooths] Failed to delete booths:', error);
        await AlertDialog('Failed', 'Failed to delete booths', { type: 'error' });
      } finally {
        setButtonLoading(deleteAllBoothsBtn, false);
      }
    });
  }
}
