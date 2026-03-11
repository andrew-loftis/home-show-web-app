/**
 * Admin Floor Plan Configurator
 *
 * Desktop-first tool for managing the show floor plan:
 *  - Upload a background image (top-down rendering)
 *  - Two-point calibration (pixels → feet)
 *  - Drag-and-drop booth placement from a bank of presets
 *  - Move / select / edit booth properties
 *  - Assign vendors + categories
 *  - Visibility settings (date-gated for guests, payment-gated for vendors)
 *  - Save / load from Firestore  floorPlanConfigs/{showId}
 */

import { getAdminDb, getFirestoreModule, setButtonLoading } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';
import { renderFloorPlanSVG } from '../../utils/floorPlanRenderer.js';
import { getAllCategories, getCategoryColor } from '../../brand.js';

// ── Module state ──────────────────────────────────────────────────────────
let config = null;       // The floorPlanConfigs document
let selectedBoothIdx = null;
let vendors = [];        // Vendor list for assignment dropdown
let mode = 'select';     // 'select' | 'calibrate' | 'place'
let calibrationClicks = [];
let dragBoothPreset = null;
let isDragging = false;
let dragStartSVG = null;
let dragBoothOrigPos = null;
let _root = null;
let _showId = null;
let _lastViewportIsDesktop = null;
let _resizeListenerAdded = false;
let _resizeRaf = null;
let _loadedBoothVendorIds = new Set();

// ── Constants ─────────────────────────────────────────────────────────────
const BOOTH_PRESETS = [
  { key: '8x8', label: '8 x 8', widthFeet: 8, heightFeet: 8, shape: 'rectangle' },
  { key: '10x10', label: '10 x 10', widthFeet: 10, heightFeet: 10, shape: 'rectangle' },
  { key: '10x20', label: '10 x 20', widthFeet: 10, heightFeet: 20, shape: 'rectangle' },
  { key: '20x20', label: '20 x 20', widthFeet: 20, heightFeet: 20, shape: 'rectangle' },
  { key: 'food-truck-30x15', label: 'Food Truck 30 x 15', widthFeet: 30, heightFeet: 15, shape: 'rectangle' },
  { key: 'corner-16x8', label: 'Corner 16 x 8', widthFeet: 16, heightFeet: 8, shape: 'corner', cornerOrientation: 'top-left' },
];
const CORNER_ORIENTATIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const DEFAULT_CONFIG = {
  backgroundImageUrl: '',
  imageWidth: 2400,
  imageHeight: 1600,
  calibration: { pixelsPerFoot: 10 },
  booths: [],
  visibility: {
    publicVisibleDate: '',
    vendorRequiresPaid: true,
  },
};

