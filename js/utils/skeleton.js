/**
 * Skeleton loading components for professional loading states
 */

// Base skeleton shimmer animation class - uses CSS class for theme awareness
const shimmer = "skeleton-shimmer animate-pulse rounded";

/**
 * Generic skeleton box
 */
export function SkeletonBox(className = "") {
  return `<div class="${shimmer} ${className}"></div>`;
}

/**
 * Skeleton for text lines
 */
export function SkeletonText(lines = 3, className = "") {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];
  return Array(lines).fill(0).map((_, i) => 
    `<div class="${shimmer} h-4 ${widths[i % widths.length]} ${className}"></div>`
  ).join("");
}

/**
 * Skeleton for a vendor card in gallery view
 */
export function SkeletonVendorCard() {
  return `
    <div class="glass-card overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-4 p-6 border-b border-glass-border">
        <div class="${shimmer} w-16 h-16 rounded-2xl"></div>
        <div class="flex-1 space-y-2">
          <div class="${shimmer} h-6 w-3/4"></div>
          <div class="${shimmer} h-4 w-1/2"></div>
        </div>
        <div class="${shimmer} h-10 w-20 rounded-xl"></div>
      </div>
      <!-- Image area -->
      <div class="${shimmer} w-full h-80 rounded-none"></div>
      <!-- Content -->
      <div class="p-6 space-y-4">
        <div class="${shimmer} h-4 w-full"></div>
        <div class="${shimmer} h-4 w-5/6"></div>
        <div class="flex gap-3 pt-4">
          <div class="${shimmer} h-10 w-24 rounded-xl"></div>
          <div class="${shimmer} h-10 w-24 rounded-xl"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Skeleton for vendor list row
 */
export function SkeletonVendorRow() {
  return `
    <div class="glass-card p-3">
      <div class="flex items-center gap-4">
        <div class="${shimmer} w-10 h-10"></div>
        <div class="flex-1 space-y-2">
          <div class="${shimmer} h-5 w-1/3"></div>
          <div class="${shimmer} h-3 w-1/4"></div>
        </div>
        <div class="${shimmer} w-5 h-5"></div>
      </div>
    </div>
  `;
}

/**
 * Skeleton for home page hero card
 */
export function SkeletonHomeCard() {
  return `
    <div class="glass-card p-8 mb-8">
      <div class="flex items-center justify-between mb-4">
        <div class="space-y-2">
          <div class="${shimmer} h-6 w-48 rounded"></div>
          <div class="${shimmer} h-4 w-32 rounded"></div>
        </div>
        <div class="${shimmer} h-10 w-24 rounded-xl"></div>
      </div>
      <div class="max-w-xs mx-auto">
        <div class="glass-card overflow-hidden">
          <div class="${shimmer} h-24 w-full"></div>
          <div class="p-4 space-y-3">
            <div class="${shimmer} w-12 h-12 rounded-full -mt-8"></div>
            <div class="${shimmer} h-5 w-2/3 rounded mt-4"></div>
            <div class="${shimmer} h-3 w-1/2 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Skeleton for quick action cards on home page
 */
export function SkeletonQuickActions() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${[1, 2].map(() => `
        <div class="glass-card p-6">
          <div class="${shimmer} w-12 h-12 rounded-full mb-4"></div>
          <div class="${shimmer} h-5 w-1/2 rounded mb-2"></div>
          <div class="${shimmer} h-4 w-3/4 rounded"></div>
        </div>
      `).join("")}
    </div>
  `;
}

/**
 * Skeleton for admin dashboard stats
 */
export function SkeletonStats() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      ${[1, 2, 3, 4].map(() => `
        <div class="glass-card p-6 text-center">
          <div class="${shimmer} w-8 h-8 rounded-full mx-auto mb-3"></div>
          <div class="${shimmer} h-8 w-16 rounded mx-auto mb-2"></div>
          <div class="${shimmer} h-4 w-20 rounded mx-auto"></div>
        </div>
      `).join("")}
    </div>
  `;
}

/**
 * Skeleton for admin table rows
 */
