import { getState, upsertAttendee, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

// Local UI state for this module
let cardEditMode; // undefined on first load; we'll decide based on saved data

export default function MyCard(root) {
  console.log("MyCard view loading...");
  const state = getState();
  console.log("Current state:", state);
  console.log("Current role:", state.role);
  const attendee = state.attendees[0];
  const hasSavedCard = !!(attendee && (attendee.name || attendee.card?.profileImage || attendee.card?.backgroundImage || attendee.card?.bio || (attendee.card?.visitingReasons||[]).length));
  if (typeof cardEditMode === 'undefined') {
    cardEditMode = !hasSavedCard; // default to edit if nothing saved; else view mode
  }
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2 text-glass">My Business Card</h1>
        <p class="text-glass-secondary">Create and customize your digital business card</p>
      </div>
      
      ${state.role === "attendee" ? (cardEditMode ? renderAttendeeCardEditor(state) : renderAttendeeCardView(state)) : renderRoleGate(state)}
    </div>
  `;
  
  // Attach form handler if the form exists
  const form = root.querySelector("#cardForm");
  if (form) {
    form.onsubmit = handleFormSubmit;
  }
  // Wire up file upload handlers if present
  if (form) {
    wireCardUploads(root);
    // Initialize live preview
    updateCardPreview(root);
    // Initialize image preview sync for inputs
    wireCardImagePreviews(root);
  }
  // Attach Edit button if present
  const editBtn = root.querySelector('#editCardBtn');
  if (editBtn) {
    editBtn.onclick = () => { cardEditMode = true; MyCard(root); };
  }
}

function renderRoleGate(state) {
  return `
    <div class="glass-card p-8 text-center">
      <div class="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
        <ion-icon name="person-add-outline" class="text-white text-2xl"></ion-icon>
      </div>
      <h3 class="text-xl font-semibold text-glass mb-2">Sign In Required</h3>
      <p class="text-glass-secondary mb-6">You need to sign in as an attendee to create your business card.</p>
      <div class="space-y-3">
        <button onclick="window.location.hash='/role'" class="brand-bg w-full py-3 font-semibold">
          Sign In / Register
        </button>
        <button onclick="window.location.hash='/home'" class="glass-button w-full py-3">
          Back to Home
        </button>
      </div>
    </div>
  `;
}

function renderAttendeeCardEditor(state) {
  let attendee = state.attendees[0];
  
  // If no attendee exists, create a default one
  if (!attendee) {
    const defaultAttendee = {
      id: `attendee_${Date.now()}`,
      name: '',
      email: state.user?.email || '',
      phone: '',
      interests: [],
      shortCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
      savedBusinessCards: [],
      card: {}
    };
    upsertAttendee(defaultAttendee);
    attendee = defaultAttendee;
  }
  
  return `
    <div class="glass-card p-8 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center">
          <ion-icon name="eye-outline" class="text-white text-lg"></ion-icon>
        </div>
        <h3 class="text-xl font-semibold text-glass">Live Preview</h3>
      </div>
      <div id="cardPreview"></div>
    </div>

    <div class="glass-card p-8 slide-up">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-slate-600 to-blue-600 flex items-center justify-center">
          <ion-icon name="person-outline" class="text-white text-lg"></ion-icon>
        </div>
        <h3 class="text-xl font-semibold text-glass">Personal Information</h3>
      </div>

      <form id="cardForm" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Full Name *</label>
            <input name="name" placeholder="Your full name" value="${attendee?.name || ''}" class="w-full" required>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Email *</label>
            <input name="email" type="email" placeholder="your@email.com" value="${attendee?.email || ''}" class="w-full" required>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Phone</label>
            <input name="phone" type="tel" placeholder="+1 (555) 123-4567" value="${attendee?.phone || ''}" class="w-full">
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Profile Image</label>
            <div class="flex gap-2 items-center">
              <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full">
              <label class="glass-button px-3 py-2 cursor-pointer inline-flex items-center gap-2">
                <span class="upload-label-text">Upload</span>
                <input type="file" accept="image/*" class="hidden" id="uploadProfileImage">
              </label>
            </div>
            <div class="text-xs text-glass-secondary">Paste a URL or upload a file from your device.</div>
            <div class="flex items-center gap-3 mt-2">
              <img id="previewProfileImage" src="${attendee?.card?.profileImage || ''}" class="w-12 h-12 rounded object-cover border border-white/20" style="display:${attendee?.card?.profileImage ? 'block' : 'none'}">
              <a id="linkProfileImage" href="${attendee?.card?.profileImage || '#'}" target="_blank" class="text-xs text-primary break-all" style="display:${attendee?.card?.profileImage ? 'inline' : 'none'}">${attendee?.card?.profileImage || ''}</a>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-glass">Background Image</label>
          <div class="flex gap-2 items-center">
            <input name="backgroundImage" placeholder="https://your-background.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full">
            <label class="glass-button px-3 py-2 cursor-pointer inline-flex items-center gap-2">
              <span class="upload-label-text">Upload</span>
              <input type="file" accept="image/*" class="hidden" id="uploadBackgroundImage">
            </label>
          </div>
          <div class="text-xs text-glass-secondary">Paste a URL or upload a file from your device.</div>
          <div class="flex items-center gap-3 mt-2">
            <img id="previewBackgroundImage" src="${attendee?.card?.backgroundImage || ''}" class="w-24 h-16 rounded object-cover border border-white/20" style="display:${attendee?.card?.backgroundImage ? 'block' : 'none'}">
            <a id="linkBackgroundImage" href="${attendee?.card?.backgroundImage || '#'}" target="_blank" class="text-xs text-primary break-all" style="display:${attendee?.card?.backgroundImage ? 'inline' : 'none'}">${attendee?.card?.backgroundImage || ''}</a>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Family Size</label>
            <select name="familySize" class="w-full">
              <option value="1" ${(attendee?.card?.familySize || 1) == 1 ? 'selected' : ''}>1 person</option>
              <option value="2" ${(attendee?.card?.familySize || 1) == 2 ? 'selected' : ''}>2 people</option>
              <option value="3" ${(attendee?.card?.familySize || 1) == 3 ? 'selected' : ''}>3 people</option>
              <option value="4" ${(attendee?.card?.familySize || 1) == 4 ? 'selected' : ''}>4 people</option>
              <option value="5" ${(attendee?.card?.familySize || 1) == 5 ? 'selected' : ''}>5+ people</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Location</label>
            <input name="location" placeholder="City, State" value="${attendee?.card?.location || ''}" class="w-full">
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-glass">Bio / About Me</label>
          <textarea name="bio" placeholder="Tell vendors about yourself and what you're looking for..." rows="3" class="w-full">${attendee?.card?.bio || ''}</textarea>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-glass">What are you visiting for? (comma-separated)</label>
          <input name="visitingReasons" placeholder="Kitchen remodel, Solar panels, New flooring..." value="${(attendee?.card?.visitingReasons || []).join(', ')}" class="w-full">
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-slate-700 flex items-center justify-center">
              <ion-icon name="heart-outline" class="text-white text-sm"></ion-icon>
            </div>
            <h4 class="text-lg font-medium text-glass">My Interests</h4>
          </div>
          <div class="flex flex-wrap gap-3">
            ${["Kitchen","Bath","Landscaping","Windows","Solar","Roofing","Flooring","HVAC","Painting"].map(i => `
              <label class='glass-button flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/20 transition-all duration-200'>
                <input type='checkbox' name='interests' value='${i}' ${(attendee?.interests || []).includes(i) ? 'checked' : ''} class='w-4 h-4 text-blue-500 rounded border-white/30 bg-white/10 focus:ring-blue-500/50'> 
                <span class="text-sm text-glass">${i}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="pt-6 border-t border-white/20">
          <button type="submit" class="brand-bg w-full py-4 text-lg font-semibold flex items-center justify-center gap-3 group">
            <ion-icon name="save-outline" class="text-xl group-hover:scale-110 transition-transform"></ion-icon>
            Save My Business Card
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderAttendeeCardView(state) {
  const attendee = state.attendees[0] || { card: {} };
  return `
    ${renderAttendeeCard(attendee)}
    <div class="mt-6 text-center">
      <button id="editCardBtn" class="glass-button px-6 py-3 text-glass font-medium">
        <ion-icon name="create-outline" class="mr-2"></ion-icon>
        Edit Business Card
      </button>
    </div>
  `;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  console.log("Form submitted");
  
  const fd = new FormData(e.target);
  const visitingReasonsText = fd.get("visitingReasons") || "";
  const visitingReasons = visitingReasonsText.split(',').map(r => r.trim()).filter(r => r);
  
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    zip: fd.get("zip"),
    interests: fd.getAll("interests"),
    card: {
      profileImage: fd.get("profileImage"),
      backgroundImage: fd.get("backgroundImage"),
      familySize: parseInt(fd.get("familySize")) || 1,
      location: fd.get("location"),
      bio: fd.get("bio"),
      visitingReasons: visitingReasons
    }
  };
  
  console.log("Saving payload:", payload);
  
  try {
    const saved = await upsertAttendee(payload);
    if (!saved) return; // likely auth prompt
    Toast("Business card saved successfully!");
    // Switch to view mode and re-render without reloading
    const root = document.getElementById('app');
    cardEditMode = false;
    if (root) {
      MyCard(root);
    }
    
  } catch (error) {
    console.error("Error saving card:", error);
    Toast("Failed to save business card. Please try again.");
  }
}

function renderAttendeeCard(attendee, compact = false) {
  
  const card = attendee.card;
  return `
    <div class="glass-card overflow-hidden mb-8 max-w-md mx-auto shadow-glass floating">
      ${card.backgroundImage ? `
        <div class="h-40 bg-cover bg-center relative" style="background-image: url('${card.backgroundImage}')">
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
      ` : `<div class="h-40 bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900"></div>`}
      
      <div class="p-6 relative">
        ${card.profileImage ? `
          <img src="${card.profileImage}" class="w-20 h-20 rounded-full border-4 border-white/50 absolute -top-10 left-6 backdrop-blur-sm bg-white/20" onerror="this.style.display='none'">
        ` : `
          <div class="w-20 h-20 rounded-full border-4 border-white/50 absolute -top-10 left-6 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
            <span class="text-white font-bold text-xl">${attendee.name?.charAt(0) || 'A'}</span>
          </div>
        `}
        
        <div class="mt-12">
          <div class="font-bold text-xl text-glass mb-1">${attendee.name}</div>
          ${card.location ? `<div class="text-sm text-glass-secondary mb-2 flex items-center gap-1">
            <ion-icon name="location-outline" class="text-xs"></ion-icon>${card.location}
          </div>` : ""}
          ${card.familySize ? `<div class="text-sm text-glass-secondary mb-3 flex items-center gap-1">
            <ion-icon name="people-outline" class="text-xs"></ion-icon>Family of ${card.familySize}
          </div>` : ""}
          
          ${card.bio && !compact ? `<div class="text-sm text-glass-secondary mb-4 leading-relaxed">${card.bio}</div>` : ""}
          
          ${card.visitingReasons?.length ? `
            <div class="mb-4">
              <div class="text-xs text-glass-secondary mb-2 font-medium">Here for:</div>
              <div class="flex flex-wrap gap-2">
                ${card.visitingReasons.slice(0, compact ? 2 : 6).map(reason => `
                  <span class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium border border-white/20">${reason}</span>
                `).join("")}
                ${compact && card.visitingReasons.length > 2 ? `<span class="text-xs text-glass-secondary">+${card.visitingReasons.length - 2} more</span>` : ""}
              </div>
            </div>
          ` : ""}
          
          ${!compact ? `
            <div class="flex flex-col gap-2 pt-4 border-t border-white/20">
              <div class="flex items-center gap-2 text-sm text-glass-secondary">
                <ion-icon name="mail-outline" class="text-sm"></ion-icon>
                <span>${attendee.email}</span>
              </div>
              ${attendee.phone ? `
                <div class="flex items-center gap-2 text-sm text-glass-secondary">
                  <ion-icon name="call-outline" class="text-sm"></ion-icon>
                  <span>${attendee.phone}</span>
                </div>
              ` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

function wireCardUploads(root) {
  import('../firebase.js').then(({ uploadImage }) => {
    const profileFile = root.querySelector('#uploadProfileImage');
    const backgroundFile = root.querySelector('#uploadBackgroundImage');
    const profileInput = root.querySelector('input[name="profileImage"]');
    const bgInput = root.querySelector('input[name="backgroundImage"]');
    const withProgress = (btnEl) => (pct) => {
      if (!btnEl) return;
      const span = btnEl.querySelector('.upload-label-text');
      if (!span) return;
      span.textContent = pct >= 100 ? 'Processing…' : `Uploading ${pct}%`;
      if (pct >= 100) setTimeout(()=>{ span.textContent='Upload'; }, 800);
    };
    if (profileFile) profileFile.onchange = async () => {
      const file = profileFile.files?.[0]; if (!file) return;
      const btn = profileFile.closest('label');
      try {
        const url = await uploadImage(file, 'attendees', withProgress(btn));
        profileInput.value = url;
        // trigger preview refresh
        profileInput.dispatchEvent(new Event('input', { bubbles: true }));
      } catch {}
    };
    if (backgroundFile) backgroundFile.onchange = async () => {
      const file = backgroundFile.files?.[0]; if (!file) return;
      const btn = backgroundFile.closest('label');
      try {
        const url = await uploadImage(file, 'attendees', withProgress(btn));
        bgInput.value = url;
        // trigger preview refresh
        bgInput.dispatchEvent(new Event('input', { bubbles: true }));
      } catch {}
    };
  });
}

function wireCardImagePreviews(root) {
  const profileInput = root.querySelector('input[name="profileImage"]');
  const bgInput = root.querySelector('input[name="backgroundImage"]');
  const profImg = root.querySelector('#previewProfileImage');
  const profLink = root.querySelector('#linkProfileImage');
  const bgImg = root.querySelector('#previewBackgroundImage');
  const bgLink = root.querySelector('#linkBackgroundImage');
  const sync = (input, imgEl, linkEl) => {
    if (!input || !imgEl || !linkEl) return;
    const url = (input.value || '').trim();
    if (url) {
      imgEl.src = url;
      imgEl.style.display = 'block';
      linkEl.href = url;
      linkEl.textContent = url;
      linkEl.style.display = 'inline';
    } else {
      imgEl.style.display = 'none';
      linkEl.style.display = 'none';
    }
  };
  if (profileInput) profileInput.addEventListener('input', () => sync(profileInput, profImg, profLink));
  if (bgInput) bgInput.addEventListener('input', () => sync(bgInput, bgImg, bgLink));
  // Initial
  sync(profileInput, profImg, profLink);
  sync(bgInput, bgImg, bgLink);
}

function updateCardPreview(root) {
  const previewEl = root.querySelector('#cardPreview');
  const form = root.querySelector('#cardForm');
  if (!previewEl || !form) return;
  const fd = new FormData(form);
  const visitingText = (fd.get('visitingReasons') || '').toString();
  const visitingReasons = visitingText.split(',').map(s => s.trim()).filter(Boolean);
  const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value);
  const attendeePreview = {
    name: fd.get('name') || '',
    email: fd.get('email') || '',
    phone: fd.get('phone') || '',
    interests,
    card: {
      profileImage: fd.get('profileImage') || '',
      backgroundImage: fd.get('backgroundImage') || '',
      familySize: parseInt(fd.get('familySize')) || 1,
      location: fd.get('location') || '',
      bio: fd.get('bio') || '',
      visitingReasons
    }
  };
  previewEl.innerHTML = renderAttendeeCard(attendeePreview);
}

// Live preview event wiring
document.addEventListener('input', (e) => {
  const root = document.getElementById('app');
  if (!root) return;
  const cardForm = root.querySelector('#cardForm');
  if (!cardForm) return;
  if (cardForm.contains(e.target)) {
    updateCardPreview(root);
  }
});
document.addEventListener('change', (e) => {
  const root = document.getElementById('app');
  if (!root) return;
  const cardForm = root.querySelector('#cardForm');
  if (!cardForm) return;
  if (cardForm.contains(e.target)) {
    updateCardPreview(root);
  }
});