// ── Tab HTML ──────────────────────────────────────────────────────────────
export function renderFloorPlanTab() {
  return `
    <div class="space-y-4" id="fp-configurator">
      <!-- Toolbar -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-glass">Floor Plan Configurator</h2>
        <div class="flex items-center gap-2 flex-wrap">
          <button id="fp-upload-btn" class="glass-button px-3 py-2 rounded text-sm">
            <ion-icon name="image-outline" class="mr-1"></ion-icon>Upload Image
          </button>
          <button id="fp-calibrate-btn" class="glass-button px-3 py-2 rounded text-sm">
            <ion-icon name="resize-outline" class="mr-1"></ion-icon>Calibrate
          </button>
          <button id="fp-grid-toggle" class="glass-button px-3 py-2 rounded text-sm">
            <ion-icon name="grid-outline" class="mr-1"></ion-icon>Grid
          </button>
          <button id="fp-settings-btn" class="glass-button px-3 py-2 rounded text-sm">
            <ion-icon name="settings-outline" class="mr-1"></ion-icon>Settings
          </button>
          <button id="fp-save-btn" class="bg-brand px-4 py-2 rounded text-white text-sm font-medium">
            <ion-icon name="save-outline" class="mr-1"></ion-icon>Save
          </button>
        </div>
      </div>

      <!-- Main layout: sidebar + canvas -->
      <div class="flex gap-4" style="min-height: 600px;">
        <!-- Sidebar: booth bank + properties -->
        <div class="w-56 flex-shrink-0 space-y-4">
          <!-- Booth Bank -->
          <div class="glass-card p-3">
            <h3 class="text-sm font-semibold text-glass mb-2">Booth Bank</h3>
            <div class="space-y-2" id="fp-booth-bank">
              ${BOOTH_PRESETS.map((p, i) => `
                <div class="fp-bank-item glass-button px-3 py-2 rounded text-xs cursor-grab text-center"
                     draggable="true" data-preset="${p.key || i}">
                  <ion-icon name="move-outline" class="mr-1"></ion-icon>${p.label}${p.shape === 'corner' ? '' : ' ft'}
                </div>
              `).join('')}
              <div class="fp-bank-item glass-button px-3 py-2 rounded text-xs cursor-grab text-center"
                   draggable="true" data-preset="custom">
                <ion-icon name="add-outline" class="mr-1"></ion-icon>Custom
              </div>
            </div>
          </div>

          <!-- Selected Booth Properties -->
          <div class="glass-card p-3 hidden" id="fp-props-panel">
            <h3 class="text-sm font-semibold text-glass mb-2">Booth Properties</h3>
            <div class="space-y-2 text-xs">
              <div>
                <label class="text-glass-secondary block mb-1">Booth ID</label>
                <input id="fp-prop-id" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label id="fp-prop-w-label" class="text-glass-secondary block mb-1">W (ft)</label>
                  <input id="fp-prop-w" type="number" min="1" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs" />
                </div>
                <div>
                  <label id="fp-prop-h-label" class="text-glass-secondary block mb-1">H (ft)</label>
                  <input id="fp-prop-h" type="number" min="1" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs" />
                </div>
              </div>
              <div id="fp-corner-controls" class="hidden">
                <label class="text-glass-secondary block mb-1">Corner Position</label>
                <select id="fp-prop-corner-orientation" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs">
                  ${CORNER_ORIENTATIONS.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-glass-secondary block mb-1">Category</label>
                <select id="fp-prop-category" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs">
                  <option value="">None</option>
                  ${getAllCategories().map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-glass-secondary block mb-1">Vendor</label>
                <select id="fp-prop-vendor" class="w-full bg-glass-surface/40 border border-glass-border rounded px-2 py-1 text-glass text-xs">
                  <option value="">Unassigned</option>
                </select>
              </div>
              <button id="fp-delete-booth" class="w-full bg-red-600/80 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs mt-2">
                <ion-icon name="trash-outline" class="mr-1"></ion-icon>Delete Booth
              </button>
            </div>
          </div>

          <!-- Calibration Info -->
          <div class="glass-card p-3" id="fp-calibration-info">
            <h3 class="text-sm font-semibold text-glass mb-1">Scale</h3>
            <p class="text-xs text-glass-secondary" id="fp-scale-display">Not calibrated</p>
            <p class="text-xs text-glass-secondary mt-1" id="fp-booth-count">0 booths</p>
          </div>
        </div>

        <!-- Canvas area -->
        <div class="flex-1 glass-card p-2 relative overflow-auto" id="fp-canvas-wrap"
             style="max-height: 75vh; -webkit-overflow-scrolling: touch;">
          <div id="fp-canvas-container" class="relative w-full">
            <!-- SVG rendered here -->
          </div>
          <!-- Calibration overlay text -->
          <div id="fp-calibration-overlay" class="hidden absolute top-2 left-2 right-2 glass-card p-3 text-sm text-yellow-300 z-10 text-center">
            Click two points on the floor plan, then enter the real distance between them.
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Load & initialise ─────────────────────────────────────────────────────
export async function loadFloorPlan(root, options = {}) {
  _root = root;
  _showId = options.showId || 'putnam-spring-2026';

  // Wire toolbar listeners immediately so buttons work before data loads
  wireListeners();

  try {
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    // Load config
    const configRef = fsm.doc(db, 'floorPlanConfigs', _showId);
    const snap = await fsm.getDoc(configRef);
    config = snap.exists() ? { ...DEFAULT_CONFIG, ...snap.data() } : { ...DEFAULT_CONFIG };
    if (Array.isArray(config.booths)) {
      config.booths = config.booths.map(normalizeBoothData);
    }
    _loadedBoothVendorIds = collectAssignedVendorIds(config.booths);
    await syncCanvasToBackgroundImageSize();

    // Load vendors for assignment dropdown
    const vendorsSnap = await fsm.getDocs(
      fsm.query(fsm.collection(db, 'vendors'), fsm.limit(2000))
    );
    vendors = [];
    vendorsSnap.forEach(d => {
      const v = d.data();
      if ((v.showId || 'putnam-spring-2026') === _showId) {
        const displayName = getVendorDisplayName(v, d.id);
        const boothList = normalizeBoothList(v.booths || v.booth || v.boothNumber);
        vendors.push({
          id: d.id,
          displayName,
          companyName: displayName,
          category: v.category || '',
          booths: boothList,
          boothNumber: String(v.boothNumber || '').trim(),
          contactEmail: String(v.contactEmail || v.email || '').trim().toLowerCase(),
        });
      }
    });
    vendors.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
    hydrateBoothVendorNamesFromDirectory();

    renderCanvas();
    updateScaleDisplay();
  } catch (err) {
    console.error('[AdminFloorPlan] Load failed:', err);
    // Ensure config exists so buttons work with defaults
    if (!config) config = { ...DEFAULT_CONFIG };
    const container = root.querySelector('#fp-canvas-container');
    if (container) container.innerHTML = '<p class="text-red-400 p-4">Failed to load floor plan config. Buttons above still work.</p>';
  }
}

// ── Canvas rendering ──────────────────────────────────────────────────────
let showGrid = false;

function renderCanvas() {
  const container = _root.querySelector('#fp-canvas-container');
  if (!container || !config) return;
  const isDesktop = isDesktopViewport();
  _lastViewportIsDesktop = isDesktop;

  container.innerHTML = renderFloorPlanSVG(config, {
    interactive: true,
    showVendorNames: true,
    showCategoryColors: true,
    showGrid,
    showLabels: true,
    fitToContainer: isDesktop,
  });
  applyCanvasViewportStyles(isDesktop);

  applySelectionHighlight();

  // Wire booth pointer events
  wireBoothPointerEvents();
}

function isDesktopViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(min-width: 1024px)').matches;
}

function applyCanvasViewportStyles(isDesktop) {
  const wrap = _root?.querySelector('#fp-canvas-wrap');
  const container = _root?.querySelector('#fp-canvas-container');
  const svg = _root?.querySelector('#fp-canvas');
  if (!wrap || !container || !svg) return;

  wrap.style.maxHeight = '75vh';
  wrap.style.webkitOverflowScrolling = 'touch';
  wrap.style.overflowX = isDesktop ? 'hidden' : 'auto';
  wrap.style.overflowY = isDesktop ? 'hidden' : 'auto';

  if (isDesktop) {
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'flex-start';
    container.style.width = '100%';
    container.style.maxWidth = '100%';
    container.style.overflow = 'hidden';

    const availableHeight = Math.max(280, wrap.clientHeight - 8);
    svg.style.display = 'block';
    svg.style.width = 'auto';
    svg.style.height = 'auto';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = `${availableHeight}px`;
    svg.style.minWidth = '0';
  } else {
    container.style.display = 'inline-block';
    container.style.justifyContent = '';
    container.style.alignItems = '';
    container.style.width = '';
    container.style.maxWidth = '';
    container.style.overflow = '';

    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = '';
    svg.style.maxHeight = '';
    svg.style.minWidth = '';
  }
}

function applySelectionHighlight() {
  const container = _root?.querySelector('#fp-canvas-container');
  if (!container) return;

  container.querySelectorAll('.fp-booth .fp-booth-rect').forEach((rect) => {
    rect.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    rect.setAttribute('stroke-width', '1.5');
    rect.removeAttribute('stroke-dasharray');
  });

  if (selectedBoothIdx === null) return;
  const sel = container.querySelector(`[data-booth-index="${selectedBoothIdx}"]`);
  const rects = sel?.querySelectorAll('.fp-booth-rect');
  if (!rects || !rects.length) return;

  rects.forEach((rect) => {
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '3');
    rect.setAttribute('stroke-dasharray', '6 3');
  });
}

// ── Wire all UI listeners (once) ──────────────────────────────────────────
function wireListeners() {
  const uploadBtn = _root.querySelector('#fp-upload-btn');
  const calibrateBtn = _root.querySelector('#fp-calibrate-btn');
  const gridBtn = _root.querySelector('#fp-grid-toggle');
  const saveBtn = _root.querySelector('#fp-save-btn');
  const settingsBtn = _root.querySelector('#fp-settings-btn');
  const deleteBtn = _root.querySelector('#fp-delete-booth');
  const canvasWrap = _root.querySelector('#fp-canvas-wrap');

  // Upload background
  if (uploadBtn && !uploadBtn._listenerAdded) {
    uploadBtn._listenerAdded = true;
    uploadBtn.addEventListener('click', handleUploadBackground);
  }

  // Calibrate
  if (calibrateBtn && !calibrateBtn._listenerAdded) {
    calibrateBtn._listenerAdded = true;
    calibrateBtn.addEventListener('click', () => {
      if (mode === 'calibrate') {
        exitCalibration();
      } else {
        enterCalibration();
      }
    });
  }

  // Grid toggle
  if (gridBtn && !gridBtn._listenerAdded) {
    gridBtn._listenerAdded = true;
    gridBtn.addEventListener('click', () => {
      showGrid = !showGrid;
      gridBtn.classList.toggle('bg-brand/30', showGrid);
      renderCanvas();
    });
  }

  // Save
  if (saveBtn && !saveBtn._listenerAdded) {
    saveBtn._listenerAdded = true;
    saveBtn.addEventListener('click', handleSave);
  }

  // Settings
  if (settingsBtn && !settingsBtn._listenerAdded) {
    settingsBtn._listenerAdded = true;
    settingsBtn.addEventListener('click', showSettingsModal);
  }

  // Delete booth
  if (deleteBtn && !deleteBtn._listenerAdded) {
    deleteBtn._listenerAdded = true;
    deleteBtn.addEventListener('click', handleDeleteBooth);
  }

  // Booth bank drag
  const bankItems = _root.querySelectorAll('.fp-bank-item');
  bankItems.forEach(item => {
    if (item._listenerAdded) return;
    item._listenerAdded = true;
    item.addEventListener('dragstart', (e) => {
      const presetKey = item.dataset.preset;
      if (presetKey === 'custom') {
        dragBoothPreset = { widthFeet: 10, heightFeet: 10, custom: true };
      } else {
        const preset = BOOTH_PRESETS.find((p) => String(p.key) === String(presetKey))
          || BOOTH_PRESETS[parseInt(presetKey, 10)];
        dragBoothPreset = preset ? { ...preset } : null;
      }
      if (!dragBoothPreset) return;
      e.dataTransfer.setData('text/plain', 'booth');
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  // Canvas drop zone
  if (canvasWrap && !canvasWrap._listenerAdded) {
    canvasWrap._listenerAdded = true;
    canvasWrap.addEventListener('dragover', (e) => {
      if (dragBoothPreset) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    canvasWrap.addEventListener('drop', handleBoothDrop);
  }

  if (!_resizeListenerAdded && typeof window !== 'undefined') {
    _resizeListenerAdded = true;
    window.addEventListener('resize', () => {
      if (!_root?.querySelector('#fp-configurator')) return;
      if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
      _resizeRaf = requestAnimationFrame(() => {
        _resizeRaf = null;
        const isDesktop = isDesktopViewport();
        if (isDesktop !== _lastViewportIsDesktop) {
          renderCanvas();
        } else {
          applyCanvasViewportStyles(isDesktop);
        }
      });
    });
  }

  // Property panel changes
  wirePropertyListeners();

  // Keyboard shortcuts
  if (!document._fpKeyListenerAdded) {
    document._fpKeyListenerAdded = true;
    document.addEventListener('keydown', handleKeyDown);
  }
}

// ── Booth pointer events (drag to move, click to select) ──────────────────
function wireBoothPointerEvents() {
  const svg = _root.querySelector('#fp-canvas');
  if (!svg) return;

  const boothEls = svg.querySelectorAll('.fp-booth');
  boothEls.forEach(el => {
    el.addEventListener('pointerdown', (e) => {
      if (mode === 'calibrate') return;
      e.preventDefault();
      e.stopPropagation();

      const idx = parseInt(el.dataset.boothIndex, 10);
      if (!Number.isFinite(idx) || !config?.booths?.[idx]) return;
      // Don't re-render here or the active pointer element is replaced mid-drag.
      selectBooth(idx, { rerender: false });

      // Start drag
      isDragging = true;
      dragStartSVG = screenToSVG(svg, e.clientX, e.clientY);
      dragBoothOrigPos = { x: config.booths[idx].x, y: config.booths[idx].y };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Non-fatal; pointer events still work for simple click/move.
      }

      const onMove = (ev) => {
        if (!isDragging || selectedBoothIdx !== idx) return;
        const cur = screenToSVG(svg, ev.clientX, ev.clientY);
        const ppf = config.calibration?.pixelsPerFoot || 10;
        const dx = cur.x - dragStartSVG.x;
        const dy = cur.y - dragStartSVG.y;
        const newX = snap(dragBoothOrigPos.x + dx, ppf);
        const newY = snap(dragBoothOrigPos.y + dy, ppf);
        // Clamp within canvas
        config.booths[idx].x = Math.max(0, newX);
        config.booths[idx].y = Math.max(0, newY);
        // Update transform directly for smooth drag
        el.setAttribute('transform', `translate(${config.booths[idx].x}, ${config.booths[idx].y})`);
      };
      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        try {
          if (el.hasPointerCapture?.(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
          }
        } catch {}
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        el.removeEventListener('lostpointercapture', stopDrag);
        renderCanvas(); // Re-render to fix any visual glitches
      };
      const onUp = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        stopDrag();
      };
      const onCancel = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        stopDrag();
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
      el.addEventListener('lostpointercapture', stopDrag);
    });
  });

  // Click on canvas background = deselect (only in select mode)
  svg.addEventListener('pointerdown', (e) => {
    if (mode === 'calibrate') {
      handleCalibrationClick(svg, e);
      return;
    }
    if (e.target === svg || e.target.tagName === 'image' || e.target.tagName === 'rect' && !e.target.closest('.fp-booth')) {
      deselectBooth();
    }
  });
}

// ── Selection ─────────────────────────────────────────────────────────────
function selectBooth(idx, options = {}) {
  const rerender = options.rerender !== false;
  selectedBoothIdx = idx;
  const booth = normalizeBoothData(config.booths[idx]);
  config.booths[idx] = booth;
  if (!booth) return;

  const panel = _root.querySelector('#fp-props-panel');
  if (panel) panel.classList.remove('hidden');

  const idInput = _root.querySelector('#fp-prop-id');
  const wInput = _root.querySelector('#fp-prop-w');
  const hInput = _root.querySelector('#fp-prop-h');
  const wLabel = _root.querySelector('#fp-prop-w-label');
  const hLabel = _root.querySelector('#fp-prop-h-label');
  const cornerControls = _root.querySelector('#fp-corner-controls');
  const cornerSelect = _root.querySelector('#fp-prop-corner-orientation');
  const catSelect = _root.querySelector('#fp-prop-category');
  const vendorSelect = _root.querySelector('#fp-prop-vendor');
  const isCorner = booth.shape === 'corner';

  if (idInput) idInput.value = booth.id || '';
  if (wInput) wInput.value = booth.widthFeet || (isCorner ? 16 : 10);
  if (hInput) hInput.value = booth.heightFeet || (isCorner ? 8 : 10);
  if (wLabel) wLabel.textContent = isCorner ? 'Long Side (ft)' : 'W (ft)';
  if (hLabel) hLabel.textContent = isCorner ? 'Depth (ft)' : 'H (ft)';
  if (cornerControls) cornerControls.classList.toggle('hidden', !isCorner);
  if (cornerSelect) cornerSelect.value = normalizeCornerOrientation(booth.cornerOrientation);
  if (catSelect) catSelect.value = booth.category || '';

  // Populate vendor dropdown
  if (vendorSelect) {
    vendorSelect.innerHTML = '<option value="">Unassigned</option>' +
      vendors.map(v => `<option value="${v.id}" ${v.id === booth.vendorId ? 'selected' : ''}>${escHtml(v.displayName)}</option>`).join('');
  }

  if (rerender) renderCanvas();
  else applySelectionHighlight();
}

function deselectBooth() {
  selectedBoothIdx = null;
  const panel = _root.querySelector('#fp-props-panel');
  if (panel) panel.classList.add('hidden');
  renderCanvas();
}

// ── Property panel listeners ──────────────────────────────────────────────
function wirePropertyListeners() {
  const idInput = _root.querySelector('#fp-prop-id');
  const wInput = _root.querySelector('#fp-prop-w');
  const hInput = _root.querySelector('#fp-prop-h');
  const cornerSelect = _root.querySelector('#fp-prop-corner-orientation');
  const catSelect = _root.querySelector('#fp-prop-category');
  const vendorSelect = _root.querySelector('#fp-prop-vendor');

  const applyProp = () => {
    if (selectedBoothIdx === null || !config.booths[selectedBoothIdx]) return;
    const booth = normalizeBoothData(config.booths[selectedBoothIdx]);
    config.booths[selectedBoothIdx] = booth;
    const ppf = config.calibration?.pixelsPerFoot || 10;

    if (idInput) booth.id = idInput.value.trim() || booth.id;
    if (wInput) {
      booth.widthFeet = Math.max(1, parseInt(wInput.value) || 10);
      booth.widthPx = booth.widthFeet * ppf;
    }
    if (hInput) {
      booth.heightFeet = Math.max(1, parseInt(hInput.value) || 10);
      booth.heightPx = booth.heightFeet * ppf;
    }
    if (cornerSelect && booth.shape === 'corner') {
      booth.cornerOrientation = normalizeCornerOrientation(cornerSelect.value);
    }
    if (catSelect) booth.category = catSelect.value;
    if (vendorSelect) {
      const vid = vendorSelect.value;
      if (vid) {
        const v = vendors.find(vn => vn.id === vid);
        booth.vendorId = vid;
        booth.vendorName = v?.displayName || '';
        // Auto-set category from vendor if booth has none
        if (!booth.category && v?.category) {
          booth.category = v.category;
          catSelect.value = v.category;
        }
      } else {
        booth.vendorId = null;
        booth.vendorName = null;
      }
    }
    renderCanvas();
  };

  [idInput, wInput, hInput].forEach(el => {
    if (el && !el._fpListener) {
      el._fpListener = true;
      el.addEventListener('change', applyProp);
    }
  });
  [cornerSelect, catSelect, vendorSelect].forEach(el => {
    if (el && !el._fpListener) {
      el._fpListener = true;
      el.addEventListener('change', applyProp);
    }
  });
}

// ── Upload background ─────────────────────────────────────────────────────
async function handleUploadBackground() {
  // Ensure config exists
  if (!config) config = { ...DEFAULT_CONFIG };

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const uploadBtn = _root.querySelector('#fp-upload-btn');
    try {
      setButtonLoading(uploadBtn, true, 'Uploading...');

      // Re-sync admin access before storage write so rules recognize admin status.
      const { refreshAdminAccess, getState } = await import('../../store.js');
      await refreshAdminAccess({ forceBootstrap: true, allowDowngrade: false, silent: true });
      if (!getState().isAdmin) {
        throw new Error('Admin access is not synced yet. Reopen Admin and try again.');
      }

      const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024;
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('Image is too large to upload at full quality (max 9.5 MB). Export as SVG or a smaller high-res image and retry.');
      }

      const { getAuthInstance } = await import('../../firebase.js');
      const auth = getAuthInstance();
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        throw new Error('Sign in with your admin account before uploading floor plan images.');
      }
      await auth.currentUser.getIdToken(true);

      // Use server-side admin upload so stale client storage rules do not block floor-plan uploads.
      const url = await uploadBackgroundViaAdminFunction(file, file.name || 'floorplan');

      // Get image dimensions
      const dims = await getImageDimensions(url);
      config.backgroundImageUrl = url;
      config.imageWidth = dims.width;
      config.imageHeight = dims.height;

      renderCanvas();
      Toast('Background image uploaded');
    } catch (err) {
      console.error('[AdminFloorPlan] Upload failed:', err);
      const code = String(err?.code || '');
      const status = Number(err?.status || 0);
      const baseMessage = err?.message || 'Could not upload image';
      let message = baseMessage;
      if (status === 401) {
        message = 'Your login session expired. Sign out/in and try upload again.';
      } else if (status === 403) {
        message = 'Upload endpoint says this account is not admin-authorized. Confirm your email is in Netlify ADMIN_EMAILS and/or Firestore admin-users, then reload.';
      } else if (status === 413 || /too large|payload/i.test(baseMessage)) {
        message = 'Image exceeds the full-quality upload limit. Export a smaller file (or SVG) and try again.';
      } else if (code === 'storage/unauthorized') {
        message = 'Upload blocked by Firebase Storage rules. Confirm your admin email exists in Firestore under admin-users/adminEmails, then re-login and try again.';
      }
      await AlertDialog('Upload Failed', message, { type: 'error' });
    } finally {
      setButtonLoading(uploadBtn, false);
    }
  };
  input.click();
}

async function uploadBackgroundViaAdminFunction(fileBlob, fileName = 'floorplan') {
  const { getAuthInstance } = await import('../../firebase.js');
  const auth = getAuthInstance();
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('Admin sign-in required');
  }

  const token = await auth.currentUser.getIdToken(true);
  const dataUrl = await blobToDataUrl(fileBlob);
  const response = await fetch('/.netlify/functions/admin-upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      dataUrl,
      pathPrefix: `shows/${_showId}/floorplan`,
      fileName
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    const error = new Error(payload?.error || `Admin upload failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (!payload?.url) {
    throw new Error('Admin upload did not return a download URL');
  }
  return payload.url;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image before upload'));
    reader.readAsDataURL(blob);
  });
}

