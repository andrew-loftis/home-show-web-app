/**
 * Brand Configuration - Winn-Pro Show
 * 
 * Central design tokens and brand constants.
 * Import this in any view or component that needs brand consistency.
 */

export const BRAND = {
  // Event Info
  name: 'Winn-Pro Show',
  shortName: 'Winn-Pro',
  year: '2025',
  tagline: 'Swap cards. Discover vendors. Connect fast.',
  
  // Primary Colors (Blue to Purple gradient)
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Main primary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // Main accent
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    hero: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)',
    card: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    dark: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
  },
  
  // Glass effect values
  glass: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    blur: '12px',
  },
  
  // Typography
  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  
  // Spacing scale
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  // Border radius
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    glow: '0 0 20px rgba(59, 130, 246, 0.5)',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
};

// Role-based color schemes
export const ROLE_COLORS = {
  admin: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  vendor: {
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  attendee: {
    gradient: 'from-blue-500 to-purple-500',
    bg: 'bg-gradient-to-r from-blue-500 to-purple-500',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
};

// Category icons and colors for vendors
export const CATEGORY_STYLES = {
  'Home Improvement': { icon: 'hammer-outline', color: 'from-orange-500 to-amber-500' },
  'Kitchen & Bath': { icon: 'water-outline', color: 'from-cyan-500 to-blue-500' },
  'Landscaping': { icon: 'leaf-outline', color: 'from-green-500 to-emerald-500' },
  'Roofing': { icon: 'home-outline', color: 'from-slate-500 to-gray-600' },
  'Windows & Doors': { icon: 'grid-outline', color: 'from-sky-500 to-blue-500' },
  'HVAC': { icon: 'thermometer-outline', color: 'from-red-500 to-orange-500' },
  'Flooring': { icon: 'layers-outline', color: 'from-amber-600 to-yellow-500' },
  'Solar & Energy': { icon: 'sunny-outline', color: 'from-yellow-500 to-orange-400' },
  'Security': { icon: 'shield-checkmark-outline', color: 'from-indigo-500 to-purple-500' },
  'Insurance': { icon: 'umbrella-outline', color: 'from-blue-600 to-indigo-500' },
  'Financial': { icon: 'wallet-outline', color: 'from-emerald-600 to-teal-500' },
  'Real Estate': { icon: 'business-outline', color: 'from-violet-500 to-purple-500' },
  'General': { icon: 'storefront-outline', color: 'from-gray-500 to-slate-600' },
};

// Category colors for floor plan (hex colors for SVG rendering)
// Each category gets a unique, distinct color to help vendors avoid placing next to competitors
export const CATEGORY_COLORS = {
  // Construction & Structure
  'Roofing': { hex: '#64748b', name: 'Slate', icon: 'home-outline' },
  'Siding': { hex: '#78716c', name: 'Stone', icon: 'home-outline' },
  'Gutters': { hex: '#a8a29e', name: 'Warm Gray', icon: 'water-outline' },
  'Masonry': { hex: '#92400e', name: 'Amber Brown', icon: 'cube-outline' },
  'Concrete': { hex: '#6b7280', name: 'Gray', icon: 'square-outline' },
  'Insulation': { hex: '#fbbf24', name: 'Amber', icon: 'layers-outline' },
  'General Contractor': { hex: '#f97316', name: 'Orange', icon: 'construct-outline' },
  'Remodeling': { hex: '#ea580c', name: 'Deep Orange', icon: 'hammer-outline' },
  
  // Kitchen & Bath
  'Kitchen': { hex: '#0891b2', name: 'Cyan', icon: 'restaurant-outline' },
  'Bath': { hex: '#06b6d4', name: 'Light Cyan', icon: 'water-outline' },
  'Cabinets': { hex: '#0e7490', name: 'Dark Cyan', icon: 'grid-outline' },
  'Countertops': { hex: '#155e75', name: 'Deep Cyan', icon: 'layers-outline' },
  'Tile & Stone': { hex: '#164e63', name: 'Teal Dark', icon: 'apps-outline' },
  'Appliances': { hex: '#0284c7', name: 'Light Blue', icon: 'cube-outline' },
  
  // Outdoor & Landscaping
  'Landscaping': { hex: '#16a34a', name: 'Green', icon: 'leaf-outline' },
  'Decks & Patios': { hex: '#a16207', name: 'Brown', icon: 'home-outline' },
  'Pools & Spas': { hex: '#0ea5e9', name: 'Sky Blue', icon: 'water-outline' },
  'Fencing': { hex: '#78350f', name: 'Wood Brown', icon: 'git-branch-outline' },
  'Outdoor Living': { hex: '#15803d', name: 'Forest Green', icon: 'sunny-outline' },
  'Garden/Nursery': { hex: '#22c55e', name: 'Lime', icon: 'flower-outline' },
  
  // Windows, Doors & Flooring
  'Windows': { hex: '#3b82f6', name: 'Blue', icon: 'grid-outline' },
  'Doors': { hex: '#1d4ed8', name: 'Deep Blue', icon: 'enter-outline' },
  'Flooring': { hex: '#b45309', name: 'Amber Dark', icon: 'layers-outline' },
  
  // HVAC & Utilities
  'HVAC': { hex: '#dc2626', name: 'Red', icon: 'thermometer-outline' },
  'Plumbing': { hex: '#2563eb', name: 'Royal Blue', icon: 'water-outline' },
  'Electrical': { hex: '#facc15', name: 'Yellow', icon: 'flash-outline' },
  'Water Treatment': { hex: '#38bdf8', name: 'Light Sky', icon: 'water-outline' },
  
  // Energy & Solar
  'Solar': { hex: '#eab308', name: 'Golden', icon: 'sunny-outline' },
  'Energy Efficiency': { hex: '#84cc16', name: 'Lime Green', icon: 'leaf-outline' },
  
  // Technology & Security
  'Smart Home': { hex: '#8b5cf6', name: 'Violet', icon: 'phone-portrait-outline' },
  'Security': { hex: '#6366f1', name: 'Indigo', icon: 'shield-checkmark-outline' },
  'Home Theater/AV': { hex: '#7c3aed', name: 'Purple', icon: 'tv-outline' },
  'Lighting': { hex: '#fde047', name: 'Light Yellow', icon: 'bulb-outline' },
  
  // Services
  'Painting': { hex: '#f472b6', name: 'Pink', icon: 'brush-outline' },
  'Pest Control': { hex: '#059669', name: 'Emerald', icon: 'bug-outline' },
  'Home Cleaning': { hex: '#14b8a6', name: 'Teal', icon: 'sparkles-outline' },
  'Interior Design': { hex: '#ec4899', name: 'Fuchsia', icon: 'color-palette-outline' },
  'Furniture': { hex: '#d97706', name: 'Amber Orange', icon: 'bed-outline' },
  'Garage': { hex: '#57534e', name: 'Warm Stone', icon: 'car-outline' },
  
  // Financial & Real Estate
  'Real Estate': { hex: '#a855f7', name: 'Purple', icon: 'business-outline' },
  'Mortgage': { hex: '#9333ea', name: 'Deep Purple', icon: 'cash-outline' },
  'Insurance': { hex: '#4f46e5', name: 'Indigo Blue', icon: 'umbrella-outline' },
  
  // General/Other
  'Other': { hex: '#9ca3af', name: 'Gray', icon: 'ellipsis-horizontal-outline' },
  'General': { hex: '#71717a', name: 'Zinc', icon: 'storefront-outline' },
};

// Helper to get category style with fallback
export function getCategoryStyle(category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES['General'];
}

// Helper to get category color (hex) with fallback
export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
}

// Get all unique categories that have colors defined
export function getAllCategories() {
  return Object.keys(CATEGORY_COLORS).filter(c => c !== 'General' && c !== 'Other');
}

// Helper to create gradient CSS class
export function gradientClass(role) {
  return ROLE_COLORS[role]?.bg || ROLE_COLORS.attendee.bg;
}

export default BRAND;
