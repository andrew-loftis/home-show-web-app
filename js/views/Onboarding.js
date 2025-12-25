import { setOnboarded } from "../store.js";
import { navigate } from "../router.js";

// Onboarding slides configuration
const ONBOARDING_SLIDES = [
  {
    title: 'Welcome to Winn-Pro',
    subtitle: 'Your Trade Show Companion',
    description: 'Connect with vendors, share your info, and make the most of every event.',
    icon: 'sparkles',
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    image: null
  },
  {
    title: 'Digital Business Cards',
    subtitle: 'Share Your Info Instantly',
    description: 'Create a beautiful digital card with your photo, interests, and contact details. Share it with anyone using a QR code.',
    icon: 'card',
    gradient: 'from-purple-500 to-pink-500',
    features: ['Custom photo & background', 'Your interests & bio', 'Instant QR sharing']
  },
  {
    title: 'Discover Vendors',
    subtitle: 'Find What You Need',
    description: 'Browse all exhibitors, save favorites, and navigate to their booths with our interactive floor plan.',
    icon: 'storefront',
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Full vendor directory', 'Save your favorites', 'Interactive booth map']
  },
  {
    title: 'Connect & Follow Up',
    subtitle: 'Never Lose a Contact',
    description: 'Exchange info seamlessly. Vendors capture your details, you save their profiles. Stay connected after the show.',
    icon: 'people',
    gradient: 'from-orange-500 to-amber-500',
    features: ['Lead capture for vendors', 'Saved vendor list', 'Easy follow-ups']
  }
];