function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

async function syncCanvasToBackgroundImageSize() {
  const imageUrl = config?.backgroundImageUrl;
  if (!imageUrl) return;
  try {
    const dims = await getImageDimensions(imageUrl);
    if (!Number.isFinite(dims.width) || !Number.isFinite(dims.height)) return;
    if (Number(config.imageWidth) !== dims.width || Number(config.imageHeight) !== dims.height) {
      config.imageWidth = dims.width;
      config.imageHeight = dims.height;
      console.info(`[AdminFloorPlan] Synced canvas size to image: ${dims.width}x${dims.height}`);
    }
  } catch (err) {
    console.warn('[AdminFloorPlan] Could not read background image dimensions:', err);
  }
}

// ── Calibration ───────────────────────────────────────────────────────────
function enterCalibration() {
  mode = 'calibrate';
  calibrationClicks = [];
  const overlay = _root.querySelector('#fp-calibration-overlay');
  if (overlay) overlay.classList.remove('hidden');
  const calibrateBtn = _root.querySelector('#fp-calibrate-btn');
  if (calibrateBtn) calibrateBtn.classList.add('bg-yellow-600/40');
  // Change cursor
  const container = _root.querySelector('#fp-canvas-container');
  if (container) container.style.cursor = 'crosshair';
}

