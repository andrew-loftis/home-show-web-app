/**
 * White-Label Configuration
 * Configurable theming and branding for different trade shows
 * 
 * Usage:
 * 1. Set window.WHITE_LABEL_CONFIG before app loads, OR
 * 2. Create a config file for each show and import it, OR
 * 3. Fetch config from Firestore based on domain/subdomain
 */

// Default configuration
const DEFAULT_CONFIG = {
  // Show/Event Identity
  show: {
    name: 'Winn-Pro Show',
    tagline: 'Your Dream Home Starts Here',
    year: new Date().getFullYear(),
    dates: 'March 15-17, 2024',
    location: 'Convention Center',
    address: '123 Main Street, City, ST 12345',
    description: 'The region\'s premier trade show event featuring hundreds of exhibitors.',
    website: 'https://tn-shows.app',
    supportEmail: 'support@tn-shows.app',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: ''
    }
  },

  // Branding Colors
  colors: {
    primary: '#3B82F6',      // Blue-500
    primaryDark: '#1D4ED8',  // Blue-700
    primaryLight: '#60A5FA', // Blue-400
    secondary: '#8B5CF6',    // Violet-500
    accent: '#F59E0B',       // Amber-500
    success: '#10B981',      // Emerald-500
    warning: '#F59E0B',      // Amber-500
    error: '#EF4444',        // Red-500
    background: '#0a0a1a',   // Dark background
    surface: 'rgba(255, 255, 255, 0.05)', // Glass surface
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)'
  },

  // Gradient (for headers, buttons)
  gradient: {
    from: '#667eea',
    to: '#764ba2'
  },

  // Logo and Images
  assets: {
    logo: '/assets/logo.svg',
    logoLight: '/assets/logo-light.svg',
    logoDark: '/assets/logo-dark.svg',
    favicon: '/assets/favicon.ico',
    appIcon: '/assets/app-icon-512.png',
    heroImage: '/assets/hero-bg.jpg',
    mapImage: '/assets/floor-plan.png',
    defaultVendorLogo: '/assets/default-vendor.png',
    defaultAvatar: '/assets/default-avatar.png'
  },

  // Features toggle
  features: {
    vendorRegistration: true,
    onlinePayments: true,
    leadCapture: true,
    qrCodes: true,
    interactiveMap: true,
    schedule: true,
    pushNotifications: true,
    chat: false, // Premium feature
    sponsorTiers: true,
    vendorGallery: true,
    attendeeProfiles: true,
    savedVendors: true,
    businessCards: true,
    analytics: true,
    export: true
  },

  // Booth/Pricing Configuration
  booths: {
    types: [
      { id: 'standard', name: 'Standard', size: '10x10', price: 500 },
      { id: 'premium', name: 'Premium', size: '10x15', price: 850 },
      { id: 'double', name: 'Double', size: '10x20', price: 950 },
      { id: 'island', name: 'Island', size: '20x20', price: 1500 }
    ],
    currency: 'USD',
    taxRate: 0, // 0 = no tax, 0.08 = 8% tax
    earlyBirdDiscount: 0.1, // 10% off
    earlyBirdDeadline: null // ISO date string
  },

  // Vendor Categories
  categories: [
    'Roofing & Siding',
    'Windows & Doors',
    'Kitchen & Bath',
    'HVAC & Energy',
    'Landscaping',
    'Flooring',
    'Painting',
    'Electrical',
    'Plumbing',
    'Security & Smart Home',
    'Solar & Renewable',
    'Pools & Spas',
    'Decks & Patios',
    'Interior Design',
    'Furniture',
    'Other'
  ],

  // Schedule/Events
  schedule: {
    timezone: 'America/Chicago',
    days: [
      { date: '2024-03-15', label: 'Friday', hours: '10am - 8pm' },
      { date: '2024-03-16', label: 'Saturday', hours: '10am - 8pm' },
      { date: '2024-03-17', label: 'Sunday', hours: '10am - 5pm' }
    ]
  },

  // Sponsor Tiers
  sponsors: {
    tiers: [
      { id: 'platinum', name: 'Platinum', color: '#E5E4E2' },
      { id: 'gold', name: 'Gold', color: '#FFD700' },
      { id: 'silver', name: 'Silver', color: '#C0C0C0' },
      { id: 'bronze', name: 'Bronze', color: '#CD7F32' }
    ]
  },

  // Legal/Compliance
  legal: {
    privacyPolicyUrl: '/privacy',
    termsUrl: '/terms',
    vendorAgreementUrl: '/vendor-agreement',
    copyrightHolder: 'Winn-Pro Show Inc.',
    cookieNotice: true
  },

  // Analytics/Tracking (only IDs, actual scripts loaded separately)
  tracking: {
    googleAnalyticsId: '',
    facebookPixelId: '',
    hotjarId: ''
  }
};

// Current active config
let activeConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize white label config
 * Call this early in app boot
 */
