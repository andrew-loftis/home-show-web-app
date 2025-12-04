/**
 * Image Lazy Loading Utility
 * Uses native lazy loading with IntersectionObserver fallback
 */

/**
 * Create a lazy-loaded image HTML string
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @returns {string} HTML string for lazy image
 */
export function lazyImg(src, alt = '', className = '') {
  if (!src) {
    return '<div class="' + className + ' bg-glass-surface flex items-center justify-center"><ion-icon name="image-outline" class="text-glass-secondary text-2xl"></ion-icon></div>';
  }
  
  return '<img src="' + src + '" alt="' + alt + '" class="' + className + ' lazy-img" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">';
}

/**
 * Create a lazy background image div
 * @param {string} src - Image source URL
 * @param {string} className - CSS classes
 * @param {string} innerContent - Content inside the div
 * @returns {string} HTML string for lazy background
 */
export function lazyBg(src, className = '', innerContent = '') {
  if (!src) {
    return '<div class="' + className + ' bg-gradient-to-br from-slate-700 to-slate-800">' + innerContent + '</div>';
  }
  
  return '<div class="' + className + ' lazy-bg" data-bg="' + src + '" style="background-image: linear-gradient(to bottom right, #334155, #1e293b);">' + innerContent + '</div>';
}

/**
 * Initialize lazy loading for background images
 * Call this after DOM content is added
 * @param {HTMLElement} container - Container to search for lazy elements
 */
export function initLazyBackgrounds(container = document) {
  const lazyBgs = container.querySelectorAll('.lazy-bg[data-bg]');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const bgUrl = el.dataset.bg;
          if (bgUrl) {
            const img = new Image();
            img.onload = () => {
              el.style.backgroundImage = 'url(' + bgUrl + ')';
              el.classList.add('lazy-bg-loaded');
            };
            img.src = bgUrl;
          }
          observer.unobserve(el);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    lazyBgs.forEach(el => observer.observe(el));
  } else {
    lazyBgs.forEach(el => {
      const bgUrl = el.dataset.bg;
      if (bgUrl) {
        el.style.backgroundImage = 'url(' + bgUrl + ')';
        el.classList.add('lazy-bg-loaded');
      }
    });
  }
}

/**
 * Avatar/profile image helper
 * @param {string} src - Image URL
 * @param {string} name - Person's name (for fallback initial)
 * @param {string} size - Tailwind size class (e.g., 'w-12 h-12')
 * @returns {string} HTML string
 */
export function avatarImg(src, name = '', size = 'w-12 h-12') {
  const initial = (name && name.charAt(0)) ? name.charAt(0).toUpperCase() : '?';
  
  if (!src) {
    return '<div class="' + size + ' rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold">' + initial + '</div>';
  }
  
  return '<div class="' + size + ' rounded-full overflow-hidden bg-glass-surface"><img src="' + src + '" alt="' + name + '" class="w-full h-full object-cover lazy-img" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=&quot;w-full h-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold&quot;>' + initial + '</div>\'"></div>';
}

/**
 * Logo/thumbnail image helper  
 * @param {string} src - Image URL
 * @param {string} fallbackIcon - Ionicon name for fallback
 * @param {string} size - Tailwind size class
 * @returns {string} HTML string
 */
export function logoImg(src, fallbackIcon = 'business-outline', size = 'w-10 h-10') {
  if (!src) {
    return '<div class="' + size + ' rounded bg-glass-surface flex items-center justify-center"><ion-icon name="' + fallbackIcon + '" class="text-glass-secondary text-xl"></ion-icon></div>';
  }
  
  return '<img src="' + src + '" alt="" class="' + size + ' rounded object-cover lazy-img" loading="lazy" onerror="this.style.display=\'none\'">';
}

/**
 * Gallery/card image with aspect ratio
 * @param {string} src - Image URL
 * @param {string} className - Additional classes
 * @param {string} aspectClass - Aspect ratio class (e.g., 'aspect-video')
 * @returns {string} HTML string
 */
export function cardImg(src, className = '', aspectClass = 'aspect-video') {
  if (!src) {
    return '<div class="' + aspectClass + ' ' + className + ' bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center"><ion-icon name="image-outline" class="text-glass-secondary text-4xl"></ion-icon></div>';
  }
  
  return '<div class="' + aspectClass + ' ' + className + ' overflow-hidden bg-glass-surface"><img src="' + src + '" alt="" class="w-full h-full object-cover lazy-img" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=&quot;w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800&quot;><ion-icon name=&quot;image-outline&quot; class=&quot;text-glass-secondary text-4xl&quot;></ion-icon></div>\'"></div>';
}

export default {
  lazyImg,
  lazyBg,
  initLazyBackgrounds,
  avatarImg,
  logoImg,
  cardImg
};