function exitCalibration() {
  mode = 'select';
  calibrationClicks = [];
  const overlay = _root.querySelector('#fp-calibration-overlay');
  if (overlay) overlay.classList.add('hidden');
  const calibrateBtn = _root.querySelector('#fp-calibrate-btn');
  if (calibrateBtn) calibrateBtn.classList.remove('bg-yellow-600/40');
  const container = _root.querySelector('#fp-canvas-container');
  if (container) container.style.cursor = '';
  renderCanvas();
}

function handleCalibrationClick(svg, e) {
  const pt = screenToSVG(svg, e.clientX, e.clientY);
  calibrationClicks.push(pt);

  // Draw calibration dot
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', pt.x);
  circle.setAttribute('cy', pt.y);
  circle.setAttribute('r', '6');
  circle.setAttribute('fill', '#ef4444');
  circle.setAttribute('stroke', 'white');
  circle.setAttribute('stroke-width', '2');
  circle.classList.add('fp-calibration-dot');
  svg.appendChild(circle);

  if (calibrationClicks.length === 2) {
    // Draw line between points
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', calibrationClicks[0].x);
    line.setAttribute('y1', calibrationClicks[0].y);
    line.setAttribute('x2', calibrationClicks[1].x);
    line.setAttribute('y2', calibrationClicks[1].y);
    line.setAttribute('stroke', '#ef4444');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6 4');
    svg.appendChild(line);

    // Calculate pixel distance
    const dx = calibrationClicks[1].x - calibrationClicks[0].x;
    const dy = calibrationClicks[1].y - calibrationClicks[0].y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    // Ask for real distance
    promptCalibrationDistance(pixelDist);
  }
}

