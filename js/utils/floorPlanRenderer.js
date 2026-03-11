/**
 * Shared Floor Plan SVG Renderer
 * Used by both the admin configurator and the public InteractiveMap viewer.
 *
 * Usage:
 *   import { renderFloorPlanSVG, renderFloorPlanLegend } from './utils/floorPlanRenderer.js';
 *   container.innerHTML = renderFloorPlanSVG(config, { showVendorNames: false });
 */

import { getCategoryColor } from '../brand.js';

/**
 * Render the floor plan as an SVG string from a floorPlanConfig document.
 *
 * @param {Object} config - The floorPlanConfigs document from Firestore
 * @param {Object} [options]
 * @param {boolean} [options.interactive=true]       - Add data attrs for click handling
 * @param {boolean} [options.showVendorNames=false]  - Show company names (admin only)
 * @param {boolean} [options.showCategoryColors=true] - Color booths by category
 * @param {boolean} [options.showGrid=false]          - Render 1-ft grid overlay
 * @param {boolean} [options.showLabels=true]         - Show booth ID labels
 * @param {boolean} [options.fitToContainer=false]    - Scale SVG to container width (no min pixel width)
 * @returns {string} SVG markup
 */
export function renderFloorPlanSVG(config, options = {}) {
  const {
    interactive = true,
    showVendorNames = false,
    showCategoryColors = true,
    showGrid = false,
    showLabels = true,
    fitToContainer = false,
  } = options;

  if (!config || !config.imageWidth || !config.imageHeight) {
    return `<svg viewBox="0 0 800 500" class="w-full">
      <rect width="800" height="500" rx="12" fill="#1f2937"/>
      <text x="400" y="250" text-anchor="middle" fill="#9ca3af" font-size="16">No floor plan configured</text>
    </svg>`;
  }

  const { imageWidth, imageHeight, backgroundImageUrl, calibration, booths = [] } = config;
  const ppf = calibration?.pixelsPerFoot || 10; // pixels per foot

  // Build SVG parts
  const parts = [];

  // Background image
  if (backgroundImageUrl) {
    parts.push(`<image href="${backgroundImageUrl}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid meet" class="fp-bg-image"/>`);
  } else {
    parts.push(`<rect width="${imageWidth}" height="${imageHeight}" fill="#1f2937"/>`);
  }

  // Optional grid overlay
  if (showGrid && ppf > 2) {
    const gridLines = [];
    // Vertical lines
    for (let x = 0; x < imageWidth; x += ppf) {
      gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${imageHeight}" class="fp-grid-line"/>`);
    }
    // Horizontal lines
    for (let y = 0; y < imageHeight; y += ppf) {
      gridLines.push(`<line x1="0" y1="${y}" x2="${imageWidth}" y2="${y}" class="fp-grid-line"/>`);
    }
    parts.push(`<g id="fp-grid" opacity="0.12">${gridLines.join('')}</g>`);
  }

  // Booths
  const boothElements = booths.map((booth, i) => {
    const isCorner = isCornerBooth(booth);
    const widthPx = booth.widthPx || booth.widthFeet * ppf;
    const heightPx = booth.heightPx || booth.heightFeet * ppf;
    const cornerLongPx = Math.max(6, widthPx || 0);
    const cornerDepthPx = Math.max(4, Math.min(heightPx || 0, cornerLongPx - 2));
    const w = isCorner ? cornerLongPx : Math.max(6, widthPx || 0);
    const h = isCorner ? cornerLongPx : Math.max(6, heightPx || 0);

    let fill = '#374151'; // default gray (unassigned)
    if (showCategoryColors && booth.category) {
      const colorInfo = getCategoryColor(booth.category);
      fill = colorInfo.hex;
    }

    const orientation = normalizeCornerOrientation(booth.cornerOrientation);
    const labelAnchor = isCorner
      ? getCornerLabelAnchor(cornerLongPx, cornerDepthPx, orientation)
      : { x: w / 2, y: h / 2 };

    // Font size scales with booth size, clamped
    const fontSize = Math.max(8, Math.min(14, Math.min(w, h) * 0.22));
    const vendorFontSize = Math.max(6, fontSize - 3);

    const attrs = interactive ? `data-booth-index="${i}" data-booth-id="${booth.id}"` : '';
    const shapeMarkup = isCorner
      ? buildCornerRects(cornerLongPx, cornerDepthPx, orientation)
          .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${fill}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision" class="fp-booth-rect"/>`)
          .join('')
      : `<rect width="${w}" height="${h}" rx="3" fill="${fill}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision" class="fp-booth-rect"/>`;

    let label = '';
    if (showLabels) {
      label = `<text x="${labelAnchor.x}" y="${labelAnchor.y + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" fill="white" font-weight="600" class="pointer-events-none">${escSvg(booth.id)}</text>`;
    }

    let vendorLabel = '';
    if (showVendorNames && booth.vendorName) {
      vendorLabel = `<text x="${labelAnchor.x}" y="${labelAnchor.y + fontSize * 0.35 + vendorFontSize + 2}" text-anchor="middle" font-size="${vendorFontSize}" fill="rgba(255,255,255,0.7)" class="pointer-events-none">${escSvg(truncate(booth.vendorName, 14))}</text>`;
    }

    return `<g class="fp-booth${interactive ? ' cursor-pointer' : ''}" ${attrs} transform="translate(${booth.x}, ${booth.y})">
      ${shapeMarkup}
      ${label}
      ${vendorLabel}
    </g>`;
  });

  parts.push(`<g id="fp-booths">${boothElements.join('')}</g>`);

  const svgStyle = fitToContainer
    ? 'width: 100%; height: auto; min-width: 0;'
    : `min-width: ${imageWidth}px;`;
  return `<svg id="fp-canvas" viewBox="0 0 ${imageWidth} ${imageHeight}" class="w-full" style="${svgStyle}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
    ${parts.join('\n    ')}
  </svg>`;
}

