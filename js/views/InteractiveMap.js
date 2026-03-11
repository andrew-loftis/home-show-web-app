import { getState } from "../store.js";
import { getCategoryColor } from "../brand.js";
import { renderFloorPlanSVG, renderFloorPlanLegend } from "../utils/floorPlanRenderer.js";

export default async function InteractiveMap(root) {
  const state = getState();

  root.innerHTML = `
    <div class="p-4 fade-in">
      <h2 class="text-xl font-bold mb-2 text-glass">Interactive Floor Plan</h2>
      <div class="glass-card p-8 text-center">
        <ion-icon name="hourglass-outline" class="text-3xl animate-spin text-brand mb-2"></ion-icon>
        <p class="text-glass-secondary">Loading floor plan...</p>
      </div>
    </div>
  `;

  let showId;
  try {
    showId = localStorage.getItem("winnpro_selected_show") || "putnam-spring-2026";
  } catch {
    showId = "putnam-spring-2026";
  }

  let fpConfig = null;
  try {
    const { getDb } = await import("../firebase.js");
    const db = getDb();
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "floorPlanConfigs", showId));
    if (snap.exists()) {
      fpConfig = await syncFloorPlanImageDimensions(snap.data());
    }
  } catch (err) {
    console.warn("[InteractiveMap] Could not load floor plan config:", err);
  }

  if (fpConfig && !state.isAdmin) {
    const vis = fpConfig.visibility || {};

    if (state.myVendor && vis.vendorRequiresPaid) {
      if (state.myVendor.paymentStatus !== "paid") {
        renderLocked(root, "Your booth payment must be completed before viewing the floor plan.");
        return;
      }
    }

    if (!state.myVendor && vis.publicVisibleDate) {
      const gateDate = new Date(vis.publicVisibleDate).getTime();
      if (Date.now() < gateDate) {
        const d = new Date(vis.publicVisibleDate);
        renderLocked(root, `The floor plan will be available on ${d.toLocaleDateString()}.`);
        return;
      }
    }
  }

  if (fpConfig && fpConfig.booths && fpConfig.booths.length > 0) {
    renderDynamic(root, fpConfig);
  } else {
    await renderLegacyGrid(root);
  }
}

function renderLocked(root, message) {
  root.innerHTML = `
    <div class="p-4 fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.history.back()">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back</span>
      </button>
      <div class="glass-card p-8 text-center max-w-md mx-auto">
        <ion-icon name="lock-closed-outline" class="text-5xl text-yellow-400 mb-4"></ion-icon>
        <h2 class="text-xl font-bold text-glass mb-2">Floor Plan Locked</h2>
        <p class="text-glass-secondary text-sm">${message}</p>
      </div>
    </div>
  `;
}

function renderDynamic(root, fpConfig) {
  const svgMarkup = renderFloorPlanSVG(fpConfig, {
    interactive: true,
    showVendorNames: false,
    showCategoryColors: true,
    showGrid: false,
    showLabels: true,
    fitToContainer: true,
  });

  const legendMarkup = renderFloorPlanLegend(fpConfig, { includeUnassigned: false });

  root.innerHTML = `
    <div class="p-4 fade-in imap-page">
      <div class="flex items-center justify-between mb-3 gap-2">
        <h2 class="text-xl font-bold text-glass">Interactive Floor Plan</h2>
        <button class="glass-button px-3 py-1.5 text-xs" onclick="window.history.back()">
          <ion-icon name="arrow-back-outline" class="mr-1"></ion-icon>
          Back
        </button>
      </div>
      <p class="text-glass-secondary text-xs mb-3">Pinch or scroll to zoom, then drag to explore. Tap a booth for details.</p>

      <div class="glass-card p-2 mb-4 imap-shell">
        <div id="imap-viewport" class="imap-viewport">
          <div id="imap-stage" class="imap-stage">
            ${svgMarkup}
          </div>
        </div>
      </div>

      <div id="boothCard" class="glass-card p-4 mb-4" style="display: none;">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold text-glass" id="boothCardTitle">Booth</h3>
            <p class="text-sm text-glass-secondary" id="boothCardCategory"></p>
            <p class="text-xs text-glass-secondary mt-1" id="boothCardVendor"></p>
          </div>
          <button class="text-glass-secondary hover:text-glass" onclick="document.getElementById('boothCard').style.display='none'">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
      </div>

      <div class="glass-card p-4">
        <h3 class="font-semibold text-glass mb-3 flex items-center gap-2">
          <ion-icon name="color-palette-outline" class="text-brand"></ion-icon>
          Category Key
        </h3>
        <p class="text-xs text-glass-secondary mb-2">Colors represent vendor categories.</p>
        ${legendMarkup || '<p class="text-xs text-glass-secondary">Categories will appear here as vendors are assigned.</p>'}
      </div>
    </div>
  `;

  wireBoothClicks(root, fpConfig.booths || []);
  enableMapNavigation(root);
}

