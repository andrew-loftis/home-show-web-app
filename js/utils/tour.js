/**
 * Beautiful App Tour System
 * An immersive, step-by-step guided tour experience
 */

import { hasSeenWalkthrough, setWalkthroughSeen } from '../store.js';

// Tour configuration for different user roles
export const TOUR_CONFIGS = {
  general: {
    title: 'Welcome to WinnPro!',
    subtitle: 'Your Digital Trade Show Companion',
    steps: [
      {
        title: 'Welcome! 👋',
        description: 'WinnPro makes attending trade shows easy. Create your digital business card, discover vendors, and make connections that matter.',
        icon: 'sparkles',
        gradient: 'from-blue-500 to-purple-500'
      },
      {
        title: 'Create Your Card',
        description: 'Design a beautiful digital business card. Add your photo, interests, and contact info. Share it with vendors instantly!',
        icon: 'card',
        gradient: 'from-purple-500 to-pink-500'
      },
      {
        title: 'Discover Vendors',
        description: 'Browse all exhibitors in one place. Save your favorites, view booth locations, and learn about their products and services.',
        icon: 'storefront',
        gradient: 'from-emerald-500 to-teal-500'
      },
      {
        title: 'Navigate the Venue',
        description: 'Use the interactive map to find booths and navigate the show floor. Never miss a vendor you want to visit!',
        icon: 'map',
        gradient: 'from-orange-500 to-amber-500'
      },
      {
        title: 'Connect & Share',
        description: 'Share your card with a QR code or link. Vendors can capture your info, and you\'ll both stay connected.',
        icon: 'share-social',
        gradient: 'from-cyan-500 to-blue-500'
      }
    ]
  },
  attendee: {
    title: 'Attendee Guide',
    subtitle: 'Get the Most from Your Visit',
    steps: [
      {
        title: 'Your Digital Card',
        description: 'Create a stunning digital business card that makes sharing your info a breeze. Vendors can scan it to save your details.',
        icon: 'person-circle',
        gradient: 'from-blue-500 to-indigo-500'
      },
      {
        title: 'Browse Exhibitors',
        description: 'Explore all vendors at the show. Filter by category, save favorites, and plan your route through the venue.',
        icon: 'storefront',
        gradient: 'from-green-500 to-emerald-500'
      },
      {
        title: 'Save Your Favorites',
        description: 'Heart the vendors you love! Access them anytime from your saved list and never lose track of who impressed you.',
        icon: 'heart',
        gradient: 'from-pink-500 to-rose-500'
      },
      {
        title: 'Floor Plan',
        description: 'The interactive map shows booth locations color-coded by category. Tap any booth to see details.',
        icon: 'map',
        gradient: 'from-amber-500 to-orange-500'
      },
      {
        title: 'Profile & Settings',
        description: 'Update your info, switch themes, and manage your account from the Profile tab.',
        icon: 'settings',
        gradient: 'from-slate-500 to-gray-600'
      }
    ]
  },
  vendor: {
    title: 'Vendor Guide',
    subtitle: 'Capture Leads & Grow Your Business',
    steps: [
      {
        title: 'Your Dashboard',
        description: 'See your booth performance at a glance. Track leads, views, and engagement in real-time.',
        icon: 'stats-chart',
        gradient: 'from-emerald-500 to-teal-500'
      },
      {
        title: 'Capture Leads',
        description: 'When attendees share their card with you, their info is automatically saved. No more paper forms or lost contacts!',
        icon: 'people',
        gradient: 'from-blue-500 to-cyan-500'
      },
      {
        title: 'Your Profile',
        description: 'Make your vendor profile stand out. Add photos, descriptions, and contact info so attendees can learn about your business.',
        icon: 'business',
        gradient: 'from-purple-500 to-violet-500'
      },
      {
        title: 'Manage Leads',
        description: 'View all captured leads, add notes, and mark follow-up status. Export your leads for your CRM.',
        icon: 'clipboard',
        gradient: 'from-orange-500 to-red-500'
      },
      {
        title: 'Booth Location',
        description: 'Your booth appears on the interactive map. Attendees can easily find you and learn about your category.',
        icon: 'location',
        gradient: 'from-pink-500 to-rose-500'
      }
    ]
  },
  admin: {
    title: 'Admin Guide',
    subtitle: 'Manage Your Event Like a Pro',
    steps: [
      {
        title: 'Dashboard Overview',
        description: 'See all event metrics at a glance: vendors, attendees, revenue, and booth occupancy.',
        icon: 'speedometer',
        gradient: 'from-amber-500 to-orange-500'
      },
      {
        title: 'Vendor Management',
        description: 'Review applications, approve vendors, manage booth assignments, and handle payments.',
        icon: 'storefront',
        gradient: 'from-green-500 to-emerald-500'
      },
      {
        title: 'User Management',
        description: 'View all attendees and vendors. Manage roles, reset accounts, and handle support requests.',
        icon: 'people',
        gradient: 'from-blue-500 to-indigo-500'
      },
      {
        title: 'Booth Layout',
        description: 'Configure booth inventory, pricing, and availability. Generate booth stock for your venue.',
        icon: 'grid',
        gradient: 'from-purple-500 to-violet-500'
      },
      {
        title: 'Ads & Promotions',
        description: 'Create popup ads to promote sponsors, announce events, or share important information.',
        icon: 'megaphone',
        gradient: 'from-pink-500 to-rose-500'
      }
    ]
  }
};