async function promptCalibrationDistance(pixelDist) {
  const content = document.createElement('div');
  content.innerHTML = `
    <h3 class="text-lg font-semibold text-glass mb-3">Calibration</h3>
    <p class="text-sm text-glass-secondary mb-3">Pixel distance: ${Math.round(pixelDist)} px</p>
    <label class="text-sm text-glass-secondary block mb-1">Real distance (feet):</label>
    <input type="number" min="1" step="1" value="100" id="fp-cal-feet"
           class="w-full bg-glass-surface/40 border border-glass-border rounded px-3 py-2 text-glass mb-4" />
    <div class="flex gap-3 justify-end">
      <button class="glass-button px-4 py-2 rounded" id="fp-cal-cancel">Cancel</button>
      <button class="bg-brand px-4 py-2 rounded text-white" id="fp-cal-apply">Apply</button>
    </div>
  `;

  const { Modal, closeModal } = await import('../../utils/ui.js');
  Modal(content);

  const applyBtn = content.querySelector('#fp-cal-apply');
  const cancelBtn = content.querySelector('#fp-cal-cancel');
  const feetInput = content.querySelector('#fp-cal-feet');

  applyBtn.addEventListener('click', () => {
    const feet = parseFloat(feetInput.value);
    if (!feet || feet <= 0) { Toast('Enter a valid distance'); return; }

    const ppf = pixelDist / feet;
    config.calibration = {
      point1: calibrationClicks[0],
      point2: calibrationClicks[1],
      realDistanceFeet: feet,
      pixelsPerFoot: Math.round(ppf * 100) / 100,
    };

    // Recompute all booth pixel sizes
    config.booths.forEach(b => {
      b.widthPx = b.widthFeet * ppf;
      b.heightPx = b.heightFeet * ppf;
    });

    updateScaleDisplay();
    closeModal();
    exitCalibration();
    Toast(`Calibrated: ${config.calibration.pixelsPerFoot} px/ft`);
  });

  cancelBtn.addEventListener('click', () => {
    closeModal();
    exitCalibration();
  });
}