async function renderLegacyGrid(root) {
  let boothData = {};
  let usedCategories = new Set();

  try {
    const { getDb } = await import("../firebase.js");
    const db = getDb();
    const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

    const vendorsQuery = query(collection(db, "vendors"), where("approved", "==", true));
    const vendorsSnap = await getDocs(vendorsQuery);

    vendorsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const category = data.category || "General";
      usedCategories.add(category);

      let booths = [];
      if (data.booths && Array.isArray(data.booths)) booths = data.booths;
      else if (data.booth) booths = data.booth.split(",").map((b) => b.trim());

      booths.forEach((boothId) => {
        boothData[boothId] = { category };
      });
    });

    const pendingQuery = query(collection(db, "vendors"), where("approved", "==", false));
    const pendingSnap = await getDocs(pendingQuery);

    pendingSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === "denied") return;
      const category = data.category || "General";
      usedCategories.add(category);

      let booths = [];
      if (data.booths && Array.isArray(data.booths)) booths = data.booths;
      else if (data.booth) booths = data.booth.split(",").map((b) => b.trim());

      booths.forEach((boothId) => {
        if (!boothData[boothId]) {
          boothData[boothId] = { category, pending: true };
        }
      });
    });
  } catch (error) {
    console.error("[InteractiveMap] Failed to load booth data:", error);
  }

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = 15;
  const boothWidth = 55;
  const boothHeight = 35;
  const gapX = 8;
  const gapY = 8;
  const startX = 30;
  const startY = 50;
  const svgWidth = startX * 2 + cols * (boothWidth + gapX);
  const svgHeight = startY + rows.length * (boothHeight + gapY) + 80;

  const boothElements = [];
  rows.forEach((row, rowIndex) => {
    for (let col = 1; col <= cols; col++) {
      const boothId = `${row}${col}`;
      const x = startX + (col - 1) * (boothWidth + gapX);
      const y = startY + rowIndex * (boothHeight + gapY);

      const data = boothData[boothId];
      let fillColor = "#374151";
      let strokeColor = "#4b5563";
      let categoryInfo = "";

      if (data) {
        const colorInfo = getCategoryColor(data.category);
        fillColor = colorInfo.hex;
        strokeColor = data.pending ? "#f59e0b" : "#1f2937";
        categoryInfo = data.category || "";
      }

      boothElements.push(`
        <g class="fp-booth cursor-pointer" data-booth-id="${boothId}" data-category="${categoryInfo}">
          <rect x="${x}" y="${y}" width="${boothWidth}" height="${boothHeight}"
                rx="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"
                class="fp-booth-rect" />
          <text x="${x + boothWidth / 2}" y="${y + boothHeight / 2 + 4}"
                text-anchor="middle" font-size="10" fill="white" font-weight="500"
                class="pointer-events-none">${boothId}</text>
        </g>
      `);
    }
  });

  const legendItems = [];
  Array.from(usedCategories).sort().forEach((category) => {
    const colorInfo = getCategoryColor(category);
    legendItems.push({ category, color: colorInfo.hex });
  });

  root.innerHTML = `
    <div class="p-4 fade-in imap-page">
      <div class="flex items-center justify-between mb-3 gap-2">
        <h2 class="text-xl font-bold text-glass">Interactive Floor Plan</h2>
        <button class="glass-button px-3 py-1.5 text-xs" onclick="window.history.back()">
          <ion-icon name="arrow-back-outline" class="mr-1"></ion-icon>
          Back
        </button>
      </div>
      <p class="text-glass-secondary text-xs mb-3">Pinch or scroll to zoom, then drag to explore. Tap a booth for details.</p>

      <div class="glass-card p-2 mb-4 imap-shell">
        <div id="imap-viewport" class="imap-viewport">
          <div id="imap-stage" class="imap-stage">
            <svg id="fp-canvas" viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full" style="width: 100%; height: auto; min-width: 0;">
              <rect x="10" y="10" width="${svgWidth - 20}" height="${svgHeight - 20}" rx="12" fill="#1f2937" stroke="#374151" stroke-width="2" />
              <text x="${svgWidth / 2}" y="32" text-anchor="middle" font-size="14" fill="#9ca3af" font-weight="600">Floor Plan - Booth Layout</text>
              ${rows.map((row, i) => `
                <text x="15" y="${startY + i * (boothHeight + gapY) + boothHeight / 2 + 4}"
                      font-size="12" fill="#9ca3af" font-weight="bold">${row}</text>
              `).join("")}
              ${Array.from({ length: cols }, (_, i) => i + 1).map((col) => `
                <text x="${startX + (col - 1) * (boothWidth + gapX) + boothWidth / 2}" y="${startY - 8}"
                      text-anchor="middle" font-size="10" fill="#6b7280">${col}</text>
              `).join("")}
              ${boothElements.join("")}
              <circle cx="${svgWidth / 2}" cy="${svgHeight - 25}" r="8" fill="#22c55e" />
              <text x="${svgWidth / 2 + 15}" y="${svgHeight - 21}" font-size="11" fill="#22c55e">Main Entrance</text>
            </svg>
          </div>
        </div>
      </div>

      <div id="boothCard" class="glass-card p-4 mb-4" style="display: none;">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold text-glass" id="boothCardTitle">Booth</h3>
            <p class="text-sm text-glass-secondary" id="boothCardCategory"></p>
            <p class="text-xs text-glass-secondary mt-1" id="boothCardVendor"></p>
          </div>
          <button class="text-glass-secondary hover:text-glass" onclick="document.getElementById('boothCard').style.display='none'">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
      </div>

      <div class="glass-card p-4">
        <h3 class="font-semibold text-glass mb-3 flex items-center gap-2">
          <ion-icon name="color-palette-outline" class="text-brand"></ion-icon>
          Category Key
        </h3>
        <p class="text-xs text-glass-secondary mb-3">Colors represent business categories at the show.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          ${legendItems.length
            ? legendItems.map((item) => `
              <div class="flex items-center gap-2 p-2 rounded bg-white/5">
                <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
                <span class="text-xs text-glass truncate">${item.category}</span>
              </div>
            `).join("")
            : '<p class="text-xs text-glass-secondary">Categories will appear here as vendors are assigned.</p>'}
        </div>
      </div>
    </div>
  `;

  wireBoothClicks(root, []);
  enableMapNavigation(root);
}

