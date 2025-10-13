import { getState } from "../store.js";

export default function Vendors(root) {
  const state = getState();
  const initialList = Array.isArray(state.vendors) ? state.vendors : [];
  let currentView = localStorage.getItem("vendors:view") || "gallery"; // 'gallery' | 'list'
  let searchTerm = "";
  let expandedId = null; // for list view inline preview

  const filter = (list) => {
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter(v =>
      (v.name || "").toLowerCase().includes(s) ||
      (v.category || "").toLowerCase().includes(s) ||
      (v.booth || "").toString().toLowerCase().includes(s)
    );
  };

  const ph = (seed, w, h) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
  // People avatar placeholder: pravatar provides consistent faces via the `u` seed
  const peoplePlaceholder = (seed, size = 192) => `https://i.pravatar.cc/${size}?u=${encodeURIComponent(seed || 'vendor')}`;
  const vendorLogo = (v) => (v.logoUrl || (v.profile && v.profile.profileImage) || peoplePlaceholder(v.id, 192));
  const vendorBg = (v) => ((v.profile && v.profile.backgroundImage) || ph(`${v.id}-bg`, 1200, 640));

  const render = (list) => {
    const filtered = filter(list);
    root.innerHTML = `
      <div class="fade-in min-h-screen">
        <div class="max-w-5xl mx-auto px-4 pt-4 pb-28">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex-1 relative">
              <ion-icon name="search-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-glass-secondary"></ion-icon>
              <input id="vendorSearch" type="text" placeholder="Search vendors, categories, booth…" class="w-full pl-10 pr-3 py-2 rounded-lg border border-white/15 bg-white/10 text-glass placeholder:text-glass-secondary">
            </div>
            <div class="flex items-center gap-2">
              <button id="listViewBtn" class="glass-button px-3 py-2 ${currentView==='list' ? 'brand-bg' : ''}">
                <ion-icon name="reorder-three-outline"></ion-icon>
              </button>
              <button id="galleryViewBtn" class="glass-button px-3 py-2 ${currentView==='gallery' ? 'brand-bg' : ''}">
                <ion-icon name="grid-outline"></ion-icon>
              </button>
            </div>
          </div>
          ${currentView === 'list' ? renderList(filtered) : renderGallery(filtered)}
        </div>
      </div>
    `;
    // Wire controls
    const searchEl = root.querySelector('#vendorSearch');
    if (searchEl) {
      searchEl.value = searchTerm;
      searchEl.oninput = () => { searchTerm = searchEl.value || ""; render(list); };
    }
    root.querySelector('#listViewBtn').onclick = () => { currentView = 'list'; localStorage.setItem('vendors:view','list'); render(list); };
    root.querySelector('#galleryViewBtn').onclick = () => { currentView = 'gallery'; localStorage.setItem('vendors:view','gallery'); render(list); };
    if (currentView === 'gallery') {
      root.querySelectorAll('.vendor-card').forEach(card => {
        card.onclick = () => window.location.hash = `/vendor/${card.dataset.id}`;
      });
    } else {
      // list behavior: smooth toggle preview instead of navigate
      root.querySelectorAll('.vendor-row').forEach(row => {
        row.onclick = async (e) => {
          const id = row.dataset.id;
          if (expandedId === id) {
            await collapsePreview(row);
            expandedId = null;
            return;
          }
          // collapse any open
          const open = root.querySelector('.list-preview[list-open="true"]');
          if (open) {
            await collapsePreview(open.closest('.glass-card')?.querySelector('.vendor-row') || open.parentElement.previousElementSibling);
          }
          const vendor = (list || []).find(v => v.id === id);
          if (vendor) {
            await expandPreview(row, vendor);
            expandedId = id;
          }
        };
      });
    }
    root.querySelectorAll('.play-video').forEach(btn => {
      btn.onclick = (e) => {
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, '_blank');
      };
    });
    root.querySelectorAll('.social-link').forEach(btn => {
      btn.onclick = (e) => {
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, '_blank');
      };
    });
  };

  const renderList = (list) => {
    if (!list.length) return `<div class="text-center text-glass-secondary py-12">No vendors found.</div>`;
    return `
      <div class="grid gap-3">
        ${list.map(v => `
          <div class="glass-card">
            <div class="flex items-center gap-4 p-3 cursor-pointer vendor-row" data-id="${v.id}">
              <img src="${vendorLogo(v)}" class="w-10 h-10 rounded object-cover" onerror="this.onerror=null; this.src='./assets/splash.svg'">
              <div class="flex-1">
                <div class="font-semibold">${v.name}</div>
                <div class="text-xs text-glass-secondary">${v.category} ${v.booth ? `• Booth ${v.booth}` : ''}</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="text-glass-secondary"></ion-icon>
            </div>
            <div class="list-preview" data-id="${v.id}" style="height:0; overflow:hidden; opacity:0; transition: height 200ms ease, opacity 200ms ease;"></div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderGallery = (list) => {
    if (!list.length) return `<div class="text-center text-glass-secondary py-12">No vendors found.</div>`;
    return `
      <div class="space-y-10">
        ${list.map(v => renderVendorCard(v)).join('')}
      </div>
    `;
  };

  const renderVendorCard = (vendor) => {
    const profile = vendor.profile || {};
    const selectedSocials = profile.selectedSocials || [];
    return `
      <div class="glass-card overflow-hidden slide-up border border-white/15 shadow-glass">
        <div class="flex items-center gap-4 p-6 border-b border-white/20">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
            <img src="${vendorLogo(vendor)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='./assets/splash.svg'">
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-glass">${vendor.name}</h3>
            <p class="text-glass-secondary">${vendor.category} ${vendor.booth ? `• Booth ${vendor.booth}` : ''}</p>
          </div>
          <button class="brand-bg px-6 py-3 rounded-xl font-semibold" onclick="window.location.hash='/vendor/${vendor.id}'">Visit</button>
        </div>
        <div class="relative">
          <img src="${vendorBg(vendor)}" class="w-full h-80 object-cover" onerror="this.style.display='none'">
          ${profile.homeShowVideo ? `
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <button class="play-video w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 flex items-center justify-center hover:scale-110 transition-transform duration-300" data-url="${profile.homeShowVideo}">
                <ion-icon name="play" class="text-white text-2xl ml-1"></ion-icon>
              </button>
            </div>
          ` : ''}
        </div>
        <div class="p-6">
          ${profile.description ? `<p class=\"text-glass-secondary mb-4 leading-relaxed\">${profile.description}</p>` : ''}
          ${profile.specialOffer ? `
            <div class="glass-card p-4 mb-4 border border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-orange-400/10">
              <div class="flex items-center gap-2 mb-2">
                <ion-icon name="star" class="text-yellow-400"></ion-icon>
                <span class="font-semibold text-glass">Special Offer</span>
              </div>
              <p class="text-glass-secondary text-sm">${profile.specialOffer}</p>
            </div>
          ` : ''}
          ${profile.businessCardFront ? `
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-3">
                <ion-icon name="card-outline" class="text-blue-400"></ion-icon>
                <span class="font-semibold text-glass">Business Card</span>
              </div>
              <div class="flex gap-4 overflow-x-auto">
                <img src="${profile.businessCardFront}" class="w-40 h-24 object-cover rounded-lg border border-white/20" onerror="this.style.display='none'">
                ${profile.businessCardBack ? `<img src="${profile.businessCardBack}" class="w-40 h-24 object-cover rounded-lg border border-white/20" onerror="this.style.display='none'">` : ''}
              </div>
            </div>
          ` : ''}
          ${selectedSocials.length ? `
            <div class="grid grid-cols-4 gap-3 mb-4">
              ${selectedSocials.map(s => `
                <button class="social-link glass-button p-3 text-center hover:bg-white/25 transition-colors" data-url="${profile[s] || '#'}">
                  <ion-icon name="logo-${s}" class="text-2xl text-white mb-1"></ion-icon>
                  <div class="text-xs text-glass-secondary capitalize">${s}</div>
                </button>
              `).join('')}
            </div>
          ` : ''}
          <div class="flex items-center justify-between pt-5 mt-2 border-t border-white/15">
            <div class="flex gap-4">
              <button class="glass-button px-4 py-2 flex items-center gap-2" onclick="window.location.hash='/share-card/${vendor.id}'">
                <ion-icon name="share-outline"></ion-icon>
                Share
              </button>
              <button class="glass-button px-4 py-2 flex items-center gap-2" onclick="saveListing('${vendor.id}')">
                <ion-icon name="bookmark-outline"></ion-icon>
                Save
              </button>
            </div>
            <div class="text-glass-secondary text-sm">${vendor.contactEmail || ''}</div>
          </div>
        </div>
      </div>
    `;
  };

  const renderListPreview = (vendor) => {
    const profile = vendor.profile || {};
    const selectedSocials = profile.selectedSocials || [];
    const hasMedia = profile.backgroundImage || profile.homeShowVideo;
    return `
      <div class="border-t border-white/10 preview-inner">
        <div class="relative">
          <img src="${vendorBg(vendor)}" class="w-full h-56 object-cover" onerror="this.style.display='none'">
          ${profile.homeShowVideo ? `
            <div class="absolute inset-0 flex items-center justify-center">
              <button class="play-video w-14 h-14 rounded-full bg-black/50 flex items-center justify-center" data-url="${profile.homeShowVideo}">
                <ion-icon name="play" class="text-white text-2xl ml-1"></ion-icon>
              </button>
            </div>
          ` : ''}
        </div>
        <div class="p-4">
          ${profile.description ? `<p class=\"text-glass-secondary text-sm mb-3\">${profile.description}</p>` : ''}
          ${profile.specialOffer ? `
            <div class="glass-card p-3 mb-3 border border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-orange-400/10">
              <div class="flex items-center gap-2 mb-1">
                <ion-icon name="star" class="text-yellow-400"></ion-icon>
                <span class="font-semibold text-glass text-sm">Special Offer</span>
              </div>
              <p class="text-glass-secondary text-xs">${profile.specialOffer}</p>
            </div>
          ` : ''}
          ${selectedSocials.length ? `
            <div class="flex flex-wrap gap-2 mb-3">
              ${selectedSocials.slice(0,4).map(s => `
                <button class="social-link glass-button px-2 py-1 text-xs" data-url="${profile[s] || '#'}">
                  <ion-icon name="logo-${s}" class="text-white mr-1"></ion-icon>
                  <span class="capitalize">${s}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
          <div class="flex items-center justify-between">
            <div class="text-xs text-glass-secondary">${vendor.contactEmail || ''}</div>
            <div class="flex gap-2">
              <button class="glass-button px-3 py-1 text-sm share-vendor" data-id="${vendor.id}">
                <ion-icon name="share-outline"></ion-icon>
              </button>
              <button class="glass-button px-3 py-1 text-sm save-vendor" data-id="${vendor.id}">
                <ion-icon name="bookmark-outline"></ion-icon>
              </button>
              <button class="brand-bg px-3 py-1 text-sm visit-vendor" data-id="${vendor.id}">Visit</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  async function expandPreview(row, vendor) {
    const container = row.nextElementSibling;
    if (!container || !container.classList.contains('list-preview')) return;
    // Inject content
    container.innerHTML = renderListPreview(vendor);
    // Wire dynamic buttons
    wirePreviewButtons(container, vendor.id);
    const inner = container.querySelector('.preview-inner');
    if (!inner) return;
    container.setAttribute('list-open', 'true');
    // Measure and animate
    container.style.height = '0px';
    container.style.opacity = '0';
    // Force reflow
    void container.offsetHeight;
    const target = inner.scrollHeight;
    container.style.height = target + 'px';
    container.style.opacity = '1';
    await transitionEnd(container);
    container.style.height = 'auto';
    // Update chevron
    const icon = row.querySelector('ion-icon');
    if (icon) icon.setAttribute('name', 'chevron-down-outline');
  }

  async function collapsePreview(row) {
    const container = row ? row.nextElementSibling : null;
    if (!container || !container.classList.contains('list-preview')) return;
    const currentHeight = container.scrollHeight;
    container.style.height = currentHeight + 'px';
    // Force reflow
    void container.offsetHeight;
    container.style.height = '0px';
    container.style.opacity = '0';
    container.removeAttribute('list-open');
    await transitionEnd(container);
    container.innerHTML = '';
    // Update chevron
    const icon = row.querySelector('ion-icon');
    if (icon) icon.setAttribute('name', 'chevron-forward-outline');
  }

  function transitionEnd(el) {
    return new Promise(resolve => {
      const handler = (e) => {
        if (e.target === el) {
          el.removeEventListener('transitionend', handler);
          resolve();
        }
      };
      el.addEventListener('transitionend', handler);
    });
  }

  function wirePreviewButtons(scope, id) {
    const visit = scope.querySelector('.visit-vendor');
    if (visit) visit.onclick = (e) => { e.stopPropagation(); window.location.hash = `/vendor/${id}`; };
    const save = scope.querySelector('.save-vendor');
    if (save) save.onclick = (e) => { e.stopPropagation(); window.saveListing(id); };
    const share = scope.querySelector('.share-vendor');
    if (share) share.onclick = (e) => { e.stopPropagation(); window.location.hash = `/share-card/${id}`; };
    scope.querySelectorAll('.play-video').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, '_blank');
      };
    });
    scope.querySelectorAll('.social-link').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const url = e.currentTarget?.dataset?.url || e.target?.dataset?.url;
        if (url) window.open(url, '_blank');
      };
    });
  }

  // Initial render
  render(initialList);

  // Hydrate with live approved vendors from Firestore if available
  import("../firebase.js").then(async ({ initFirebase, fetchApprovedVendors }) => {
    try { initFirebase(); } catch {}
    try {
      const live = await fetchApprovedVendors();
      if (Array.isArray(live) && live.length) {
        render(live);
      }
    } catch {}
  });
}

// Reuse global saver used by VendorGallery for consistency
window.saveListing = function(vendorId) {
  import("../store.js").then(({ getState, saveVendorForAttendee }) => {
    const state = getState();
    const attendeeId = state.attendees[0]?.id;
    if (attendeeId) {
      saveVendorForAttendee(attendeeId, vendorId);
      import("../utils/ui.js").then(({ Toast }) => { Toast("Vendor saved!"); });
    }
  });
};