export default function Onboarding(root) {
  let currentSlide = 0;
  
  function render() {
    const slide = ONBOARDING_SLIDES[currentSlide];
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
    const progress = ((currentSlide + 1) / ONBOARDING_SLIDES.length) * 100;
    
    root.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden onboarding-container">
        <!-- Animated Background -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute top-0 -left-40 w-96 h-96 bg-gradient-to-br ${slide.gradient} rounded-full opacity-20 blur-3xl animate-pulse"></div>
          <div class="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-gradient-to-br ${slide.gradient} rounded-full opacity-15 blur-3xl animate-pulse" style="animation-delay: 1s"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br ${slide.gradient} rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <!-- Skip button -->
        ${!isLast ? `
          <button id="skipBtn" class="absolute top-6 right-6 text-white/50 hover:text-white text-sm transition-colors z-10">
            Skip
          </button>
        ` : ''}
        
        <!-- Main Content -->
        <div class="relative z-10 w-full max-w-lg mx-auto slide-enter">
          <!-- Progress -->
          <div class="mb-8">
            <div class="flex justify-center gap-2 mb-4">
              ${ONBOARDING_SLIDES.map((_, i) => `
                <div class="h-1 w-8 rounded-full transition-all duration-500 ${i === currentSlide ? `bg-gradient-to-r ${slide.gradient}` : i < currentSlide ? 'bg-white/50' : 'bg-white/20'}"></div>
              `).join('')}
            </div>
          </div>
          
          <!-- Icon/Image Section -->
          <div class="flex justify-center mb-8">
            <div class="relative">
              <!-- Glow effect -->
              <div class="absolute inset-0 bg-gradient-to-br ${slide.gradient} rounded-3xl blur-xl opacity-50 scale-110"></div>
              
              <!-- Icon container -->
              <div class="relative w-32 h-32 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl icon-bounce">
                <ion-icon name="${slide.icon}-outline" class="text-6xl text-white drop-shadow-lg"></ion-icon>
              </div>
              
              <!-- Floating particles -->
              <div class="absolute -top-2 -right-2 w-4 h-4 bg-white/30 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="absolute -bottom-1 -left-3 w-3 h-3 bg-white/20 rounded-full animate-bounce" style="animation-delay: 0.5s"></div>
              <div class="absolute top-1/2 -right-4 w-2 h-2 bg-white/40 rounded-full animate-bounce" style="animation-delay: 0.8s"></div>
            </div>
          </div>
          
          <!-- Text Content -->
          <div class="text-center mb-8 px-4">
            ${slide.subtitle ? `
              <div class="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium mb-3">
                ${slide.subtitle}
              </div>
            ` : ''}
            
            <h1 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              ${slide.title}
            </h1>
            
            <p class="text-lg text-white/70 leading-relaxed max-w-md mx-auto">
              ${slide.description}
            </p>
            
            ${slide.features ? `
              <div class="mt-6 flex flex-wrap justify-center gap-2">
                ${slide.features.map(f => `
                  <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-sm">
                    <ion-icon name="checkmark-circle" class="text-green-400"></ion-icon>
                    ${f}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <!-- Navigation -->
          <div class="flex gap-3 px-4">
            ${!isFirst ? `
              <button id="prevBtn" class="flex-1 glass-button px-6 py-4 rounded-2xl text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <ion-icon name="arrow-back-outline"></ion-icon>
                Back
              </button>
            ` : ''}
            
            <button id="nextBtn" class="flex-1 px-6 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r ${slide.gradient} hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
              ${isLast ? `
                Get Started
                <ion-icon name="arrow-forward-outline"></ion-icon>
              ` : `
                Continue
                <ion-icon name="arrow-forward-outline"></ion-icon>
              `}
            </button>
          </div>
          
          <!-- Terms -->
          ${isLast ? `
            <p class="text-center text-white/40 text-xs mt-6 px-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          ` : ''}
        </div>
      </div>
    `;
    
    // Wire up buttons
    const nextBtn = root.querySelector('#nextBtn');
    const prevBtn = root.querySelector('#prevBtn');
    const skipBtn = root.querySelector('#skipBtn');
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (isLast) {
          completeOnboarding();
        } else {
          currentSlide++;
          animateSlideTransition('next');
        }
      };
    }
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        currentSlide--;
        animateSlideTransition('prev');
      };
    }
    
    if (skipBtn) {
      skipBtn.onclick = () => {
        completeOnboarding();
      };
    }
    
    // Touch/swipe support
    let touchStartX = 0;
    root.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });
    
    root.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0 && !isLast) {
          currentSlide++;
          animateSlideTransition('next');
        } else if (diff < 0 && !isFirst) {
          currentSlide--;
          animateSlideTransition('prev');
        }
      }
    });
    
    // Keyboard navigation
    const keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextBtn?.click();
      } else if (e.key === 'ArrowLeft' && prevBtn) {
        prevBtn.click();
      }
    };
    document.addEventListener('keydown', keyHandler);
    root._keyHandler = keyHandler;
  }
  
  function animateSlideTransition(direction) {
    const slideEl = root.querySelector('.slide-enter');
    if (slideEl) {
      slideEl.classList.add(direction === 'next' ? 'slide-exit-left' : 'slide-exit-right');
      setTimeout(() => {
        render();
      }, 200);
    } else {
      render();
    }
  }
  
  function completeOnboarding() {
    // Clean up keyboard listener
    if (root._keyHandler) {
      document.removeEventListener('keydown', root._keyHandler);
    }
    
    // Add exit animation
    const container = root.querySelector('.onboarding-container');
    if (container) {
      container.classList.add('onboarding-complete');
    }
    
    setTimeout(() => {
      setOnboarded();
      navigate("/home");
    }, 400);
  }
  
  // Inject styles
  if (!document.getElementById('onboarding-styles')) {
    const styles = document.createElement('style');
    styles.id = 'onboarding-styles';
    styles.textContent = `
      .slide-enter {
        animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      
      .slide-exit-left {
        animation: slide-out-left 0.2s ease-in forwards;
      }
      
      .slide-exit-right {
        animation: slide-out-right 0.2s ease-in forwards;
      }
      
      .onboarding-complete {
        animation: onboarding-fade 0.4s ease-out forwards;
      }
      
      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slide-out-left {
        to {
          opacity: 0;
          transform: translateX(-40px);
        }
      }
      
      @keyframes slide-out-right {
        to {
          opacity: 0;
          transform: translateX(40px);
        }
      }
      
      @keyframes onboarding-fade {
        to {
          opacity: 0;
          transform: scale(1.05);
        }
      }
      
      .icon-bounce {
        animation: icon-float 3s ease-in-out infinite;
      }
      
      @keyframes icon-float {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  render();
}
