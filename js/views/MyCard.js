// MyCard.js - Digital Business Card Creation and Management
// Last updated: 2026-02-04 12:45 PM
import { getState, upsertAttendee, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function MyCard(root, forceEdit = false) {
  const state = getState();
  
  // Allow any signed-in user to create a card (attendees primarily, but others can too)
  if (state.role === "attendee" || state.role === "vendor" || state.role === "admin") {
    let attendee = state.attendees[0];
    
    // If no attendee exists, create a default one
    if (!attendee) {
      const defaultAttendee = {
        id: `attendee_${Date.now()}`,
        name: '',
        email: '',
        phone: '',
        interests: [],
        shortCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        savedBusinessCards: []
      };
      upsertAttendee(defaultAttendee);
      attendee = defaultAttendee;
    }
    
    // If card already exists and has content, show view-only mode (unless forcing edit)
    const hasCardContent = attendee?.card && (attendee.name || attendee.card.profileImage || attendee.card.bio || attendee.card.location);
    if (!forceEdit && hasCardContent) {
      root.innerHTML = `
        <div class="container-glass fade-in">
          <div class="text-center mb-4">
            <h1 class="text-lg font-bold mb-0.5 text-glass">My Business Card</h1>
            <p class="text-glass-secondary text-xs">Your digital business card</p>
          </div>
          
          ${renderAttendeeCard(attendee)}
          
          <div class="flex gap-2 mt-4">
            <button id="editCardBtn" class="glass-button flex-1 py-2 text-xs text-glass font-medium">
              <ion-icon name="create-outline" class="mr-1"></ion-icon>
              Edit Card
            </button>
            <button class="glass-button flex-1 py-2 text-xs text-glass font-medium" onclick="window.location.hash='/saved-vendors'">
              <ion-icon name="bookmark-outline" class="mr-1"></ion-icon>
              Saved Vendors
            </button>
          </div>
        </div>
      `;
      
      // Add edit button handler
      root.querySelector('#editCardBtn').onclick = () => {
        MyCard(root, true); // Re-render in edit mode with forceEdit = true
        setTimeout(() => {
          const cardForm = root.querySelector('#cardForm');
          if (cardForm) {
            cardForm.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      return; // Exit early to show view-only mode
    }
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center mb-3">
          <h1 class="text-lg font-bold mb-0.5 text-glass">My Business Card</h1>
          <p class="text-glass-secondary text-xs">Create your digital card</p>
        </div>
        
        <div id="cardPreview" class="mb-3">
          ${attendee?.card ? renderAttendeeCard(attendee) : `
            <div class="glass-card overflow-hidden max-w-sm mx-auto">
              <div class="h-20 bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900"></div>
              <div class="p-3 relative">
                <div class="w-10 h-10 rounded-full border-2 border-white/50 absolute -top-5 left-3 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span class="text-white font-bold text-sm">?</span>
                </div>
                <div class="mt-6">
                  <div class="font-bold text-sm text-glass mb-0.5">Your Name</div>
                  <div class="text-[10px] text-glass-secondary">Your bio will appear here...</div>
                </div>
              </div>
            </div>
          `}
        </div>
        
        <div class="glass-card slide-up">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-blue-600 flex items-center justify-center">
              <ion-icon name="person-outline" class="text-white text-sm"></ion-icon>
            </div>
            <h3 class="text-base font-semibold text-glass">Personal Info</h3>
          </div>
          
          <form id="cardForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-glass">Profile Image</label>
                <div class="space-y-2">
                  <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full" placeholder="Image URL (optional)">
                  <div class="flex items-center gap-2">
                    <input type="file" id="profileImageFile" accept="image/*" class="w-full" style="display:none">
                    <button type="button" id="uploadProfileImage" class="glass-button px-3 py-2">
                      <ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon>
                      Upload Image
                    </button>
                    <button type="button" id="editProfileImagePos" class="glass-button px-3 py-2 ${attendee?.card?.profileImage ? '' : 'opacity-50 cursor-not-allowed'}" ${attendee?.card?.profileImage ? '' : 'disabled'}>
                      <ion-icon name="move-outline" class="mr-1"></ion-icon>
                      Edit Position & Zoom
                    </button>
                  </div>
                </div>
                <!-- Hidden controls to persist position and zoom -->
                <input type="hidden" name="profileImageX" value="${typeof attendee?.card?.profileImageX === 'number' ? attendee.card.profileImageX : 50}">
                <input type="hidden" name="profileImageY" value="${typeof attendee?.card?.profileImageY === 'number' ? attendee.card.profileImageY : 50}">
                <input type="hidden" name="profileImageZoom" value="${typeof attendee?.card?.profileImageZoom === 'number' ? attendee.card.profileImageZoom : 100}">
              </div>
              
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Background Image</label>
                <div class="space-y-2">
                  <input name="backgroundImage" placeholder="https://your-background-url.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full" placeholder="Background URL (optional)">
                  <div class="flex items-center gap-2">
                    <input type="file" id="backgroundImageFile" accept="image/*" class="w-full" style="display:none">
                    <button type="button" id="uploadBackgroundImage" class="glass-button px-3 py-2">
                      <ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon>
                      Upload Background
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Full Name *</label>
                <input name="name" required value="${attendee?.name || ''}" placeholder="John Doe" class="w-full">
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Family Size</label>
                <input name="familySize" type="number" min="1" max="10" value="${attendee?.card?.familySize || 1}" class="w-full">
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Email Address *</label>
                <input name="email" required type="email" value="${attendee?.email || ''}" placeholder="john@example.com" class="w-full">
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Phone Number</label>
                <input name="phone" value="${attendee?.phone || ''}" placeholder="(555) 123-4567" class="w-full">
              </div>
            </div>
            
            <div class="space-y-2">
              <label class="block text-sm font-medium text-glass">Location</label>
              <input name="location" placeholder="Nashville, TN" value="${attendee?.card?.location || ''}" class="w-full">
            </div>
            
            <div class="space-y-2">
              <label class="block text-sm font-medium text-glass">About Me</label>
              <textarea name="bio" rows="4" placeholder="Tell vendors about yourself and your home project..." class="w-full resize-none">${attendee?.card?.bio || ''}</textarea>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 flex items-center justify-center">
                  <ion-icon name="home-outline" class="text-white text-sm"></ion-icon>
                </div>
                <h4 class="text-lg font-medium text-glass">Why I'm Here</h4>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${["Building a home","Renovating","Needing new gutters","Floor plans","Kitchen remodel","Bathroom remodel","Solar installation","Roofing repair","HVAC upgrade","Landscaping","Windows replacement","Just browsing"].map(reason => `
                  <label class='glass-button flex items-center gap-3 p-3 cursor-pointer hover:bg-white/20 transition-all duration-200'>
                    <input type='checkbox' name='visitingReasons' value='${reason}' ${(attendee?.card?.visitingReasons || []).includes(reason) ? 'checked' : ''} class='w-4 h-4 text-blue-500 rounded border-white/30 bg-white/10 focus:ring-blue-500/50'> 
                    <span class="text-sm text-glass">${reason}</span>
                  </label>
                `).join("")}
              </div>
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
        
        ${attendee?.card ? `
          <div class="mt-8 text-center">
            <button class="glass-button px-6 py-3 text-glass font-medium" onclick="window.location.hash='/saved-vendors'">
              <ion-icon name="bookmark-outline" class="mr-2"></ion-icon>
              View My Saved Vendors
            </button>
          </div>
        ` : ""}
      </div>
    `;
    
    root.querySelector("#cardForm").onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        interests: fd.getAll("interests"),
        card: {
          profileImage: fd.get("profileImage"),
          profileImageX: parseFloat(fd.get("profileImageX")) || 50,
          profileImageY: parseFloat(fd.get("profileImageY")) || 50,
          profileImageZoom: parseFloat(fd.get("profileImageZoom")) || 100,
          backgroundImage: fd.get("backgroundImage"),
          familySize: parseInt(fd.get("familySize")) || 1,
          visitingReasons: fd.getAll("visitingReasons"),
          bio: fd.get("bio"),
          location: fd.get("location")
        }
      };
      upsertAttendee(payload);
      Toast("Business card saved!");
      
      // Switch to view mode instead of reloading
      setTimeout(() => {
        switchToViewMode();
      }, 800);
    };
    
    // Add edit/view toggle functionality
    function switchToViewMode() {
      const state = getState();
      const attendee = state.attendees[0];
      if (attendee?.card) {
        root.innerHTML = `
          <div class="container-glass fade-in">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold mb-2 text-glass">My Business Card</h1>
              <p class="text-glass-secondary">Your digital business card</p>
            </div>
            
            ${renderAttendeeCard(attendee)}
            
            <div class="text-center mb-8">
              <button id="editCardBtn" class="glass-button px-6 py-3 text-glass font-medium">
                <ion-icon name="create-outline" class="mr-2"></ion-icon>
                Edit Business Card
              </button>
            </div>
            
            <div class="text-center">
              <button class="glass-button px-6 py-3 text-glass font-medium" onclick="window.location.hash='/saved-vendors'">
                <ion-icon name="bookmark-outline" class="mr-2"></ion-icon>
                View My Saved Vendors
              </button>
            </div>
          </div>
        `;
        
        // Add edit button handler
        root.querySelector('#editCardBtn').onclick = () => {
          MyCard(root, true); // Re-render in edit mode
        };
      }
    }

    // Set up image upload handlers
    const setupImageUpload = async () => {
      const { uploadImage } = await import('../firebase.js');
      const { compressProfileImage, compressBackgroundImage } = await import('../utils/imageResize.js');
      const { Toast } = await import('../utils/ui.js');

      // Profile image upload
      const profileUploadBtn = root.querySelector('#uploadProfileImage');
      const profileFileInput = root.querySelector('#profileImageFile');
      const profileImageInput = root.querySelector('input[name="profileImage"]');

      if (profileUploadBtn && profileFileInput) {
        profileUploadBtn.onclick = () => profileFileInput.click();
        profileFileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              profileUploadBtn.disabled = true;
              profileUploadBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Compressing...';
              const compressed = await compressProfileImage(file);
              profileUploadBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Uploading...';
              const url = await uploadImage(compressed, 'attendees', (progress) => {
                profileUploadBtn.innerHTML = `<ion-icon name="hourglass-outline"></ion-icon> ${progress}%`;
              });
              profileImageInput.value = url;
              profileUploadBtn.disabled = false;
              profileUploadBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Uploaded!';
              setTimeout(() => {
                profileUploadBtn.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Image';
              }, 2000);
              Toast('Profile image uploaded successfully!');
              // Trigger live preview update
              const form = root.querySelector('#cardForm');
              if (form) {
                form.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } catch (error) {
              profileUploadBtn.disabled = false;
              profileUploadBtn.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Image';
              Toast('Upload failed: ' + error.message);
            }
          }
        };
      }

      // Background image upload
      const backgroundUploadBtn = root.querySelector('#uploadBackgroundImage');
      const backgroundFileInput = root.querySelector('#backgroundImageFile');
      const backgroundImageInput = root.querySelector('input[name="backgroundImage"]');

      if (backgroundUploadBtn && backgroundFileInput) {
        backgroundUploadBtn.onclick = () => backgroundFileInput.click();
        backgroundFileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              backgroundUploadBtn.disabled = true;
              backgroundUploadBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Compressing...';
              const compressed = await compressBackgroundImage(file);
              backgroundUploadBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Uploading...';
              const url = await uploadImage(compressed, 'attendees', (progress) => {
                backgroundUploadBtn.innerHTML = `<ion-icon name="hourglass-outline"></ion-icon> ${progress}%`;
              });
              backgroundImageInput.value = url;
              backgroundUploadBtn.disabled = false;
              backgroundUploadBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Uploaded!';
              setTimeout(() => {
                backgroundUploadBtn.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Background';
              }, 2000);
              Toast('Background image uploaded successfully!');
              // Trigger live preview update
              const form = root.querySelector('#cardForm');
              if (form) {
                form.dispatchEvent(new Event('input', { bubbles: true }));
              }
            } catch (error) {
              backgroundUploadBtn.disabled = false;
              backgroundUploadBtn.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Background';
              Toast('Upload failed: ' + error.message);
            }
          }
        };
      }
    };
    
    setupImageUpload();
    setupLivePreview(attendee);
    
    // Live preview functionality
    function setupLivePreview(attendee) {
      const form = root.querySelector('#cardForm');
      if (!form) return;

      const updatePreview = () => {
        const fd = new FormData(form);
        const updatedCard = {
          ...attendee,
          name: fd.get("name") || attendee.name,
          email: fd.get("email") || attendee.email,
          phone: fd.get("phone") || attendee.phone,
          interests: fd.getAll("interests"),
          card: {
            profileImage: fd.get("profileImage"),
            profileImageX: parseFloat(fd.get("profileImageX")) || 50,
            profileImageY: parseFloat(fd.get("profileImageY")) || 50,
            profileImageZoom: parseFloat(fd.get("profileImageZoom")) || 100,
            backgroundImage: fd.get("backgroundImage"),
            familySize: parseInt(fd.get("familySize")) || 1,
            visitingReasons: fd.getAll("visitingReasons"),
            bio: fd.get("bio"),
            location: fd.get("location")
          }
        };

        const cardPreview = root.querySelector('#cardPreview');
        if (cardPreview) {
          if (updatedCard.name || updatedCard.card.profileImage || updatedCard.card.backgroundImage || updatedCard.card.bio) {
            cardPreview.innerHTML = renderAttendeeCard(updatedCard);
          }
        }
      };

      // Debounced version to prevent preview flicker on fast typing
      let _previewTimer = null;
      const debouncedPreview = () => {
        clearTimeout(_previewTimer);
        _previewTimer = setTimeout(updatePreview, 250);
      };

      // Add event listeners with debounce
      form.addEventListener('input', debouncedPreview);
      form.addEventListener('change', updatePreview); // Immediate on dropdowns/checkboxes

      // Initial preview update
      setTimeout(updatePreview, 100);
    }
    
  } else if (state.role === "vendor") {
    // Vendors can create their own personal business cards for swapping
    let attendee = state.attendees[0];
    
    // If no attendee exists, create a default one for the vendor
    if (!attendee) {
      const defaultAttendee = {
        id: `vendor_attendee_${Date.now()}`,
        name: '',
        email: '',
        phone: '',
        interests: [],
        shortCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        savedBusinessCards: []
      };
      upsertAttendee(defaultAttendee);
      attendee = defaultAttendee;
    }
    
    // Check if vendor has a personal business card
    const hasCardContent = attendee?.card && (attendee.name || attendee.card.profileImage || attendee.card.bio || attendee.card.location);
    
    if (!forceEdit && hasCardContent) {
      // Show vendor's personal business card (view mode)
      root.innerHTML = `
        <div class="container-glass fade-in">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold mb-2 text-glass">My Personal Business Card</h1>
            <p class="text-glass-secondary">For swapping with attendees • Create once, swap many times! 🔄</p>
          </div>
          
          ${renderAttendeeCard(attendee)}
          
          <div class="text-center mb-8">
            <button id="editCardBtn" class="glass-button px-6 py-3 text-glass font-medium">
              <ion-icon name="create-outline" class="mr-2"></ion-icon>
              Edit My Card
            </button>
          </div>
          
          <div class="glass-card p-6">
            <h3 class="text-lg font-semibold text-glass mb-4">📨 Cards Shared With Me</h3>
            <div class="grid gap-3">
              ${state.leads.filter(l => l.vendor_id === currentVendor()?.id && l.cardShared).map(lead => {
                const sharedAttendee = state.attendees.find(a => a.id === lead.attendee_id);
                return sharedAttendee?.card ? `
                  <div class="glass-card p-4">
                    ${renderAttendeeCard(sharedAttendee, true)}
                    <div class="mt-2 text-xs text-glass-secondary">Shared: ${new Date(lead.timestamp).toLocaleDateString()}</div>
                  </div>
                ` : `
                  <div class="glass-card p-4 text-glass-secondary">
                    <div class="font-semibold">${sharedAttendee?.name || 'Unknown'}</div>
                    <div class="text-xs">No business card available</div>
                  </div>
                `;
              }).join("") || `<div class='text-glass-secondary text-center py-8'>No attendee cards shared yet.<br><span class='text-xs'>Attendees can share their cards with you when they visit your booth.</span></div>`}
            </div>
          </div>
        </div>
      `;
      
      // Add edit button handler
      root.querySelector('#editCardBtn').onclick = () => {
        MyCard(root, true); // Re-render in edit mode
        setTimeout(() => {
          const cardForm = root.querySelector('#cardForm');
          if (cardForm) {
            cardForm.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      return;
    }
    
    // Show vendor card creation form (same as attendee but with vendor-specific messaging)
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2 text-glass">Create My Personal Business Card</h1>
          <p class="text-glass-secondary">Create your personal card to swap with attendees at your booth! 🔄</p>
          <div class="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p class="text-sm text-glass">💡 <strong>Vendor Tip:</strong> When attendees choose "Swap Cards," they'll save your business card too!</p>
          </div>
        </div>
        
        <div id="cardPreview">
          ${attendee?.card ? renderAttendeeCard(attendee) : `
            <div class="glass-card overflow-hidden mb-8 max-w-md mx-auto shadow-glass">
              <div class="h-40 bg-gradient-to-br from-slate-700 via-gray-800 to-blue-900"></div>
              <div class="p-6 relative">
                <div class="w-20 h-20 rounded-full border-4 border-white/50 absolute -top-10 left-6 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span class="text-white font-bold text-xl">?</span>
                </div>
                <div class="mt-12">
                  <div class="font-bold text-xl text-glass mb-1">Your Name</div>
                  <div class="text-sm text-glass-secondary mb-4 leading-relaxed">Your bio will appear here...</div>
                </div>
              </div>
            </div>
          `}
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
                <label class="block text-sm font-medium text-glass">Profile Image</label>
                <div class="space-y-2">
                  <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full" placeholder="Image URL (optional)">
                  <div class="flex items-center gap-2">
                    <input type="file" id="profileImageFile" accept="image/*" class="w-full" style="display:none">
                    <button type="button" id="uploadProfileImage" class="glass-button px-3 py-2">
                      <ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon>
                      Upload Image
                    </button>
                    <button type="button" id="editProfileImagePos" class="glass-button px-3 py-2 ${attendee?.card?.profileImage ? '' : 'opacity-50 cursor-not-allowed'}" ${attendee?.card?.profileImage ? '' : 'disabled'}>
                      <ion-icon name="move-outline" class="mr-1"></ion-icon>
                      Edit Position & Zoom
                    </button>
                  </div>
                </div>
                <!-- Hidden controls to persist position and zoom -->
                <input type="hidden" name="profileImageX" value="${typeof attendee?.card?.profileImageX === 'number' ? attendee.card.profileImageX : 50}">
                <input type="hidden" name="profileImageY" value="${typeof attendee?.card?.profileImageY === 'number' ? attendee.card.profileImageY : 50}">
                <input type="hidden" name="profileImageZoom" value="${typeof attendee?.card?.profileImageZoom === 'number' ? attendee.card.profileImageZoom : 100}">
              </div>
              
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Background Image</label>
                <div class="space-y-2">
                  <input name="backgroundImage" placeholder="https://your-background-url.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full" placeholder="Background URL (optional)">
                  <div class="flex items-center gap-2">
                    <input type="file" id="backgroundImageFile" accept="image/*" class="w-full" style="display:none">
                    <button type="button" id="uploadBackgroundImage" class="glass-button px-3 py-2">
                      <ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon>
                      Upload Background
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Full Name *</label>
                <input name="name" required value="${attendee?.name || ''}" placeholder="John Doe" class="w-full">
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Family Size</label>
                <input name="familySize" type="number" min="1" max="10" value="${attendee?.card?.familySize || 1}" class="w-full">
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Email Address *</label>
                <input name="email" required type="email" value="${attendee?.email || ''}" placeholder="john@example.com" class="w-full">
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Phone Number</label>
                <input name="phone" value="${attendee?.phone || ''}" placeholder="(555) 123-4567" class="w-full">
              </div>
            </div>
            
            <div class="space-y-2">
              <label class="block text-sm font-medium text-glass">Location</label>
              <input name="location" placeholder="Nashville, TN" value="${attendee?.card?.location || ''}" class="w-full">
            </div>
            
            <div class="space-y-2">
              <label class="block text-sm font-medium text-glass">About Me</label>
              <textarea name="bio" rows="4" placeholder="Tell attendees about yourself and your business expertise..." class="w-full resize-none">${attendee?.card?.bio || ''}</textarea>
            </div>
            
            <div class="flex gap-4 justify-center">
              <button type="submit" class="brand-bg px-8 py-3 rounded-lg text-lg font-semibold text-white">
                💾 Save My Business Card
              </button>
              <button type="button" class="glass-button px-6 py-3 rounded-lg" onclick="window.location.hash='/vendor-dashboard'">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add form submission handler (reuse existing logic)
    const cardForm = root.querySelector('#cardForm');
    if (cardForm) {
      // File upload handlers
      const profileImageFile = root.querySelector('#profileImageFile');
      const uploadProfileImage = root.querySelector('#uploadProfileImage');
      const backgroundImageFile = root.querySelector('#backgroundImageFile');
      const uploadBackgroundImage = root.querySelector('#uploadBackgroundImage');
      
      uploadProfileImage?.addEventListener('click', () => profileImageFile.click());
      uploadBackgroundImage?.addEventListener('click', () => backgroundImageFile.click());

      profileImageFile?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const { uploadImage } = await import('../firebase.js');
          const { compressProfileImage } = await import('../utils/imageResize.js');
          if (uploadProfileImage) { uploadProfileImage.disabled = true; uploadProfileImage.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Compressing...'; }
          const compressed = await compressProfileImage(file);
          if (uploadProfileImage) uploadProfileImage.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Uploading...';
          const url = await uploadImage(compressed, 'attendees', (pct) => {
            if (uploadProfileImage) uploadProfileImage.innerHTML = `<ion-icon name="hourglass-outline"></ion-icon> ${pct}%`;
          });
          root.querySelector('input[name="profileImage"]').value = url;
          if (uploadProfileImage) { uploadProfileImage.disabled = false; uploadProfileImage.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Image'; }
          updatePreview();
        } catch (err) {
          if (uploadProfileImage) { uploadProfileImage.disabled = false; uploadProfileImage.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Image'; }
          const { Toast } = await import('../utils/ui.js');
          Toast('Upload failed: ' + err.message);
        }
      });

      backgroundImageFile?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const { uploadImage } = await import('../firebase.js');
          const { compressBackgroundImage } = await import('../utils/imageResize.js');
          if (uploadBackgroundImage) { uploadBackgroundImage.disabled = true; uploadBackgroundImage.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Compressing...'; }
          const compressed = await compressBackgroundImage(file);
          if (uploadBackgroundImage) uploadBackgroundImage.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Uploading...';
          const url = await uploadImage(compressed, 'attendees', (pct) => {
            if (uploadBackgroundImage) uploadBackgroundImage.innerHTML = `<ion-icon name="hourglass-outline"></ion-icon> ${pct}%`;
          });
          root.querySelector('input[name="backgroundImage"]').value = url;
          if (uploadBackgroundImage) { uploadBackgroundImage.disabled = false; uploadBackgroundImage.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Background'; }
          updatePreview();
        } catch (err) {
          if (uploadBackgroundImage) { uploadBackgroundImage.disabled = false; uploadBackgroundImage.innerHTML = '<ion-icon name="cloud-upload-outline" class="mr-1"></ion-icon> Upload Background'; }
          const { Toast } = await import('../utils/ui.js');
          Toast('Upload failed: ' + err.message);
        }
      });
      
      // Real-time preview updates
      const updatePreview = () => {
        const formData = new FormData(cardForm);
        const cardData = {
          profileImage: formData.get('profileImage'),
          backgroundImage: formData.get('backgroundImage'),
          profileImageX: parseFloat(formData.get('profileImageX')),
          profileImageY: parseFloat(formData.get('profileImageY')),
          profileImageZoom: parseFloat(formData.get('profileImageZoom')),
          familySize: parseInt(formData.get('familySize')),
          visitingReasons: formData.getAll('visitingReasons'),
          bio: formData.get('bio'),
          location: formData.get('location')
        };

        const previewAttendee = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          interests: formData.getAll('interests'),
          card: cardData
        };

        root.querySelector('#cardPreview').innerHTML = renderAttendeeCard(previewAttendee);
      };

      // Debounced version to prevent flicker on fast typing
      let _vendorPreviewTimer = null;
      const debouncedVendorPreview = () => {
        clearTimeout(_vendorPreviewTimer);
        _vendorPreviewTimer = setTimeout(updatePreview, 250);
      };

      cardForm.addEventListener('input', debouncedVendorPreview);
      cardForm.addEventListener('change', updatePreview);
      
      // Form submission
      cardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(cardForm);
        
        const payload = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          interests: formData.getAll('interests'),
          card: {
            profileImage: formData.get('profileImage'),
            backgroundImage: formData.get('backgroundImage'),
            profileImageX: parseFloat(formData.get('profileImageX')) || 50,
            profileImageY: parseFloat(formData.get('profileImageY')) || 50,
            profileImageZoom: parseFloat(formData.get('profileImageZoom')) || 100,
            familySize: parseInt(formData.get('familySize')) || 1,
            visitingReasons: formData.getAll('visitingReasons'),
            bio: formData.get('bio'),
            location: formData.get('location')
          }
        };
        
        upsertAttendee(payload);
        Toast("Personal business card saved! Ready for swapping! 🔄");
        setTimeout(() => {
          window.location.hash = '/vendor-dashboard';
        }, 1500);
      });
      
      // Initialize preview
      setTimeout(updatePreview, 100);
    }
    
  } else if (state.role === "admin") {
    root.innerHTML = `
      <div class='p-8 text-center text-gray-400'>
        <h2 class="text-xl font-bold mb-4">Business Card System</h2>
        <p>View attendee and vendor card sharing statistics.</p>
        <button class="brand-bg px-4 py-2 rounded mt-4" onclick="window.location.hash='/admin'">Go to Admin Dashboard</button>
      </div>
    `;
  } else {
    // Fallback for unknown roles or edge cases
    root.innerHTML = `
      <div class='p-8 text-center'>
        <h2 class="text-xl font-bold mb-4 text-glass">My Card</h2>
        <p class="text-glass-secondary mb-4">Please select your role to access card features.</p>
        <button class="brand-bg px-4 py-2 rounded" onclick="window.location.hash='/role'">Select Role</button>
      </div>
    `;
  }
}

