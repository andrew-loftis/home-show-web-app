import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";
import { navigate } from "../router.js";

// Vendor categories (same as registration)
const CATEGORIES = [
  'Home Improvement',
  'Kitchen & Bath',
  'Outdoor Living',
  'Flooring',
  'Windows & Doors',
  'Roofing & Siding',
  'HVAC & Energy',
  'Security & Smart Home',
  'Interior Design',
  'Landscaping',
  'Solar & Renewable',
  'Furniture & Decor',
  'Pools & Spas',
  'Garage & Storage',
  'Cleaning Services',
  'Real Estate',
  'Financial Services',
  'Insurance',
  'Other'
];

export default async function EditVendorProfile(root) {
  const state = getState();
  
  // Try multiple ways to find the vendor
  let vendor = null;
  
  // Method 1: Check vendorLoginId (legacy vendor login flow)
  if (state.vendorLoginId && state.vendors) {
    vendor = state.vendors.find(v => v.id === state.vendorLoginId);
  }
  
  // Method 2: Check myVendor (set from VendorDashboard flow)
  if (!vendor && state.myVendor) {
    vendor = state.myVendor;
  }
  
  // Method 3: Query Firestore by ownerUid (most reliable)
  if (!vendor && state.user && !state.user.isAnonymous) {
    try {
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        vendor = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  }
  
  if (!vendor) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ion-icon name="alert-circle-outline" class="text-3xl text-red-400"></ion-icon>
          </div>
          <h2 class="text-xl font-bold mb-2 text-glass">Vendor Not Found</h2>
          <p class="text-glass-secondary mb-6">Please make sure you're logged in with your vendor account.</p>
          <button class="glass-button px-6 py-3" onclick="window.location.hash='/vendor-dashboard'">
            Go to Dashboard
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  // Track both core vendor data and profile data
  let profile = { ...(vendor.profile || {}) };
  let coreData = {
    name: vendor.name || '',
    category: vendor.category || '',
    contactEmail: vendor.contactEmail || '',
    contactPhone: vendor.contactPhone || '',
    website: vendor.website || '',
    socialMedia: { ...(vendor.socialMedia || {}) }
  };
  let dirty = false;

  const uploadImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const saveProfile = async () => {
    try {
      const state = getState();
      
      // Check permissions - user must be owner or admin
      const isOwner = state.user && vendor.ownerUid === state.user.uid;
      const canWrite = isOwner || state.isAdmin;
      
      if (!canWrite) {
        Toast("You don't have permission to edit this vendor");
        return;
      }
      
      // Validate required fields
      if (!coreData.name.trim()) {
        Toast("Company name is required");
        return;
      }
      if (!coreData.category) {
        Toast("Category is required");
        return;
      }
      
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { doc, updateDoc, serverTimestamp, deleteField } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      // Build update data
      const updateData = { 
        name: coreData.name.trim(),
        category: coreData.category,
        contactEmail: coreData.contactEmail.trim(),
        contactPhone: coreData.contactPhone.trim(),
        website: coreData.website.trim(),
        socialMedia: coreData.socialMedia,
        profile: { ...profile }, 
        updatedAt: serverTimestamp()
      };
      
      // If vendor was previously denied, clear the denial and set back to pending
      if (vendor.denied) {
        updateData.denied = deleteField();
        updateData.denialReason = deleteField();
        updateData.deniedAt = deleteField();
        updateData.approved = false; // Set back to pending for re-review
      }
      
      // Save both core data and profile data
      await updateDoc(doc(db, 'vendors', vendor.id), updateData);
      
      // Update local vendor object
      const wasResubmitted = vendor.denied;
      vendor.name = coreData.name.trim();
      vendor.category = coreData.category;
      vendor.contactEmail = coreData.contactEmail.trim();
      vendor.contactPhone = coreData.contactPhone.trim();
      vendor.website = coreData.website.trim();
      vendor.socialMedia = coreData.socialMedia;
      vendor.profile = { ...profile };
      vendor.denied = false;
      
      dirty = false;
      
      if (wasResubmitted) {
        Toast("Application resubmitted for review!");
        // Navigate to dashboard to show pending status
        setTimeout(() => navigate('/vendor-dashboard'), 1000);
      } else {
        Toast("Profile updated successfully!");
        render();
      }
    } catch (e) {
      console.error('Save error:', e);
      Toast("Failed to save profile: " + (e.message || 'Unknown error'));
    }
  };

  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <button class="flex items-center gap-2 text-glass-secondary hover:text-glass mb-4 transition-colors" onclick="window.location.hash='/vendor-dashboard'">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Back to Dashboard</span>
        </button>
        <div class="mb-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-glass">Edit Business Profile</h2>
          <div class="flex gap-2">
            <button id="saveBtn" class="brand-bg px-4 py-2 rounded text-sm ${dirty ? '' : 'opacity-50'}" ${dirty ? '' : 'disabled'}>
              ${dirty ? 'Save Changes' : 'Saved'}
            </button>
            <button id="previewBtn" class="glass-button px-4 py-2 rounded text-sm">Preview</button>
          </div>
        </div>
        
        ${dirty ? '<div class="mb-4 px-3 py-2 bg-yellow-500/20 border border-yellow-400/30 text-yellow-200 rounded text-sm flex items-center gap-2"><ion-icon name="alert-circle-outline"></ion-icon> You have unsaved changes</div>' : ''}
        
        <!-- Live Preview -->
        <div class="glass-panel p-4 mb-6">
          <h3 class="text-sm font-medium mb-3 text-center text-glass">Live Preview</h3>
          <div class="relative border rounded-lg overflow-hidden min-h-64" style="background: ${profile.backgroundImage ? 'url(' + profile.backgroundImage + ') center/cover' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}">
            <div class="p-6 text-center">
              <div class="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white shadow-lg ${profile.profileImage ? '' : 'bg-gray-300 flex items-center justify-center'}">
                ${profile.profileImage ? '<img src="' + profile.profileImage + '" class="w-full h-full object-cover">' : '<span class="text-gray-600 text-xl">👤</span>'}
              </div>
              <h2 class="text-white text-xl font-bold mb-2 drop-shadow-lg">${coreData.name || 'Business Name'}</h2>
              <p class="text-white text-sm drop-shadow max-w-md mx-auto">${profile.bio || 'Add your business bio...'}</p>
            </div>
            <div class="mx-4 mb-4 bg-white bg-opacity-95 rounded-lg shadow-lg p-4">
              <h3 class="font-semibold text-lg mb-2 text-gray-800">About Our Business</h3>
              <p class="text-sm text-gray-700 leading-relaxed mb-4">${profile.description || 'Add your business description...'}</p>
              ${profile.specialOffer ? '<div class="bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-lg border-l-4 border-yellow-400"><h4 class="font-semibold text-yellow-800 mb-1">Special Offer!</h4><p class="text-sm text-yellow-700">' + profile.specialOffer + '</p></div>' : ''}
            </div>
          </div>
        </div>
        
        <div class="grid gap-6">
          <!-- CORE BUSINESS DETAILS (NEW SECTION) -->
          <div class="glass-card p-4">
            <div class="flex items-center gap-2 mb-4">
              <ion-icon name="business-outline" class="text-xl text-primary"></ion-icon>
              <h3 class="font-semibold text-glass">Business Details</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Company Name *</label>
                <input type="text" id="companyName" value="${coreData.name}" placeholder="Your Company Name" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20 focus:border-primary focus:outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Category *</label>
                <select id="categorySelect" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20 focus:border-primary focus:outline-none">
                  <option value="" disabled>Select a category</option>
                  ${CATEGORIES.map(c => `<option value="${c}" ${coreData.category === c ? 'selected' : ''} class="text-gray-800">${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Contact Email</label>
                <input type="email" id="contactEmail" value="${coreData.contactEmail}" placeholder="contact@example.com" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20 focus:border-primary focus:outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Contact Phone</label>
                <input type="tel" id="contactPhone" value="${coreData.contactPhone}" placeholder="(555) 123-4567" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20 focus:border-primary focus:outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-2 text-glass">Website</label>
                <input type="url" id="website" value="${coreData.website}" placeholder="https://www.yoursite.com" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20 focus:border-primary focus:outline-none">
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-white/10">
              <label class="block text-sm font-medium mb-2 text-glass">Social Media (optional)</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="flex items-center gap-2">
                  <ion-icon name="logo-facebook" class="text-blue-400"></ion-icon>
                  <input type="url" id="socialFacebook" value="${coreData.socialMedia.facebook || ''}" placeholder="Facebook URL" class="flex-1 border rounded px-3 py-2 bg-white/10 text-glass border-white/20 text-sm">
                </div>
                <div class="flex items-center gap-2">
                  <ion-icon name="logo-instagram" class="text-pink-400"></ion-icon>
                  <input type="url" id="socialInstagram" value="${coreData.socialMedia.instagram || ''}" placeholder="Instagram URL" class="flex-1 border rounded px-3 py-2 bg-white/10 text-glass border-white/20 text-sm">
                </div>
                <div class="flex items-center gap-2">
                  <ion-icon name="logo-twitter" class="text-sky-400"></ion-icon>
                  <input type="url" id="socialTwitter" value="${coreData.socialMedia.twitter || ''}" placeholder="X/Twitter URL" class="flex-1 border rounded px-3 py-2 bg-white/10 text-glass border-white/20 text-sm">
                </div>
              </div>
            </div>
            <div class="mt-3 text-xs text-glass-secondary">* Required fields</div>
          </div>
          
          <!-- Background Image -->
          <div class="glass-card p-4">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="image-outline" class="text-xl text-primary"></ion-icon>
              <h3 class="font-semibold text-glass">Background Image</h3>
            </div>
            <div class="space-y-3">
              <div class="h-24 bg-gray-100 rounded border-2 border-dashed flex items-center justify-center cursor-pointer" style="background: ${profile.backgroundImage ? 'url(' + profile.backgroundImage + ') center/cover' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}" onclick="document.getElementById('backgroundFile').click()">
                ${!profile.backgroundImage ? '<span class="text-gray-500">Click to upload</span>' : ''}
              </div>
              <input type="file" id="backgroundFile" accept="image/*" style="display:none">
              <div class="flex gap-2">
                <button id="uploadBackground" class="glass-button px-4 py-2">Upload Background</button>
                ${profile.backgroundImage ? '<button id="removeBackground" class="glass-button px-4 py-2 text-red-400">Remove</button>' : ''}
              </div>
            </div>
          </div>
          
          <!-- Profile Section -->
          <div class="glass-card p-4">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="person-circle-outline" class="text-xl text-primary"></ion-icon>
              <h3 class="font-semibold text-glass">Profile Section</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Profile Image</label>
                <div class="text-center">
                  <div class="w-20 h-20 rounded-full mx-auto mb-2 overflow-hidden cursor-pointer ${profile.profileImage ? '' : 'bg-gray-300 flex items-center justify-center'}" onclick="document.getElementById('profileFile').click()">
                    ${profile.profileImage ? '<img src="' + profile.profileImage + '" class="w-full h-full object-cover">' : '<span class="text-gray-600 text-xl">👤</span>'}
                  </div>
                  <input type="file" id="profileFile" accept="image/*" style="display:none">
                  <button id="uploadProfile" class="glass-button px-3 py-1 text-sm">Change Photo</button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Bio / Tagline</label>
                <textarea id="profileBio" placeholder="A short tagline about your business..." class="w-full border rounded px-3 py-2 resize-none bg-white/10 text-glass border-white/20" rows="4">${profile.bio || ''}</textarea>
              </div>
            </div>
          </div>
          
          <!-- Business Description & Offer -->
          <div class="glass-card p-4">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="document-text-outline" class="text-xl text-primary"></ion-icon>
              <h3 class="font-semibold text-glass">About & Offers</h3>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Business Description</label>
                <textarea id="businessDesc" placeholder="Detailed description of your products/services..." class="w-full border rounded px-3 py-2 resize-none bg-white/10 text-glass border-white/20" rows="4">${profile.description || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Special Offer</label>
                <textarea id="specialOffer" placeholder="Exclusive trade show special..." class="w-full border rounded px-3 py-2 resize-none bg-white/10 text-glass border-white/20" rows="2">${profile.specialOffer || ''}</textarea>
                <div class="text-xs text-glass-secondary mt-1">This will be highlighted in a special callout box on your landing page</div>
              </div>
            </div>
          </div>
          
          <!-- Gallery Images -->
          <div class="glass-card p-4">
            <div class="flex items-center gap-2 mb-3">
              <ion-icon name="images-outline" class="text-xl text-primary"></ion-icon>
              <h3 class="font-semibold text-glass">Gallery Images</h3>
            </div>
            <p class="text-glass-secondary text-sm mb-4">Showcase your products, services, and past projects. Add up to 8 images.</p>
            
            <!-- Gallery Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              ${(profile.gallery || []).map((img, idx) => `
                <div class="relative aspect-square rounded-lg overflow-hidden group">
                  <img src="${img}" class="w-full h-full object-cover">
                  <button data-gallery-remove="${idx}" class="absolute top-2 right-2 w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ion-icon name="close" class="text-white"></ion-icon>
                  </button>
                </div>
              `).join('')}
              ${(profile.gallery || []).length < 8 ? `
                <div class="aspect-square rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all" onclick="document.getElementById('galleryFile').click()">
                  <ion-icon name="add-circle-outline" class="text-3xl text-glass-secondary mb-1"></ion-icon>
                  <span class="text-xs text-glass-secondary">Add Image</span>
                </div>
              ` : ''}
            </div>
            
            <input type="file" id="galleryFile" accept="image/*" multiple style="display:none">
            <div class="flex items-center gap-3">
              <button id="uploadGallery" class="glass-button px-4 py-2 text-sm flex items-center gap-2">
                <ion-icon name="cloud-upload-outline"></ion-icon>
                Upload Images
              </button>
              <span class="text-xs text-glass-secondary">${(profile.gallery || []).length}/8 images</span>
            </div>
          </div>
        </div>
        
        <!-- Floating Save Button for Mobile -->
        <div class="fixed bottom-20 right-4 md:hidden ${dirty ? '' : 'hidden'}">
          <button id="saveBtnFloat" class="brand-bg px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <ion-icon name="save-outline"></ion-icon>
            Save
          </button>
        </div>
      </div>
    `;

    const saveBtn = root.querySelector("#saveBtn");
    const saveBtnFloat = root.querySelector("#saveBtnFloat");
    const previewBtn = root.querySelector("#previewBtn");
    
    if (saveBtn && dirty) {
      saveBtn.onclick = saveProfile;
    }
    
    if (saveBtnFloat && dirty) {
      saveBtnFloat.onclick = saveProfile;
    }
    
    if (previewBtn) {
      previewBtn.onclick = () => {
        window.location.hash = '/vendor/' + vendor.id;
      };
    }
    
    // Core data field handlers
    const companyName = root.querySelector('#companyName');
    const categorySelect = root.querySelector('#categorySelect');
    const contactEmail = root.querySelector('#contactEmail');
    const contactPhone = root.querySelector('#contactPhone');
    const website = root.querySelector('#website');
    const socialFacebook = root.querySelector('#socialFacebook');
    const socialInstagram = root.querySelector('#socialInstagram');
    const socialTwitter = root.querySelector('#socialTwitter');
    
    if (companyName) {
      companyName.oninput = () => {
        coreData.name = companyName.value;
        dirty = true;
        // Update preview in real-time
        const previewName = root.querySelector('.drop-shadow-lg');
        if (previewName) previewName.textContent = companyName.value || 'Business Name';
      };
    }
    
    if (categorySelect) {
      categorySelect.onchange = () => {
        coreData.category = categorySelect.value;
        dirty = true;
      };
    }
    
    if (contactEmail) {
      contactEmail.oninput = () => {
        coreData.contactEmail = contactEmail.value;
        dirty = true;
      };
    }
    
    if (contactPhone) {
      contactPhone.oninput = () => {
        coreData.contactPhone = contactPhone.value;
        dirty = true;
      };
    }
    
    if (website) {
      website.oninput = () => {
        coreData.website = website.value;
        dirty = true;
      };
    }
    
    if (socialFacebook) {
      socialFacebook.oninput = () => {
        coreData.socialMedia.facebook = socialFacebook.value;
        dirty = true;
      };
    }
    
    if (socialInstagram) {
      socialInstagram.oninput = () => {
        coreData.socialMedia.instagram = socialInstagram.value;
        dirty = true;
      };
    }
    
    if (socialTwitter) {
      socialTwitter.oninput = () => {
        coreData.socialMedia.twitter = socialTwitter.value;
        dirty = true;
      };
    }

    const backgroundFile = root.querySelector('#backgroundFile');
    const uploadBackground = root.querySelector('#uploadBackground');
    const removeBackground = root.querySelector('#removeBackground');
    const profileFile = root.querySelector('#profileFile');
    const uploadProfile = root.querySelector('#uploadProfile');
    
    if (uploadBackground) {
      uploadBackground.onclick = () => backgroundFile.click();
    }
    
    if (removeBackground) {
      removeBackground.onclick = () => {
        profile.backgroundImage = '';
        dirty = true;
        render();
      };
    }
    
    if (uploadProfile) {
      uploadProfile.onclick = () => profileFile.click();
    }
    
    if (backgroundFile) {
      backgroundFile.onchange = async (e) => {
        if (e.target.files[0]) {
          const dataUrl = await uploadImage(e.target.files[0]);
          profile.backgroundImage = dataUrl;
          dirty = true;
          render();
        }
      };
    }

    if (profileFile) {
      profileFile.onchange = async (e) => {
        if (e.target.files[0]) {
          const dataUrl = await uploadImage(e.target.files[0]);
          profile.profileImage = dataUrl;
          dirty = true;
          render();
        }
      };
    }

    const profileBio = root.querySelector('#profileBio');
    const businessDesc = root.querySelector('#businessDesc');
    const specialOfferInput = root.querySelector('#specialOffer');
    
    if (profileBio) {
      profileBio.oninput = () => {
        profile.bio = profileBio.value;
        dirty = true;
      };
    }
    
    if (businessDesc) {
      businessDesc.oninput = () => {
        profile.description = businessDesc.value;
        dirty = true;
      };
    }
    
    if (specialOfferInput) {
      specialOfferInput.oninput = () => {
        profile.specialOffer = specialOfferInput.value;
        dirty = true;
      };
    }
    
    // Gallery handlers
    const galleryFile = root.querySelector('#galleryFile');
    const uploadGallery = root.querySelector('#uploadGallery');
    
    if (uploadGallery) {
      uploadGallery.onclick = () => galleryFile.click();
    }
    
    if (galleryFile) {
      galleryFile.onchange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        
        // Initialize gallery array if needed
        if (!profile.gallery) profile.gallery = [];
        
        // Limit to 8 total images
        const slotsAvailable = 8 - profile.gallery.length;
        const filesToAdd = files.slice(0, slotsAvailable);
        
        for (const file of filesToAdd) {
          const dataUrl = await uploadImage(file);
          profile.gallery.push(dataUrl);
        }
        
        dirty = true;
        render();
        
        if (files.length > slotsAvailable) {
          Toast(`Only ${slotsAvailable} image(s) added. Maximum 8 images allowed.`);
        }
      };
    }
    
    // Gallery remove buttons
    root.querySelectorAll('[data-gallery-remove]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.galleryRemove, 10);
        if (profile.gallery && profile.gallery[idx] !== undefined) {
          profile.gallery.splice(idx, 1);
          dirty = true;
          render();
        }
      };
    });
  }
  
  render();
}