export function initWhiteLabel() {
  // Check for runtime config
  if (window.WHITE_LABEL_CONFIG) {
    activeConfig = mergeConfig(DEFAULT_CONFIG, window.WHITE_LABEL_CONFIG);
  }

  // Apply CSS custom properties for colors
  applyThemeColors(activeConfig.colors, activeConfig.gradient);

  // Update document title
  document.title = activeConfig.show.name;

  // Update favicon if specified
  if (activeConfig.assets.favicon) {
    updateFavicon(activeConfig.assets.favicon);
  }

  // Update manifest if PWA
  updateManifest(activeConfig);

  return activeConfig;
}

/**
 * Get the current config
 */
export function getConfig() {
  return activeConfig;
}

/**
 * Get a specific config value by path
 * @param {string} path - Dot notation path like 'show.name' or 'colors.primary'
 * @param {any} defaultValue - Default if not found
 */
export function getConfigValue(path, defaultValue = null) {
  const parts = path.split('.');
  let value = activeConfig;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return activeConfig.features[featureName] !== false;
}

/**
 * Get show name
 */
export function getShowName() {
  return activeConfig.show.name;
}

/**
 * Get primary color
 */
export function getPrimaryColor() {
  return activeConfig.colors.primary;
}

/**
 * Get logo URL
 */
export function getLogoUrl(variant = 'default') {
  const logos = {
    default: activeConfig.assets.logo,
    light: activeConfig.assets.logoLight,
    dark: activeConfig.assets.logoDark
  };
  return logos[variant] || logos.default;
}

/**
 * Get booth types for pricing display
 */
export function getBoothTypes() {
  return activeConfig.booths.types;
}

/**
 * Get vendor categories
 */
export function getCategories() {
  return activeConfig.categories;
}

/**
 * Deep merge two config objects
 */
function mergeConfig(defaults, overrides) {
  const result = { ...defaults };
  
  for (const key in overrides) {
    if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      result[key] = mergeConfig(defaults[key] || {}, overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  
  return result;
}

/**
 * Apply theme colors as CSS custom properties
 */
function applyThemeColors(colors, gradient) {
  const root = document.documentElement;
  
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-error', colors.error);
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  
  root.style.setProperty('--gradient-from', gradient.from);
  root.style.setProperty('--gradient-to', gradient.to);

  // Create gradient CSS
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`);
}

/**
 * Update favicon dynamically
 */
function updateFavicon(iconUrl) {
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconUrl;
}

/**
 * Update PWA manifest with branding
 */
function updateManifest(config) {
  // This would update the manifest dynamically if needed
  // For static manifests, you'd regenerate the file during build
}

/**
 * Load config from Firestore based on domain
 */
export async function loadConfigFromFirestore(domain = window.location.hostname) {
  try {
    const { getDb } = await import('./firebase.js');
    const db = getDb();
    const { doc, getDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    // Try to get config by domain
    const configDoc = await getDoc(doc(db, 'whiteLabel', domain));
    
    if (configDoc.exists()) {
      activeConfig = mergeConfig(DEFAULT_CONFIG, configDoc.data());
      applyThemeColors(activeConfig.colors, activeConfig.gradient);
      return activeConfig;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to load white label config from Firestore:', error);
    return null;
  }
}

/**
 * Generate example config for a new show
 */
export function generateExampleConfig(showName = 'My Trade Show') {
  return {
    show: {
      name: showName,
      tagline: 'Your Dream Home Awaits',
      year: new Date().getFullYear(),
      dates: 'TBD',
      location: 'TBD',
      website: 'https://example.com',
      supportEmail: 'support@example.com'
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#F59E0B'
    },
    gradient: {
      from: '#667eea',
      to: '#764ba2'
    },
    assets: {
      logo: '/assets/logo.svg'
    },
    features: {
      vendorRegistration: true,
      onlinePayments: true,
      leadCapture: true
    }
  };
}

/**
 * CSS template for white-label theme
 * Add this to your stylesheets or inject dynamically
 */
export const CSS_TEMPLATE = `
:root {
  --color-primary: var(--color-primary, #3B82F6);
  --color-primary-dark: var(--color-primary-dark, #1D4ED8);
  --color-primary-light: var(--color-primary-light, #60A5FA);
  --color-secondary: var(--color-secondary, #8B5CF6);
  --color-accent: var(--color-accent, #F59E0B);
  --color-success: var(--color-success, #10B981);
  --color-warning: var(--color-warning, #F59E0B);
  --color-error: var(--color-error, #EF4444);
  --color-background: var(--color-background, #0a0a1a);
  --color-surface: var(--color-surface, rgba(255, 255, 255, 0.05));
  --color-text: var(--color-text, #ffffff);
  --color-text-secondary: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
  --gradient-from: var(--gradient-from, #667eea);
  --gradient-to: var(--gradient-to, #764ba2);
  --gradient-primary: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
}

/* Usage examples */
.btn-primary {
  background: var(--gradient-primary);
}

.text-primary {
  color: var(--color-primary);
}

.bg-surface {
  background: var(--color-surface);
}

.text-secondary {
  color: var(--color-text-secondary);
}
`;
