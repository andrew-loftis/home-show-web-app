// Admin configuration
// Replace the placeholder email with your own admin email(s).
// You can also override at runtime via window.ADMIN_EMAILS = ['you@example.com'] before app boot.
export const ADMIN_EMAILS = (typeof window !== 'undefined' && Array.isArray(window.ADMIN_EMAILS))
  ? window.ADMIN_EMAILS
  : ['andrew@houseofkna.com'];