/**
 * Generate the category legend HTML for a floor plan config.
 * @param {Object} config
 * @param {Object} [options]
 * @param {boolean} [options.includeUnassigned=true] - Include gray "Unassigned" key
 * @returns {string} HTML
 */
export function renderFloorPlanLegend(config, options = {}) {
  const { includeUnassigned = true } = options;
  if (!config?.booths?.length) return '';

  const categories = new Set();
  config.booths.forEach(b => { if (b.category) categories.add(b.category); });
  if (categories.size === 0) return '';

  const sorted = Array.from(categories).sort();
  const items = [];
  if (includeUnassigned) {
    items.push(`<div class="flex items-center gap-2">
      <div class="w-4 h-4 rounded" style="background: #374151"></div>
      <span class="text-xs text-glass-secondary">Unassigned</span>
    </div>`);
  }

  sorted.forEach(cat => {
    const color = getCategoryColor(cat);
    items.push(`<div class="flex items-center gap-2">
      <div class="w-4 h-4 rounded" style="background: ${color.hex}"></div>
      <span class="text-xs text-glass-secondary">${escHtml(cat)}</span>
    </div>`);
  });

  return `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">${items.join('')}</div>`;
}

// Helpers
function escSvg(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function truncate(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

function isCornerBooth(booth) {
  return booth && booth.shape === 'corner';
}

function normalizeCornerOrientation(value) {
  const valid = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  return valid.has(value) ? value : 'top-left';
}

function buildCornerRects(longPx, depthPx, orientation) {
  const d = Math.max(4, Math.min(depthPx, longPx - 2));
  if (orientation === 'top-right') {
    return [
      { x: 0, y: 0, w: longPx, h: d },
      { x: longPx - d, y: 0, w: d, h: longPx },
    ];
  }
  if (orientation === 'bottom-left') {
    return [
      { x: 0, y: longPx - d, w: longPx, h: d },
      { x: 0, y: 0, w: d, h: longPx },
    ];
  }
  if (orientation === 'bottom-right') {
    return [
      { x: 0, y: longPx - d, w: longPx, h: d },
      { x: longPx - d, y: 0, w: d, h: longPx },
    ];
  }
  // top-left
  return [
    { x: 0, y: 0, w: longPx, h: d },
    { x: 0, y: 0, w: d, h: longPx },
  ];
}

function getCornerLabelAnchor(longPx, depthPx, orientation) {
  const d = Math.max(4, Math.min(depthPx, longPx - 2));
  if (orientation === 'top-right') {
    return { x: longPx * 0.42, y: d * 0.58 };
  }
  if (orientation === 'bottom-left') {
    return { x: longPx * 0.58, y: longPx - d * 0.42 };
  }
  if (orientation === 'bottom-right') {
    return { x: longPx * 0.42, y: longPx - d * 0.42 };
  }
  // top-left
  return { x: longPx * 0.58, y: d * 0.58 };
}