function renderAttendeeCard(attendee, compact = false) {
  if (!attendee.card) return "";
  
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
          <div class="w-20 h-20 rounded-full border-4 border-white/50 absolute -top-10 left-6 overflow-hidden backdrop-blur-sm bg-white/20">
            <img src="${card.profileImage}"
                 style="width:100%;height:100%;object-fit:cover;object-position:${(card.profileImageX ?? 50)}% ${(card.profileImageY ?? 50)}%;transform:scale(${(card.profileImageZoom ?? 100) / 100})"
                 onerror="this.style.display='none'"/>
          </div>
        ` : `
          <div class="w-20 h-20 rounded-full border-4 border-white/50 absolute -top-10 left-6 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
            <span class="text-white font-bold text-xl">${(attendee.name || 'A').charAt(0)}</span>
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

// Modal editor to adjust profile image X/Y within the circular mask
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#editProfileImagePos');
  if (!btn) return;
  const form = document.getElementById('cardForm');
  if (!form) return;
  const url = (form.querySelector('input[name="profileImage"]')?.value || '').trim();
  if (!url) return;
  const xInput = form.querySelector('input[name="profileImageX"]');
  const yInput = form.querySelector('input[name="profileImageY"]');
  const zoomInput = form.querySelector('input[name="profileImageZoom"]');
  const initX = parseFloat(xInput?.value || '50');
  const initY = parseFloat(yInput?.value || '50');
  const initZoom = parseFloat(zoomInput?.value || '100');
  const { Modal, closeModal } = await import('../utils/ui.js');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="space-y-4">
      <div class="text-lg font-semibold text-glass">Adjust Profile Image Position & Zoom</div>
      <div class="w-40 h-40 rounded-full overflow-hidden border border-white/20 mx-auto relative glass-card">
        <img id="posEditImg" src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:${initX}% ${initY}%;transform:scale(${initZoom / 100})" />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm text-gray-600 w-12">X</label>
        <input type="range" id="posX" min="0" max="100" value="${initX}" class="flex-1">
        <span id="posXVal" class="text-sm w-10 text-right">${initX}%</span>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm text-gray-600 w-12">Y</label>
        <input type="range" id="posY" min="0" max="100" value="${initY}" class="flex-1">
        <span id="posYVal" class="text-sm w-10 text-right">${initY}%</span>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm text-gray-600 w-12">Zoom</label>
        <input type="range" id="posZoom" min="50" max="200" value="${initZoom}" class="flex-1">
        <span id="posZoomVal" class="text-sm w-10 text-right">${initZoom}%</span>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button class="glass-button px-3 py-2" id="cancelEditPos">Cancel</button>
        <button class="brand-bg px-3 py-2" id="saveEditPos">Save</button>
      </div>
    </div>`;
  Modal(wrapper);
  const img = wrapper.querySelector('#posEditImg');
  const posX = wrapper.querySelector('#posX');
  const posY = wrapper.querySelector('#posY');
  const posZoom = wrapper.querySelector('#posZoom');
  const posXVal = wrapper.querySelector('#posXVal');
  const posYVal = wrapper.querySelector('#posYVal');
  const posZoomVal = wrapper.querySelector('#posZoomVal');
  const apply = () => {
    img.style.objectPosition = `${posX.value}% ${posY.value}%`;
    img.style.transform = `scale(${posZoom.value / 100})`;
    posXVal.textContent = `${posX.value}%`;
    posYVal.textContent = `${posY.value}%`;
    posZoomVal.textContent = `${posZoom.value}%`;
  };
  posX.oninput = apply; posY.oninput = apply; posZoom.oninput = apply; apply();
  wrapper.querySelector('#cancelEditPos').onclick = () => closeModal();
  wrapper.querySelector('#saveEditPos').onclick = () => {
    if (xInput) xInput.value = String(posX.value);
    if (yInput) yInput.value = String(posY.value);
    if (zoomInput) zoomInput.value = String(posZoom.value);
    closeModal();
  };
});