function updateScaleDisplay() {
  const el = _root.querySelector('#fp-scale-display');
  const countEl = _root.querySelector('#fp-booth-count');
  if (el) {
    const ppf = config?.calibration?.pixelsPerFoot;
    el.textContent = ppf ? `${ppf} px/ft` : 'Not calibrated';
  }
  if (countEl) {
    countEl.textContent = `${config?.booths?.length || 0} booths`;
  }
}

// ── Booth drop (new booth from bank) ──────────────────────────────────────
function handleBoothDrop(e) {
  e.preventDefault();
  if (!dragBoothPreset || !config) return;

  const svg = _root.querySelector('#fp-canvas');
  if (!svg) return;

  const pt = screenToSVG(svg, e.clientX, e.clientY);
  const ppf = config.calibration?.pixelsPerFoot || 10;

  let wFeet = dragBoothPreset.widthFeet;
  let hFeet = dragBoothPreset.heightFeet;
  let shape = normalizeBoothShape(dragBoothPreset.shape);
  let cornerOrientation = normalizeCornerOrientation(dragBoothPreset.cornerOrientation);

  // If custom, prompt for size
  if (dragBoothPreset.custom) {
    // Use defaults; user can edit in property panel after placement
    wFeet = 10;
    hFeet = 10;
    shape = 'rectangle';
    cornerOrientation = 'top-left';
  }
  wFeet = Math.max(1, parseInt(wFeet, 10) || 10);
  hFeet = Math.max(1, parseInt(hFeet, 10) || 10);

  const dropWFeet = wFeet;
  const dropHFeet = shape === 'corner' ? wFeet : hFeet;

  const newBooth = {
    id: generateBoothId(),
    x: snap(pt.x - (dropWFeet * ppf) / 2, ppf),
    y: snap(pt.y - (dropHFeet * ppf) / 2, ppf),
    widthFeet: wFeet,
    heightFeet: hFeet,
    widthPx: wFeet * ppf,
    heightPx: hFeet * ppf,
    shape,
    cornerOrientation: shape === 'corner' ? cornerOrientation : null,
    category: '',
    vendorId: null,
    vendorName: null,
  };

  // Clamp within canvas
  newBooth.x = Math.max(0, newBooth.x);
  newBooth.y = Math.max(0, newBooth.y);

  config.booths.push(newBooth);
  selectedBoothIdx = config.booths.length - 1;

  dragBoothPreset = null;
  renderCanvas();
  selectBooth(selectedBoothIdx);
  updateScaleDisplay();
}

