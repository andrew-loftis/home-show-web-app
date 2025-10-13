import { getState, upsertAttendee, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function MyCard(root) {
  console.log("MyCard view loading...");
  const state = getState();
  console.log("Current state:", state);
  console.log("Current role:", state.role);
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2 text-glass">My Business Card</h1>
        <p class="text-glass-secondary">Create and customize your digital business card</p>
      </div>
      
      <div class="glass-card p-8 mb-6">
        <h3 class="text-xl font-semibold text-glass mb-4">Debug Information</h3>
        <div class="space-y-2 text-sm">
          <div class="text-glass">Role: <span class="font-bold">${state.role || 'No role set'}</span></div>
          <div class="text-glass">User: <span class="font-bold">${state.user ? state.user.email || 'Anonymous' : 'Not signed in'}</span></div>
          <div class="text-glass">Attendees count: <span class="font-bold">${state.attendees ? state.attendees.length : 0}</span></div>
          <div class="text-glass">Has onboarded: <span class="font-bold">${state.hasOnboarded ? 'Yes' : 'No'}</span></div>
        </div>
      </div>
      
      ${state.role === "attendee" ? renderAttendeeCardEditor(state) : renderRoleGate(state)}
    </div>
  `;
  
  // Attach form handler if the form exists
  const form = root.querySelector("#cardForm");
  if (form) {
    form.onsubmit = handleFormSubmit;
  }
  // Wire up file upload handlers if present
  wireCardUploads(root);
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
    ${attendee?.card?.name ? renderAttendeeCard(attendee) : ""}
    
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
                <div class="flex gap-2">
                  <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full">
                  <label class="glass-button px-3 py-2 cursor-pointer">
                    Upload
                    <input type="file" accept="image/*" class="hidden" id="uploadProfileImage">
                  </label>
                </div>
                <div class="text-xs text-glass-secondary">Paste a URL or upload a file from your device.</div>
          </div>
        </div>
        
                <label class="block text-sm font-medium text-glass">Background Image</label>
                <div class="flex gap-2">
                  <input name="backgroundImage" placeholder="https://your-background.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full">
                  <label class="glass-button px-3 py-2 cursor-pointer">
                    Upload
                    <input type="file" accept="image/*" class="hidden" id="uploadBackgroundImage">
                  </label>
                </div>
                <div class="text-xs text-glass-secondary">Paste a URL or upload a file from your device.</div>
            <label class="block text-sm font-medium text-glass">Profile Image URL</label>
            <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full">
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-glass">Background Image URL</label>
            <input name="backgroundImage" placeholder="https://your-background.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full">
          </div>
            // Wire uploads
            wireCardUploads(root);
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
    
    ${attendee?.card?.name ? `
      <div class="mt-8 text-center">
        <button class="glass-button px-6 py-3 text-glass font-medium" onclick="window.location.hash='/saved-vendors'">
          <ion-icon name="bookmark-outline" class="mr-2"></ion-icon>
          View My Saved Vendors
        </button>
      </div>
    ` : ""}
  `;
}

function handleFormSubmit(e) {
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
    upsertAttendee(payload);
    Toast("Business card saved successfully!");
    
    // Refresh the view to show the updated card
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error("Error saving card:", error);
    Toast("Failed to save business card. Please try again.");
  }
}

function renderAttendeeCard(attendee, compact = false) {
  if (!attendee.card || !attendee.card.name) return "";
  
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
      } catch {}
    };
    if (backgroundFile) backgroundFile.onchange = async () => {
      const file = backgroundFile.files?.[0]; if (!file) return;
      const btn = backgroundFile.closest('label');
      try {
        const url = await uploadImage(file, 'attendees', withProgress(btn));
        bgInput.value = url;
      } catch {}
    };
  });
}