function wireBoothClicks(root, booths = []) {
  const svg = root.querySelector("#fp-canvas") || root.querySelector("svg");
  const boothCard = root.querySelector("#boothCard");
  const boothCardTitle = root.querySelector("#boothCardTitle");
  const boothCardCategory = root.querySelector("#boothCardCategory");
  const boothCardVendor = root.querySelector("#boothCardVendor");
  const viewport = root.querySelector("#imap-viewport");
  if (!svg || !boothCard || !boothCardTitle || !boothCardCategory || !boothCardVendor) return;

  const boothLookup = new Map(
    booths
      .filter((b) => b && b.id)
      .map((b) => [String(b.id), b])
  );

  svg.addEventListener("click", (e) => {
    if (viewport?.dataset?.gesture === "1") return;

    const boothGroup = e.target.closest(".fp-booth") || e.target.closest("[data-booth-id]");
    if (!boothGroup) return;

    const boothId = String(boothGroup.dataset.boothId || boothGroup.dataset.boothIndex || "");
    if (!boothId) return;

    const booth = boothLookup.get(boothId);
    const category = booth?.category || boothGroup.dataset.category || "";
    const vendorName = booth?.vendorName || "";

    boothCardTitle.textContent = `Booth ${boothId}`;
    boothCardCategory.textContent = category ? `Category: ${category}` : "Category details coming soon";
    boothCardVendor.textContent = vendorName ? `Vendor: ${vendorName}` : "";
    boothCard.style.display = "block";
  });
}

