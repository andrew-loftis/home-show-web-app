/**
 * Brand Configuration - Putnam County Home Show 2025
 * 
 * Central design tokens and brand constants.
 * Import this in any view or component that needs brand consistency.
 */

export const BRAND = {
  // Event Info
  name: 'Putnam County Home Show',
  shortName: 'HomeShow',
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

// Helper to get category style with fallback
export function getCategoryStyle(category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES['General'];
}

// Helper to create gradient CSS class
export function gradientClass(role) {
  return ROLE_COLORS[role]?.bg || ROLE_COLORS.attendee.bg;
}

export default BRAND;