// State
let currentTour = null;
let currentStep = 0;

/**
 * Check if tour should be shown
 */
export function shouldShowTour(key = 'general') {
  return !hasSeenWalkthrough(key);
}

/**
 * Mark tour as complete
 */
export function markTourComplete(key = 'general') {
  setWalkthroughSeen(key, true);
}

/**
 * Legacy maybeRunTour for backwards compatibility
 */
export function maybeRunTour(key = 'general', runner) {
  // Redirect to the new beautiful tour
  startTour(key);
}

/**
 * Start the beautiful tour experience
 */
export function startTour(roleKey = 'general') {
  const config = TOUR_CONFIGS[roleKey] || TOUR_CONFIGS.general;
  currentTour = config;
  currentStep = 0;
  
  // Inject styles if not already present
  if (!document.getElementById('tour-styles')) {
    injectTourStyles();
  }
  
  renderTourOverlay();
}

/**
 * Render the tour overlay
 */
function renderTourOverlay() {
  // Remove any existing tour overlay
  const existing = document.getElementById('tour-overlay');
  if (existing) existing.remove();
  
  const config = currentTour;
  const step = config.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === config.steps.length - 1;
  const progress = ((currentStep + 1) / config.steps.length) * 100;
  
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center';
  
  overlay.innerHTML = `
    <!-- Backdrop with blur -->
    <div class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
    
    <!-- Animated background shapes -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 -left-20 w-72 h-72 bg-gradient-to-br ${step.gradient} rounded-full opacity-20 blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-br ${step.gradient} rounded-full opacity-15 blur-3xl animate-pulse" style="animation-delay: 0.5s"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br ${step.gradient} rounded-full opacity-10 blur-3xl"></div>
    </div>
    
    <!-- Tour Content Card -->
    <div class="relative w-full max-w-md mx-4 tour-card-enter">
      <!-- Progress bar -->
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs text-white/60 mb-2">
          <span>${config.title}</span>
          <span>${currentStep + 1} of ${config.steps.length}</span>
        </div>
        <div class="h-1 bg-white/20 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r ${step.gradient} rounded-full transition-all duration-500 ease-out" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <!-- Main Card -->
      <div class="glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <!-- Icon Section -->
        <div class="relative h-48 flex items-center justify-center bg-gradient-to-br ${step.gradient}">
          <div class="absolute inset-0 bg-black/10"></div>
          
          <!-- Floating particles -->
          <div class="absolute inset-0 overflow-hidden">
            <div class="tour-particle" style="left: 10%; animation-delay: 0s;"></div>
            <div class="tour-particle" style="left: 30%; animation-delay: 0.3s;"></div>
            <div class="tour-particle" style="left: 50%; animation-delay: 0.6s;"></div>
            <div class="tour-particle" style="left: 70%; animation-delay: 0.9s;"></div>
            <div class="tour-particle" style="left: 90%; animation-delay: 1.2s;"></div>
          </div>
          
          <!-- Main Icon -->
          <div class="relative z-10 transform hover:scale-110 transition-transform duration-300">
            <div class="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
              <ion-icon name="${step.icon}-outline" class="text-5xl text-white drop-shadow-lg"></ion-icon>
            </div>
          </div>
          
          <!-- Step indicator dots -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            ${config.steps.map((_, i) => `
              <div class="w-2 h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-white scale-125' : 'bg-white/40'}" ${i === currentStep ? 'style="box-shadow: 0 0 10px rgba(255,255,255,0.5)"' : ''}></div>
            `).join('')}
          </div>
        </div>
        
        <!-- Content Section -->
        <div class="p-6 text-center">
          <h2 class="text-2xl font-bold text-glass mb-3">${step.title}</h2>
          <p class="text-glass-secondary leading-relaxed mb-6">${step.description}</p>
          
          <!-- Navigation Buttons -->
          <div class="flex gap-3">
            ${!isFirst ? `
              <button id="tour-prev" class="flex-1 glass-button px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <ion-icon name="arrow-back-outline"></ion-icon>
                Back
              </button>
            ` : `
              <button id="tour-skip" class="flex-1 glass-button px-4 py-3 rounded-xl text-glass-secondary hover:text-glass hover:bg-white/10 transition-all">
                Skip Tour
              </button>
            `}
            
            <button id="tour-next" class="flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-white bg-gradient-to-r ${step.gradient} hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
              ${isLast ? 'Get Started' : 'Next'}
              <ion-icon name="${isLast ? 'checkmark-outline' : 'arrow-forward-outline'}"></ion-icon>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Help text -->
      <p class="text-center text-white/40 text-xs mt-4">
        ${isLast ? 'You can restart this tour anytime from your profile' : 'Swipe or use arrow keys to navigate'}
      </p>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Wire up buttons
  const nextBtn = overlay.querySelector('#tour-next');
  const prevBtn = overlay.querySelector('#tour-prev');
  const skipBtn = overlay.querySelector('#tour-skip');
  
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentStep < currentTour.steps.length - 1) {
        currentStep++;
        animateToNextStep();
      } else {
        completeTour();
      }
    };
  }
  
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentStep > 0) {
        currentStep--;
        animateToPrevStep();
      }
    };
  }
  
  if (skipBtn) {
    skipBtn.onclick = () => {
      closeTour();
    };
  }
  
  // Keyboard navigation
  const keyHandler = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      nextBtn?.click();
    } else if (e.key === 'ArrowLeft') {
      prevBtn?.click();
    } else if (e.key === 'Escape') {
      closeTour();
    }
  };
  document.addEventListener('keydown', keyHandler);
  overlay._keyHandler = keyHandler;
  
  // Touch/swipe support
  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  overlay.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentStep < currentTour.steps.length - 1) {
        currentStep++;
        animateToNextStep();
      } else if (diff < 0 && currentStep > 0) {
        currentStep--;
        animateToPrevStep();
      }
    }
  });
}

/**
 * Animate transition to next step
 */
function animateToNextStep() {
  const card = document.querySelector('.tour-card-enter');
  if (card) {
    card.classList.add('tour-card-exit-left');
    setTimeout(() => {
      renderTourOverlay();
    }, 200);
  } else {
    renderTourOverlay();
  }
}

/**
 * Animate transition to previous step
 */
function animateToPrevStep() {
  const card = document.querySelector('.tour-card-enter');
  if (card) {
    card.classList.add('tour-card-exit-right');
    setTimeout(() => {
      renderTourOverlay();
    }, 200);
  } else {
    renderTourOverlay();
  }
}

/**
 * Complete the tour
 */
function completeTour() {
  // Determine role key from current tour
  let roleKey = 'general';
  for (const [key, config] of Object.entries(TOUR_CONFIGS)) {
    if (config === currentTour) {
      roleKey = key;
      break;
    }
  }
  
  markTourComplete(roleKey);
  closeTour(true);
}

/**
 * Close the tour overlay
 */
function closeTour(completed = false) {
  const overlay = document.getElementById('tour-overlay');
  if (overlay) {
    // Remove keyboard listener
    if (overlay._keyHandler) {
      document.removeEventListener('keydown', overlay._keyHandler);
    }
    
    // Animate out
    overlay.classList.add('tour-fade-out');
    setTimeout(() => {
      overlay.remove();
      
      if (completed) {
        // Show success celebration
        showCompletionCelebration();
      }
    }, 300);
  }
  
  currentTour = null;
  currentStep = 0;
}

/**
 * Show completion celebration
 */
function showCompletionCelebration() {
  // Create celebration overlay
  const celebration = document.createElement('div');
  celebration.className = 'fixed inset-0 z-[100] flex items-center justify-center pointer-events-none';
  celebration.innerHTML = `
    <div class="text-center celebration-enter">
      <div class="text-6xl mb-4">🎉</div>
      <div class="text-2xl font-bold text-white mb-2">You're all set!</div>
      <div class="text-white/70">Enjoy the show</div>
    </div>
  `;
  
  document.body.appendChild(celebration);
  
  // Create confetti effect
  createConfetti();
  
  setTimeout(() => {
    celebration.classList.add('celebration-exit');
    setTimeout(() => celebration.remove(), 500);
  }, 2000);
}

/**
 * Create confetti celebration effect
 */
function createConfetti() {
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];
  const container = document.createElement('div');
  container.className = 'fixed inset-0 z-[99] pointer-events-none overflow-hidden';
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      position: absolute;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
      animation-delay: ${Math.random() * 0.5}s;
      opacity: 0.8;
    `;
    container.appendChild(confetti);
  }
  
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4000);
}