export function SkeletonTableRows(count = 5) {
  return Array(count).fill(0).map(() => `
    <div class="glass-card p-4 mb-3">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 space-y-2">
          <div class="${shimmer} h-5 w-1/3 rounded"></div>
          <div class="${shimmer} h-4 w-1/2 rounded"></div>
          <div class="flex gap-4 mt-2">
            <div class="${shimmer} h-3 w-20 rounded"></div>
            <div class="${shimmer} h-3 w-24 rounded"></div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="${shimmer} h-8 w-24 rounded"></div>
          <div class="${shimmer} h-8 w-24 rounded"></div>
        </div>
      </div>
    </div>
  `).join("");
}

/**
 * Skeleton for attendee/business card
 */
export function SkeletonBusinessCard() {
  return `
    <div class="glass-card overflow-hidden max-w-md mx-auto">
      <div class="${shimmer} h-40 w-full"></div>
      <div class="p-6 relative">
        <div class="${shimmer} w-20 h-20 rounded-full absolute -top-10 left-6"></div>
        <div class="mt-12 space-y-3">
          <div class="${shimmer} h-6 w-1/2 rounded"></div>
          <div class="${shimmer} h-4 w-1/3 rounded"></div>
          <div class="${shimmer} h-4 w-full rounded mt-4"></div>
          <div class="${shimmer} h-4 w-5/6 rounded"></div>
          <div class="flex gap-2 mt-4">
            <div class="${shimmer} h-6 w-20 rounded-full"></div>
            <div class="${shimmer} h-6 w-24 rounded-full"></div>
            <div class="${shimmer} h-6 w-16 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Full page loading spinner
 */
export function PageSpinner(message = "Loading...") {
  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh] fade-in">
      <div class="relative">
        <div class="w-16 h-16 border-4 border-white/20 rounded-full"></div>
        <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
      </div>
      <p class="mt-4 text-glass-secondary">${message}</p>
    </div>
  `;
}

/**
 * Inline loading spinner for buttons
 */
export function ButtonSpinner() {
  return `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>`;
}

/**
 * Loading overlay for async actions
 */
