import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function EditVendorProfile(root) {
  const { vendorLoginId, vendors } = getState();
  const vendor = vendors.find(v => v.id === vendorLoginId);
  
  if (!vendor) {
    root.innerHTML = '<div class="p-8 text-center text-glass-secondary">Vendor not found. Please login first.</div>';
    return;
  }
  
  let profile = { ...vendor.profile };
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
      const isOwner = state.user && state.user.uid && state.myVendor && state.myVendor.id === vendor.id;
      const canWrite = isOwner || state.isAdmin;
      
      if (!canWrite) {
        Toast("You don't have permission to edit this vendor");
        return;
      }
      
      const { getDb } = await import("../firebase.js");
      const db = getDb();
      const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
      
      await updateDoc(doc(db, 'vendors', vendor.id), { 
        profile: { ...profile }, 
        updatedAt: serverTimestamp() 
      });
      
      vendor.profile = { ...profile };
      dirty = false;
      Toast("Profile updated successfully!");
      render();
    } catch (e) {
      console.error('Save error:', e);
      Toast("Failed to save profile");
    }
  };

  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <div class="mb-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-glass">Edit Landing Page</h2>
          <div class="flex gap-2">
            <button id="saveBtn" class="brand-bg px-4 py-2 rounded text-sm ${dirty ? '' : 'opacity-50'}" ${dirty ? '' : 'disabled'}>
              ${dirty ? 'Save Changes' : 'Saved'}
            </button>
            <button id="previewBtn" class="glass-button px-4 py-2 rounded text-sm">Preview</button>
          </div>
        </div>
        
        ${dirty ? '<div class="mb-4 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">You have unsaved changes</div>' : ''}
        
        <div class="glass-panel p-4 mb-6">
          <h3 class="text-sm font-medium mb-3 text-center text-glass">Live Preview</h3>
          <div class="relative border rounded-lg overflow-hidden min-h-64" style="background: ${profile.backgroundImage ? 'url(' + profile.backgroundImage + ') center/cover' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}">
            <div class="p-6 text-center">
              <div class="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-4 border-white shadow-lg ${profile.profileImage ? '' : 'bg-gray-300 flex items-center justify-center'}">
                ${profile.profileImage ? '<img src="' + profile.profileImage + '" class="w-full h-full object-cover">' : '<span class="text-gray-600 text-xl">👤</span>'}
              </div>
              <h2 class="text-white text-xl font-bold mb-2 drop-shadow-lg">${vendor.businessName || 'Business Name'}</h2>
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
          <div class="glass-card p-4">
            <h3 class="font-semibold mb-3 text-glass">Background Image</h3>
            <div class="space-y-3">
              <div class="h-24 bg-gray-100 rounded border-2 border-dashed flex items-center justify-center cursor-pointer" style="background: ${profile.backgroundImage ? 'url(' + profile.backgroundImage + ') center/cover' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}" onclick="document.getElementById('backgroundFile').click()">
                ${!profile.backgroundImage ? '<span class="text-gray-500">Click to upload</span>' : ''}
              </div>
              <input type="file" id="backgroundFile" accept="image/*" style="display:none">
              <div class="flex gap-2">
                <button id="uploadBackground" class="glass-button px-4 py-2">Upload Background</button>
                ${profile.backgroundImage ? '<button id="removeBackground" class="glass-button px-4 py-2 text-red-600">Remove</button>' : ''}
              </div>
            </div>
          </div>
          
          <div class="glass-card p-4">
            <h3 class="font-semibold mb-3 text-glass">Profile Section</h3>
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
                <label class="block text-sm font-medium mb-2 text-glass">Bio</label>
                <textarea id="profileBio" placeholder="Tell visitors about your business..." class="w-full border rounded px-3 py-2 resize-none" rows="4">${profile.bio || ''}</textarea>
              </div>
            </div>
          </div>
          
          <div class="glass-card p-4">
            <h3 class="font-semibold mb-3 text-glass">Business Information</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Business Description</label>
                <textarea id="businessDesc" placeholder="Detailed description of your products/services..." class="w-full border rounded px-3 py-2 resize-none" rows="4">${profile.description || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-glass">Special Offer</label>
                <textarea id="specialOffer" placeholder="Exclusive trade show special..." class="w-full border rounded px-3 py-2 resize-none" rows="2">${profile.specialOffer || ''}</textarea>
                <div class="text-xs text-gray-500 mt-1">This will be highlighted in a special callout box</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const saveBtn = root.querySelector("#saveBtn");
    const previewBtn = root.querySelector("#previewBtn");
    
    if (saveBtn && dirty) {
      saveBtn.onclick = saveProfile;
    }
    
    if (previewBtn) {
      previewBtn.onclick = () => {
        window.location.hash = '/vendor/' + vendor.id;
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
  }
  
  render();
}