function generateBoothId() {
  const existing = new Set((config?.booths || []).map(b => b.id));
  let num = config.booths.length + 1;
  while (existing.has(`B-${num}`)) num++;
  return `B-${num}`;
}

// ── Delete booth ──────────────────────────────────────────────────────────
async function handleDeleteBooth() {
  if (selectedBoothIdx === null) return;
  const booth = config.booths[selectedBoothIdx];
  const confirmed = await ConfirmDialog(
    'Delete Booth',
    `Delete booth "${booth.id}"?`,
    { danger: true, confirmText: 'Delete' }
  );
  if (!confirmed) return;
  config.booths.splice(selectedBoothIdx, 1);
  deselectBooth();
  updateScaleDisplay();
}

// ── Save to Firestore ─────────────────────────────────────────────────────
async function handleSave() {
  if (!config) { Toast('Nothing to save yet'); return; }
  const saveBtn = _root.querySelector('#fp-save-btn');
  try {
    setButtonLoading(saveBtn, true, 'Saving...');
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    const payload = {
      ...config,
      showId: _showId,
      updatedAt: fsm.serverTimestamp(),
    };
    if (!config.createdAt) {
      payload.createdAt = fsm.serverTimestamp();
    }

    await fsm.setDoc(fsm.doc(db, 'floorPlanConfigs', _showId), payload, { merge: true });
    const vendorSync = await syncVendorAssignmentsToVendorProfiles(db, fsm);
    if (vendorSync.failed > 0) {
      await AlertDialog(
        'Saved with Warnings',
        `Floor plan saved, but ${vendorSync.failed} vendor profile update(s) failed. Booth assignments may be partially synced.`,
        { type: 'error' }
      );
    } else if (vendorSync.updated > 0) {
      Toast(`Floor plan saved • synced ${vendorSync.updated} vendor profile${vendorSync.updated === 1 ? '' : 's'}`);
    } else {
      Toast('Floor plan saved');
    }
  } catch (err) {
    console.error('[AdminFloorPlan] Save failed:', err);
    await AlertDialog('Save Failed', err.message || 'Could not save floor plan', { type: 'error' });
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// ── Settings modal ────────────────────────────────────────────────────────
async function showSettingsModal() {
  const vis = config.visibility || {};
  const content = document.createElement('div');
  content.innerHTML = `
    <h3 class="text-lg font-semibold text-glass mb-4">Floor Plan Settings</h3>
    <div class="space-y-4 text-sm">
      <div>
        <label class="text-glass-secondary block mb-1">Public Visible Date</label>
        <input type="datetime-local" id="fp-vis-date"
               value="${vis.publicVisibleDate ? new Date(vis.publicVisibleDate).toISOString().slice(0, 16) : ''}"
               class="w-full bg-glass-surface/40 border border-glass-border rounded px-3 py-2 text-glass" />
        <p class="text-xs text-glass-secondary mt-1">Guests can see the floor plan after this date</p>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="fp-vis-paid" ${vis.vendorRequiresPaid ? 'checked' : ''} class="rounded" />
        <label for="fp-vis-paid" class="text-glass">Vendors must be paid to view</label>
      </div>
      <div>
        <label class="text-glass-secondary block mb-1">Canvas Width (px)</label>
        <input type="number" id="fp-canvas-w" value="${config.imageWidth || 2400}"
               class="w-full bg-glass-surface/40 border border-glass-border rounded px-3 py-2 text-glass" />
      </div>
      <div>
        <label class="text-glass-secondary block mb-1">Canvas Height (px)</label>
        <input type="number" id="fp-canvas-h" value="${config.imageHeight || 1600}"
               class="w-full bg-glass-surface/40 border border-glass-border rounded px-3 py-2 text-glass" />
      </div>
    </div>
    <div class="flex gap-3 justify-end mt-4">
      <button class="glass-button px-4 py-2 rounded" id="fp-settings-cancel">Cancel</button>
      <button class="bg-brand px-4 py-2 rounded text-white" id="fp-settings-apply">Apply</button>
    </div>
  `;

  const { Modal, closeModal } = await import('../../utils/ui.js');
  Modal(content);

  content.querySelector('#fp-settings-apply').addEventListener('click', () => {
    const dateVal = content.querySelector('#fp-vis-date').value;
    config.visibility = {
      publicVisibleDate: dateVal ? new Date(dateVal).toISOString() : '',
      vendorRequiresPaid: content.querySelector('#fp-vis-paid').checked,
    };
    const newW = parseInt(content.querySelector('#fp-canvas-w').value) || config.imageWidth;
    const newH = parseInt(content.querySelector('#fp-canvas-h').value) || config.imageHeight;
    if (newW !== config.imageWidth || newH !== config.imageHeight) {
      config.imageWidth = newW;
      config.imageHeight = newH;
    }
    closeModal();
    renderCanvas();
    Toast('Settings applied');
  });

  content.querySelector('#fp-settings-cancel').addEventListener('click', () => closeModal());
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
function handleKeyDown(e) {
  // Only act when the configurator tab is visible
  if (!_root?.querySelector('#fp-configurator')) return;
  // Don't intercept when typing in inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  const ppf = config?.calibration?.pixelsPerFoot || 10;

  if (e.key === 'Escape') {
    if (mode === 'calibrate') exitCalibration();
    else deselectBooth();
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoothIdx !== null) {
    e.preventDefault();
    handleDeleteBooth();
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
  // Arrow nudge (1 foot per press)
  if (selectedBoothIdx !== null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const booth = config.booths[selectedBoothIdx];
    if (e.key === 'ArrowUp') booth.y = Math.max(0, booth.y - ppf);
    if (e.key === 'ArrowDown') booth.y += ppf;
    if (e.key === 'ArrowLeft') booth.x = Math.max(0, booth.x - ppf);
    if (e.key === 'ArrowRight') booth.x += ppf;
    renderCanvas();
  }
}

// ── SVG coordinate helpers ────────────────────────────────────────────────
function screenToSVG(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function snap(value, gridSize) {
  if (!gridSize || gridSize < 1) return value;
  return Math.round(value / gridSize) * gridSize;
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getVendorDisplayName(vendor = {}, fallbackId = '') {
  const candidates = [
    vendor.companyName,
    vendor.company_name,
    vendor.businessName,
    vendor.business_name,
    vendor.name,
    vendor.displayName,
    vendor.contactName,
    vendor.contact_name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  const emailCandidate = String(vendor.contactEmail || vendor.email || '').trim();
  if (emailCandidate) {
    return emailCandidate.split('@')[0];
  }
  if (fallbackId) {
    return `Vendor ${fallbackId.slice(0, 6)}`;
  }
  return 'Unnamed Vendor';
}

function normalizeBoothList(input) {
  if (Array.isArray(input)) {
    return Array.from(new Set(
      input.map(v => String(v || '').trim()).filter(Boolean)
    ));
  }
  if (typeof input === 'string') {
    return Array.from(new Set(
      input.split(',').map(v => v.trim()).filter(Boolean)
    ));
  }
  return [];
}

function hydrateBoothVendorNamesFromDirectory() {
  if (!config?.booths?.length || !vendors.length) return;
  const vendorById = new Map(vendors.map(v => [v.id, v]));
  let changed = false;
  config.booths.forEach((booth) => {
    const vid = String(booth?.vendorId || '').trim();
    if (!vid) return;
    const vendor = vendorById.get(vid);
    if (!vendor) return;
    if (booth.vendorName !== vendor.displayName) {
      booth.vendorName = vendor.displayName;
      changed = true;
    }
    if (!booth.category && vendor.category) {
      booth.category = vendor.category;
      changed = true;
    }
  });
  if (changed) {
    console.info('[AdminFloorPlan] Hydrated booth vendor names from vendor directory.');
  }
}

async function syncVendorAssignmentsToVendorProfiles(db, fsm) {
  const boothAssignments = new Map();
  (config?.booths || []).forEach((booth) => {
    const vendorId = String(booth?.vendorId || '').trim();
    const boothId = String(booth?.id || '').trim();
    if (!vendorId || !boothId) return;
    if (!boothAssignments.has(vendorId)) boothAssignments.set(vendorId, []);
    const list = boothAssignments.get(vendorId);
    if (!list.includes(boothId)) list.push(boothId);
  });

  boothAssignments.forEach((value, key) => {
    value.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    boothAssignments.set(key, value);
  });

  const vendorIds = new Set(_loadedBoothVendorIds);
  boothAssignments.forEach((_value, key) => vendorIds.add(key));

  let updated = 0;
  let failed = 0;
  for (const vendorId of vendorIds) {
    const assignedBooths = boothAssignments.get(vendorId) || [];
    const boothText = assignedBooths.join(', ');
    const primaryBooth = assignedBooths[0] || '';
    const vendorMeta = vendors.find(v => v.id === vendorId);
    const existingBooths = normalizeBoothList(vendorMeta?.booths);
    const existingBoothText = existingBooths.join(', ');
    const existingPrimary = String(vendorMeta?.boothNumber || '').trim();

    const unchanged = (
      existingBoothText === boothText &&
      existingPrimary === primaryBooth
    );
    if (unchanged) continue;

    try {
      await fsm.updateDoc(fsm.doc(db, 'vendors', vendorId), {
        booths: assignedBooths,
        booth: boothText,
        boothNumber: primaryBooth,
        boothCount: assignedBooths.length,
        updatedAt: fsm.serverTimestamp(),
      });
      updated += 1;
      if (vendorMeta) {
        vendorMeta.booths = assignedBooths;
        vendorMeta.boothNumber = primaryBooth;
      }
    } catch (err) {
      failed += 1;
      console.warn(`[AdminFloorPlan] Failed to sync booth assignment for vendor ${vendorId}:`, err);
    }
  }

  _loadedBoothVendorIds = new Set(boothAssignments.keys());
  return { updated, failed };
}

function collectAssignedVendorIds(booths = []) {
  const ids = new Set();
  (booths || []).forEach((booth) => {
    const vendorId = String(booth?.vendorId || '').trim();
    if (vendorId) ids.add(vendorId);
  });
  return ids;
}

function normalizeBoothShape(value) {
  return value === 'corner' ? 'corner' : 'rectangle';
}

function normalizeCornerOrientation(value) {
  const valid = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  return valid.has(value) ? value : 'top-left';
}

function normalizeBoothData(booth = {}) {
  const normalized = { ...booth };
  normalized.shape = normalizeBoothShape(normalized.shape);

  if (normalized.shape === 'corner') {
    normalized.cornerOrientation = normalizeCornerOrientation(normalized.cornerOrientation);
    normalized.widthFeet = Math.max(1, parseInt(normalized.widthFeet, 10) || 16);
    normalized.heightFeet = Math.max(1, parseInt(normalized.heightFeet, 10) || 8);
  } else {
    normalized.widthFeet = Math.max(1, parseInt(normalized.widthFeet, 10) || 10);
    normalized.heightFeet = Math.max(1, parseInt(normalized.heightFeet, 10) || 10);
    delete normalized.cornerOrientation;
  }

  return normalized;
}