export function LoadingOverlay(message = "Please wait...") {
  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="glass-card p-8 text-center">
        <div class="relative mx-auto w-12 h-12 mb-4">
          <div class="w-12 h-12 border-4 border-white/20 rounded-full"></div>
          <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
        </div>
        <p class="text-glass">${message}</p>
      </div>
    </div>
  `;
}

/**
 * Empty state with icon and message
 */
export function EmptyState(icon = "folder-open-outline", title = "No data", message = "Nothing to show here yet.", actionText = null, actionId = null) {
  return `
    <div class="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4 shadow-lg">
        <ion-icon name="${icon}" class="text-4xl text-glass-secondary"></ion-icon>
      </div>
      <h3 class="text-lg md:text-xl font-semibold text-glass mb-2">${title}</h3>
      <p class="text-sm text-glass-secondary max-w-sm mb-6">${message}</p>
      ${actionText && actionId ? `
        <button id="${actionId}" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
          ${actionText}
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Empty state for no vendors
 */
export function EmptyVendors(isFiltered = false) {
  if (isFiltered) {
    return `
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
          <ion-icon name="search-outline" class="text-4xl text-amber-400"></ion-icon>
        </div>
        <h3 class="text-lg font-semibold text-glass mb-2">No matches found</h3>
        <p class="text-sm text-glass-secondary max-w-sm">Try adjusting your search or filter to find what you're looking for.</p>
      </div>
    `;
  }
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
        <ion-icon name="storefront-outline" class="text-4xl text-blue-400"></ion-icon>
      </div>
      <h3 class="text-lg font-semibold text-glass mb-2">No vendors yet</h3>
      <p class="text-sm text-glass-secondary max-w-sm">Vendors will appear here once they register for the event.</p>
    </div>
  `;
}

/**
 * Empty state for no leads
 */
export function EmptyLeads() {
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
        <ion-icon name="people-outline" class="text-4xl text-emerald-400"></ion-icon>
      </div>
      <h3 class="text-lg font-semibold text-glass mb-2">No leads yet</h3>
      <p class="text-sm text-glass-secondary max-w-sm mb-6">When attendees share their card with you, they'll appear here.</p>
      <div class="flex items-center gap-2 text-xs text-glass-secondary bg-white/5 px-4 py-2 rounded-full">
        <ion-icon name="bulb-outline" class="text-amber-400"></ion-icon>
        <span>Tip: Share your booth QR code to collect leads</span>
      </div>
    </div>
  `;
}

/**
 * Empty state for saved vendors
 */
export function EmptySavedVendors() {
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
        <ion-icon name="bookmark-outline" class="text-4xl text-pink-400"></ion-icon>
      </div>
      <h3 class="text-lg font-semibold text-glass mb-2">No saved vendors</h3>
      <p class="text-sm text-glass-secondary max-w-sm mb-6">Save vendors you're interested in to quickly find them later.</p>
      <button onclick="window.location.hash='/vendors'" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
        <ion-icon name="storefront-outline" class="mr-2"></ion-icon>
        Browse Vendors
      </button>
    </div>
  `;
}

/**
 * Empty state for no business card
 */
export function EmptyBusinessCard() {
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div class="relative mb-4">
        <div class="w-24 h-16 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-dashed border-white/20 flex items-center justify-center">
          <ion-icon name="add-outline" class="text-2xl text-white/50"></ion-icon>
        </div>
        <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <ion-icon name="sparkles" class="text-white text-xs"></ion-icon>
        </div>
      </div>
      <h3 class="text-lg font-semibold text-glass mb-2">Create Your Business Card</h3>
      <p class="text-sm text-glass-secondary max-w-sm mb-6">Share your info with vendors instantly. Add your photo, interests, and contact details.</p>
      <button onclick="window.location.hash='/my-card'" class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target">
        <ion-icon name="create-outline" class="mr-2"></ion-icon>
        Create My Card
      </button>
    </div>
  `;
}

/**
 * Empty state for sent cards
 */
export function EmptySentCards() {
  return `
    <div class="flex flex-col items-center justify-center py-8 px-4 text-center fade-in">
      <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-3">
        <ion-icon name="paper-plane-outline" class="text-2xl text-cyan-400"></ion-icon>
      </div>
      <h3 class="text-base font-semibold text-glass mb-1">No cards sent</h3>
      <p class="text-xs text-glass-secondary max-w-xs">Visit vendor booths and share your card to connect.</p>
    </div>
  `;
}

/**
 * Empty state for admin sections
 */
export function EmptyAdminSection(section = "items") {
  const configs = {
    vendors: {
      icon: "storefront-outline",
      color: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-400",
      title: "No vendors registered",
      message: "Vendor registrations will appear here."
    },
    users: {
      icon: "people-outline",
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
      title: "No users yet",
      message: "Users will appear here once they sign up."
    },
    payments: {
      icon: "card-outline",
      color: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      title: "No payment records",
      message: "Payment records will appear here."
    },
    booths: {
      icon: "grid-outline",
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      title: "No booths configured",
      message: "Configure booth assignments in this section."
    }
  };
  
  const config = configs[section] || {
    icon: "folder-open-outline",
    color: "from-slate-500/20 to-gray-500/20",
    iconColor: "text-slate-400",
    title: `No ${section}`,
    message: `${section} will appear here.`
  };
  
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center fade-in">
      <div class="w-16 h-16 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-4">
        <ion-icon name="${config.icon}" class="text-2xl ${config.iconColor}"></ion-icon>
      </div>
      <h3 class="text-base font-semibold text-glass mb-1">${config.title}</h3>
      <p class="text-sm text-glass-secondary max-w-xs">${config.message}</p>
    </div>
  `;
}

/**
 * Error state with retry option
 */
export function ErrorState(message = "Something went wrong", retryId = null) {
  return `
    <div class="flex flex-col items-center justify-center py-16 px-4 text-center fade-in">
      <div class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <ion-icon name="warning-outline" class="text-4xl text-red-400"></ion-icon>
      </div>
      <h3 class="text-xl font-semibold text-glass mb-2">Oops!</h3>
      <p class="text-glass-secondary max-w-sm mb-6">${message}</p>
      ${retryId ? `
        <button id="${retryId}" class="glass-button px-6 py-3 rounded-xl font-semibold">
          <ion-icon name="refresh-outline" class="mr-2"></ion-icon>
          Try Again
        </button>
      ` : ''}
    </div>
  `;
}