/**
 * Inject tour CSS styles
 */
function injectTourStyles() {
  const tourStyles = document.createElement('style');
  tourStyles.id = 'tour-styles';
  tourStyles.textContent = `
    /* Tour card animations */
    .tour-card-enter {
      animation: tour-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .tour-card-exit-left {
      animation: tour-slide-out-left 0.2s ease-in forwards;
    }
    
    .tour-card-exit-right {
      animation: tour-slide-out-right 0.2s ease-in forwards;
    }
    
    .tour-fade-out {
      animation: tour-fade 0.3s ease-out forwards;
    }
    
    @keyframes tour-slide-in {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes tour-slide-out-left {
      to {
        opacity: 0;
        transform: translateX(-50px) scale(0.95);
      }
    }
    
    @keyframes tour-slide-out-right {
      to {
        opacity: 0;
        transform: translateX(50px) scale(0.95);
      }
    }
    
    @keyframes tour-fade {
      to {
        opacity: 0;
      }
    }
    
    /* Floating particles */
    .tour-particle {
      position: absolute;
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: tour-float 3s ease-in-out infinite;
    }
    
    @keyframes tour-float {
      0%, 100% {
        transform: translateY(100px);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-100px);
        opacity: 0;
      }
    }
    
    /* Celebration animations */
    .celebration-enter {
      animation: celebration-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .celebration-exit {
      animation: celebration-fade 0.5s ease-out forwards;
    }
    
    @keyframes celebration-pop {
      0% {
        opacity: 0;
        transform: scale(0.5);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes celebration-fade {
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
    
    /* Confetti */
    @keyframes confetti-fall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(tourStyles);
}
