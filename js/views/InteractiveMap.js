import { getState } from "../store.js";
import { CATEGORY_COLORS, getCategoryColor } from "../brand.js";

export default async function InteractiveMap(root) {
  // Show loading state
  root.innerHTML = `
    <div class="p-4 fade-in">
      <h2 class="text-xl font-bold mb-2 text-glass">Interactive Floor Plan</h2>
      <div class="glass-card p-8 text-center">
        <ion-icon name="hourglass-outline" class="text-3xl animate-spin text-brand mb-2"></ion-icon>
        <p class="text-glass-secondary">Loading floor plan...</p>
      </div>
    </div>
  `;

  // Load booth data from Firestore
  let boothData = {};
  let usedCategories = new Set();
  
  try {
    const { getDb } = await import("../firebase.js");
    const db = getDb();
    const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    
    // Get approved vendors with their booths and categories
    const vendorsQuery = query(collection(db, 'vendors'), where('approved', '==', true));
    const vendorsSnap = await getDocs(vendorsQuery);
    
    vendorsSnap.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'General';
      usedCategories.add(category);
      
      // Handle array of booths or comma-separated string
      let booths = [];
      if (data.booths && Array.isArray(data.booths)) {
        booths = data.booths;
      } else if (data.booth) {
        booths = data.booth.split(',').map(b => b.trim());
      }
      
      booths.forEach(boothId => {
        boothData[boothId] = {
          category: category,
          // Note: We intentionally don't include company name for privacy during registration
        };
      });
    });
    
    // Also check pending applications (they reserve booths but we can still show the category)
    const pendingQuery = query(collection(db, 'vendors'), where('approved', '==', false));
    const pendingSnap = await getDocs(pendingQuery);
    
    pendingSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === 'denied') return; // Skip denied applications
      
      const category = data.category || 'General';
      usedCategories.add(category);
      
      let booths = [];
      if (data.booths && Array.isArray(data.booths)) {
        booths = data.booths;
      } else if (data.booth) {
        booths = data.booth.split(',').map(b => b.trim());
      }
      
      booths.forEach(boothId => {
        if (!boothData[boothId]) { // Don't overwrite approved vendors
          boothData[boothId] = {
            category: category,
            pending: true
          };
        }
      });
    });
    
  } catch (error) {
    console.error('Failed to load booth data:', error);
  }

  // Generate booth grid layout (8 rows A-H, 15 columns)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = 15;
  const boothWidth = 55;
  const boothHeight = 35;
  const gapX = 8;
  const gapY = 8;
  const startX = 30;
  const startY = 50;
  const svgWidth = startX * 2 + cols * (boothWidth + gapX);
  const svgHeight = startY + rows.length * (boothHeight + gapY) + 80;

  // Generate booth elements
  const boothElements = [];
  rows.forEach((row, rowIndex) => {
    for (let col = 1; col <= cols; col++) {
      const boothId = `${row}${col}`;
      const x = startX + (col - 1) * (boothWidth + gapX);
      const y = startY + rowIndex * (boothHeight + gapY);
      
      const data = boothData[boothId];
      let fillColor = '#374151'; // Default gray for empty
      let strokeColor = '#4b5563';
      let categoryInfo = null;
      
      if (data) {
        const colorInfo = getCategoryColor(data.category);
        fillColor = colorInfo.hex;
        strokeColor = data.pending ? '#f59e0b' : '#1f2937'; // Orange border for pending
        categoryInfo = data.category;
      }
      
      boothElements.push(`
        <g class="booth-group cursor-pointer" data-booth="${boothId}" data-category="${categoryInfo || ''}">
          <rect x="${x}" y="${y}" width="${boothWidth}" height="${boothHeight}" 
                rx="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"
                class="booth-rect transition-all duration-200 hover:brightness-125" />
          <text x="${x + boothWidth/2}" y="${y + boothHeight/2 + 4}" 
                text-anchor="middle" font-size="10" fill="white" font-weight="500"
                class="pointer-events-none">${boothId}</text>
        </g>
      `);
    }
  });

  // Generate legend for used categories only
  const legendItems = [];
  const sortedCategories = Array.from(usedCategories).sort();
  
  // Add empty booth to legend
  legendItems.push({ category: 'Available', color: '#374151' });
  
  sortedCategories.forEach(category => {
    const colorInfo = getCategoryColor(category);
    legendItems.push({ category, color: colorInfo.hex, icon: colorInfo.icon });
  });

  // Render the complete floor plan
  root.innerHTML = `
    <div class="p-4 fade-in">
      <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.history.back()">
        <ion-icon name="arrow-back-outline"></ion-icon>
        <span>Back</span>
      </button>
      
      <h2 class="text-xl font-bold mb-2 text-glass">Interactive Floor Plan</h2>
      <p class="text-glass-secondary text-sm mb-4">Tap a booth to see the business category. Colors indicate vendor types to help you plan your booth location.</p>
      
      <!-- Floor Plan SVG -->
      <div class="glass-card p-4 mb-4 overflow-x-auto">
        <div class="min-w-[${svgWidth}px]">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full" style="min-width: ${svgWidth}px;">
            <!-- Background -->
            <rect x="10" y="10" width="${svgWidth - 20}" height="${svgHeight - 20}" rx="12" fill="#1f2937" stroke="#374151" stroke-width="2" />
            
            <!-- Title -->
            <text x="${svgWidth/2}" y="32" text-anchor="middle" font-size="14" fill="#9ca3af" font-weight="600">Floor Plan - Booth Layout</text>
            
            <!-- Row Labels -->
            ${rows.map((row, i) => `
              <text x="15" y="${startY + i * (boothHeight + gapY) + boothHeight/2 + 4}" 
                    font-size="12" fill="#9ca3af" font-weight="bold">${row}</text>
            `).join('')}
            
            <!-- Column Labels -->
            ${Array.from({length: cols}, (_, i) => i + 1).map(col => `
              <text x="${startX + (col - 1) * (boothWidth + gapX) + boothWidth/2}" y="${startY - 8}" 
                    text-anchor="middle" font-size="10" fill="#6b7280">${col}</text>
            `).join('')}
            
            <!-- Booths -->
            ${boothElements.join('')}
            
            <!-- Entrance Indicator -->
            <circle cx="${svgWidth/2}" cy="${svgHeight - 25}" r="8" fill="#22c55e" />
            <text x="${svgWidth/2 + 15}" y="${svgHeight - 21}" font-size="11" fill="#22c55e">Main Entrance</text>
          </svg>
        </div>
      </div>
      
      <!-- Booth Info Popup -->
      <div id="boothCard" class="glass-card p-4 mb-4" style="display: none;">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-bold text-glass" id="boothCardTitle">Booth</h3>
            <p class="text-sm text-glass-secondary" id="boothCardCategory">Category</p>
          </div>
          <button class="text-glass-secondary hover:text-glass" onclick="document.getElementById('boothCard').style.display='none'">
            <ion-icon name="close-outline" class="text-xl"></ion-icon>
          </button>
        </div>
      </div>
      
      <!-- Legend / Key -->
      <div class="glass-card p-4">
        <h3 class="font-semibold text-glass mb-3 flex items-center gap-2">
          <ion-icon name="color-palette-outline" class="text-brand"></ion-icon>
          Category Key
        </h3>
        <p class="text-xs text-glass-secondary mb-3">Colors represent vendor business types. Company names are not shown to protect privacy.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          ${legendItems.map(item => `
            <div class="flex items-center gap-2 p-2 rounded bg-white/5">
              <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
              <span class="text-xs text-glass truncate">${item.category}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Stats -->
      <div class="mt-4 grid grid-cols-3 gap-3">
        <div class="glass-card p-3 text-center">
          <div class="text-xl font-bold text-brand">${Object.keys(boothData).length}</div>
          <div class="text-xs text-glass-secondary">Taken</div>
        </div>
        <div class="glass-card p-3 text-center">
          <div class="text-xl font-bold text-green-400">${rows.length * cols - Object.keys(boothData).length}</div>
          <div class="text-xs text-glass-secondary">Available</div>
        </div>
        <div class="glass-card p-3 text-center">
          <div class="text-xl font-bold text-glass">${usedCategories.size}</div>
          <div class="text-xs text-glass-secondary">Categories</div>
        </div>
      </div>
    </div>
  `;

  // Add click handlers for booths
  const svg = root.querySelector('svg');
  const boothCard = root.querySelector('#boothCard');
  const boothCardTitle = root.querySelector('#boothCardTitle');
  const boothCardCategory = root.querySelector('#boothCardCategory');
  
  svg.addEventListener('click', (e) => {
    const boothGroup = e.target.closest('.booth-group');
    if (boothGroup) {
      const boothId = boothGroup.getAttribute('data-booth');
      const category = boothGroup.getAttribute('data-category');
      
      boothCardTitle.textContent = `Booth ${boothId}`;
      
      if (category && category !== 'null') {
        boothCardCategory.innerHTML = `
          <span class="inline-flex items-center gap-1">
            <ion-icon name="${getCategoryColor(category).icon}"></ion-icon>
            ${category}
          </span>
        `;
      } else {
        boothCardCategory.textContent = 'Available';
      }
      
      boothCard.style.display = 'block';
    }
  });
}