function enableMapNavigation(root) {
  const viewport = root.querySelector("#imap-viewport");
  const svg = root.querySelector("#fp-canvas") || root.querySelector("svg");
  if (!viewport || !svg) return;

  const pointers = new Map();
  const maxZoom = 12;
  const moveThreshold = 3;
  let gestureFlagTimer = null;
  let baseViewBox = getSvgViewBox(svg);
  let currentViewBox = { ...baseViewBox };
  let panStart = null;
  let pinchStart = null;

  viewport.dataset.gesture = "0";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pointerDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pointerMidpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function setGestureFlag() {
    viewport.dataset.gesture = "1";
    if (gestureFlagTimer) clearTimeout(gestureFlagTimer);
    gestureFlagTimer = setTimeout(() => {
      viewport.dataset.gesture = "0";
    }, 180);
  }

  function getViewportRect() {
    return viewport.getBoundingClientRect();
  }

  function getMapAspectRatio() {
    return baseViewBox.height / Math.max(1, baseViewBox.width);
  }

  function getMinViewBoxWidth() {
    return Math.max(1, baseViewBox.width / maxZoom);
  }

  function syncViewportHeight() {
    const viewportWidth = viewport.clientWidth || 1;
    const idealHeight = viewportWidth * getMapAspectRatio();
    const maxHeight = Math.max(300, Math.floor(window.innerHeight * 0.76));
    const nextHeight = Math.min(maxHeight, Math.max(260, Math.round(idealHeight)));
    viewport.style.height = `${nextHeight}px`;
  }

  function clampViewBox(viewBox) {
    const minWidth = getMinViewBoxWidth();
    const aspect = getMapAspectRatio();

    let width = clamp(viewBox.width, minWidth, baseViewBox.width);
    let height = width * aspect;

    if (height > baseViewBox.height) {
      height = baseViewBox.height;
      width = height / aspect;
    }

    const minX = baseViewBox.x;
    const maxX = baseViewBox.x + baseViewBox.width - width;
    const minY = baseViewBox.y;
    const maxY = baseViewBox.y + baseViewBox.height - height;

    const x = clamp(viewBox.x, minX, maxX);
    const y = clamp(viewBox.y, minY, maxY);

    return { x, y, width, height };
  }

  function applyViewBox(next) {
    currentViewBox = clampViewBox(next);
    svg.setAttribute(
      "viewBox",
      `${currentViewBox.x} ${currentViewBox.y} ${currentViewBox.width} ${currentViewBox.height}`
    );
  }

  function clientToSvg(clientX, clientY, viewBox = currentViewBox) {
    const rect = getViewportRect();
    const relX = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const relY = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    return {
      x: viewBox.x + relX * viewBox.width,
      y: viewBox.y + relY * viewBox.height,
      relX,
      relY,
    };
  }

  function zoomAt(factor, clientX, clientY, sourceViewBox = currentViewBox) {
    const minWidth = getMinViewBoxWidth();
    const aspect = getMapAspectRatio();
    const targetWidth = clamp(sourceViewBox.width / factor, minWidth, baseViewBox.width);
    const targetHeight = targetWidth * aspect;
    const { relX, relY } = clientToSvg(clientX, clientY, sourceViewBox);
    const x = sourceViewBox.x + relX * (sourceViewBox.width - targetWidth);
    const y = sourceViewBox.y + relY * (sourceViewBox.height - targetHeight);
    applyViewBox({ x, y, width: targetWidth, height: targetHeight });
  }

  function panFrom(start, clientX, clientY) {
    const rect = getViewportRect();
    const dxPx = clientX - start.clientX;
    const dyPx = clientY - start.clientY;
    const dx = (dxPx / Math.max(1, rect.width)) * start.viewBox.width;
    const dy = (dyPx / Math.max(1, rect.height)) * start.viewBox.height;
    applyViewBox({
      x: start.viewBox.x - dx,
      y: start.viewBox.y - dy,
      width: start.viewBox.width,
      height: start.viewBox.height,
    });
  }

  function recalcLayout() {
    syncViewportHeight();
    applyViewBox(currentViewBox);
  }

  requestAnimationFrame(recalcLayout);

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => recalcLayout());
    resizeObserver.observe(viewport);
  }

  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture support varies by browser.
    }

    if (pointers.size === 1) {
      panStart = { clientX: e.clientX, clientY: e.clientY, viewBox: { ...currentViewBox } };
      viewport.classList.add("imap-grabbing");
    } else if (pointers.size >= 2) {
      const [p1, p2] = Array.from(pointers.values());
      pinchStart = {
        distance: Math.max(1, pointerDistance(p1, p2)),
        viewBox: { ...currentViewBox },
      };
      viewport.classList.add("imap-grabbing");
      setGestureFlag();
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
      const [p1, p2] = Array.from(pointers.values());
      const midpoint = pointerMidpoint(p1, p2);
      if (!pinchStart) {
        pinchStart = {
          distance: Math.max(1, pointerDistance(p1, p2)),
          viewBox: { ...currentViewBox },
        };
      }

      const distance = Math.max(1, pointerDistance(p1, p2));
      const zoomFactor = distance / Math.max(1, pinchStart.distance);
      zoomAt(zoomFactor, midpoint.x, midpoint.y, pinchStart.viewBox);
      setGestureFlag();
      return;
    }

    if (pointers.size === 1 && panStart) {
      const active = pointers.get(e.pointerId);
      const moveDistance = Math.hypot(active.x - panStart.clientX, active.y - panStart.clientY);
      if (moveDistance > moveThreshold) setGestureFlag();
      panFrom(panStart, active.x, active.y);
    }
  });

  const releasePointer = (e) => {
    pointers.delete(e.pointerId);
    try {
      if (viewport.hasPointerCapture?.(e.pointerId)) {
        viewport.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Pointer capture release support varies by browser.
    }

    if (pointers.size === 0) {
      panStart = null;
      pinchStart = null;
      viewport.classList.remove("imap-grabbing");
      return;
    }

    if (pointers.size === 1) {
      const [remaining] = Array.from(pointers.values());
      panStart = { clientX: remaining.x, clientY: remaining.y, viewBox: { ...currentViewBox } };
      pinchStart = null;
    }
  };

  viewport.addEventListener("pointerup", releasePointer);
  viewport.addEventListener("pointercancel", releasePointer);
  viewport.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    releasePointer(e);
  });

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      zoomAt(factor, e.clientX, e.clientY);
      setGestureFlag();
    },
    { passive: false }
  );

  viewport.addEventListener("dblclick", (e) => {
    e.preventDefault();
    zoomAt(1.8, e.clientX, e.clientY);
    setGestureFlag();
  });
}

function getSvgViewBox(svg) {
  const raw = String(svg?.getAttribute?.("viewBox") || "").trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
    return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
  }

  const width = Number(svg?.getAttribute?.("width")) || Number(svg?.clientWidth) || 1;
  const height = Number(svg?.getAttribute?.("height")) || Number(svg?.clientHeight) || 1;
  return { x: 0, y: 0, width, height };
}

async function syncFloorPlanImageDimensions(fpConfig) {
  if (!fpConfig?.backgroundImageUrl) return fpConfig;

  try {
    const dims = await getImageDimensions(fpConfig.backgroundImageUrl);
    if (!Number.isFinite(dims.width) || !Number.isFinite(dims.height)) return fpConfig;
    if (dims.width <= 0 || dims.height <= 0) return fpConfig;

    if (fpConfig.imageWidth !== dims.width || fpConfig.imageHeight !== dims.height) {
      return {
        ...fpConfig,
        imageWidth: dims.width,
        imageHeight: dims.height,
      };
    }
  } catch (err) {
    console.warn("[InteractiveMap] Could not sync image dimensions:", err);
  }

  return fpConfig;
}

function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}
