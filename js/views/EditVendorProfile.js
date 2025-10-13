import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function EditVendorProfile(root) {
  const { vendorLoginId, vendors } = getState();
  const vendor = vendors.find(v => v.id === vendorLoginId);
  if (!vendor) {
    root.innerHTML = `<div class='p-8 text-center text-gray-400'>Vendor not found.</div>`;
    return;
  }
  let profile = { ...vendor.profile };
  let dirty = false;
  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-4">Edit Vendor Profile</h2>
        ${dirty?'<div class="mb-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">You have unsaved changes</div>':''}
        <form id="profileForm" class="card p-4 space-y-5">
          <div>
            <div class="font-semibold mb-2">Business Info</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Business Name</label>
                <input name="businessName" placeholder="Company, LLC" value="${vendor.name||''}" class="w-full px-3 py-2 border rounded">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Contact Email</label>
                <input name="contactEmail" type="email" placeholder="you@company.com" value="${vendor.contactEmail||''}" class="w-full px-3 py-2 border rounded">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Contact Phone</label>
                <input name="contactPhone" placeholder="(555) 555-5555" value="${vendor.contactPhone||''}" class="w-full px-3 py-2 border rounded">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Booth</label>
                <input name="booth" placeholder="A12" value="${vendor.booth||''}" class="w-full px-3 py-2 border rounded">
              </div>
            </div>
            <div class="mt-3">
              <label class="block text-sm font-medium mb-1">Business Address</label>
              <input name="businessAddress" placeholder="123 Main St, City, ST 12345" value="${profile.businessAddress||''}" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Home Show Video URL</label>
            <input name="homeShowVideo" placeholder="https://youtube.com/..." value="${profile.homeShowVideo||''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Background Image</label>
            <div class="flex gap-2 items-center">
              <input name="backgroundImage" placeholder="https://..." value="${profile.backgroundImage||''}" class="w-full px-3 py-2 border rounded">
              <label class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer inline-flex items-center gap-2">
                <span class="upload-label-text">Upload</span>
                <input type="file" accept="image/*" class="hidden" id="vendorUploadBackground">
              </label>
            </div>
            <div class="text-xs text-gray-500 mt-1">Paste a URL or upload a file from your device.</div>
            <div class="flex items-center gap-3 mt-2">
              <img id="vendorPreviewBackground" src="${profile.backgroundImage||''}" class="w-28 h-16 rounded object-cover border" style="display:${profile.backgroundImage?'block':'none'}">
              <a id="vendorLinkBackground" href="${profile.backgroundImage||'#'}" target="_blank" class="text-xs text-primary break-all" style="display:${profile.backgroundImage?'inline':'none'}">${profile.backgroundImage||''}</a>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Profile Image</label>
            <div class="flex gap-2 items-center">
              <input name="profileImage" placeholder="https://..." value="${profile.profileImage||''}" class="w-full px-3 py-2 border rounded">
              <label class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer inline-flex items-center gap-2">
                <span class="upload-label-text">Upload</span>
                <input type="file" accept="image/*" class="hidden" id="vendorUploadProfile">
              </label>
            </div>
            <div class="text-xs text-gray-500 mt-1">Paste a URL or upload a file from your device.</div>
            <div class="flex items-center gap-3 mt-2">
              <img id="vendorPreviewProfile" src="${profile.profileImage||''}" class="w-16 h-16 rounded object-cover border" style="display:${profile.profileImage?'block':'none'}">
              <a id="vendorLinkProfile" href="${profile.profileImage||'#'}" target="_blank" class="text-xs text-primary break-all" style="display:${profile.profileImage?'inline':'none'}">${profile.profileImage||''}</a>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Bio</label>
            <textarea name="bio" placeholder="Company description and expertise..." class="w-full px-3 py-2 border rounded" rows="3">${profile.bio||''}</textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">What We Do (Services)</label>
              <textarea name="services" placeholder="Kitchens, baths, roofing, etc..." class="w-full px-3 py-2 border rounded" rows="3">${profile.services||''}</textarea>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">How We Work (Approach)</label>
              <textarea name="approach" placeholder="Our process, warranties, quality guarantees..." class="w-full px-3 py-2 border rounded" rows="3">${profile.approach||''}</textarea>
            </div>
          </div>
          
          <input name="introVideo" placeholder="Intro Video URL" value="${profile.introVideo||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <textarea name="description" placeholder="Description" maxlength="200" class="w-full mb-2 px-3 py-2 border rounded">${profile.description||''}</textarea>
          <input name="specialOffer" placeholder="Special Offer" value="${profile.specialOffer||''}" class="w-full mb-2 px-3 py-2 border rounded">
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Business Card Front</label>
            <div class="flex gap-2 items-center">
              <input name="businessCardFront" placeholder="https://..." value="${profile.businessCardFront||''}" class="w-full px-3 py-2 border rounded">
              <label class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer inline-flex items-center gap-2">
                <span class="upload-label-text">Upload</span>
                <input type="file" accept="image/*" class="hidden" id="vendorUploadCardFront">
              </label>
            </div>
            <div class="flex items-center gap-3 mt-2">
              <img id="vendorPreviewCardFront" src="${profile.businessCardFront||''}" class="w-24 h-16 rounded object-cover border" style="display:${profile.businessCardFront?'block':'none'}">
              <a id="vendorLinkCardFront" href="${profile.businessCardFront||'#'}" target="_blank" class="text-xs text-primary break-all" style="display:${profile.businessCardFront?'inline':'none'}">${profile.businessCardFront||''}</a>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Business Card Back</label>
            <div class="flex gap-2 items-center">
              <input name="businessCardBack" placeholder="https://..." value="${profile.businessCardBack||''}" class="w-full px-3 py-2 border rounded">
              <label class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer inline-flex items-center gap-2">
                <span class="upload-label-text">Upload</span>
                <input type="file" accept="image/*" class="hidden" id="vendorUploadCardBack">
              </label>
            </div>
            <div class="flex items-center gap-3 mt-2">
              <img id="vendorPreviewCardBack" src="${profile.businessCardBack||''}" class="w-24 h-16 rounded object-cover border" style="display:${profile.businessCardBack?'block':'none'}">
              <a id="vendorLinkCardBack" href="${profile.businessCardBack||'#'}" target="_blank" class="text-xs text-primary break-all" style="display:${profile.businessCardBack?'inline':'none'}">${profile.businessCardBack||''}</a>
            </div>
          </div>
          
          <div class="mb-4">
            <div class="mb-2 text-sm font-medium">Select Your Social Media</div>
            <div class="grid grid-cols-2 gap-2">
              ${["website","facebook","instagram","twitter","linkedin","tiktok","youtube"].map(social => `
                <label class='inline-flex items-center gap-1'>
                  <input type='checkbox' name='selectedSocials' value='${social}' ${(profile.selectedSocials || []).includes(social) ? 'checked' : ''} class='accent-primary'> 
                  <span class="capitalize">${social}</span>
                </label>
              `).join("")}
            </div>
          </div>
          
          <div class="mb-2">Social Media Links (only selected ones will show)</div>
          <input name="website" placeholder="Website" value="${profile.website||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="facebook" placeholder="Facebook" value="${profile.facebook||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="instagram" placeholder="Instagram" value="${profile.instagram||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="twitter" placeholder="Twitter" value="${profile.twitter||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="linkedin" placeholder="LinkedIn" value="${profile.linkedin||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="tiktok" placeholder="TikTok" value="${profile.tiktok||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <input name="youtube" placeholder="YouTube" value="${profile.youtube||''}" class="w-full mb-2 px-3 py-2 border rounded">
          <div class="flex gap-2 mt-2">
            <button class="brand-bg px-4 py-1 rounded flex-1">Save</button>
            <button type="button" class="px-3 py-1 bg-gray-100 rounded" id="previewBtn">Preview</button>
          </div>
        </form>
      </div>
    `;
  root.querySelector("#profileForm").oninput = () => { dirty = true; };
    root.querySelector("#profileForm").onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const formData = Object.fromEntries(fd.entries());
      formData.selectedSocials = fd.getAll("selectedSocials");
      // Map business info into vendor top-level and profile
      const vendorUpdates = {
        name: formData.businessName || vendor.name || null,
        contactEmail: formData.contactEmail || vendor.contactEmail || null,
        contactPhone: formData.contactPhone || vendor.contactPhone || null,
        booth: formData.booth || vendor.booth || null
      };
      Object.assign(profile, {
        homeShowVideo: formData.homeShowVideo,
        backgroundImage: formData.backgroundImage,
        profileImage: formData.profileImage,
        bio: formData.bio,
        introVideo: formData.introVideo,
        description: formData.description,
        specialOffer: formData.specialOffer,
        businessCardFront: formData.businessCardFront,
        businessCardBack: formData.businessCardBack,
        website: formData.website,
        facebook: formData.facebook,
        instagram: formData.instagram,
        twitter: formData.twitter,
        linkedin: formData.linkedin,
        tiktok: formData.tiktok,
        youtube: formData.youtube,
        selectedSocials: formData.selectedSocials,
        businessAddress: formData.businessAddress,
        services: formData.services,
        approach: formData.approach
      });
      // Save to Firestore if owner or admin
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
          name: vendorUpdates.name,
          contactEmail: vendorUpdates.contactEmail,
          contactPhone: vendorUpdates.contactPhone,
          booth: vendorUpdates.booth,
          updatedAt: serverTimestamp() 
        });
        vendor.profile = { ...profile };
        vendor.name = vendorUpdates.name;
        vendor.contactEmail = vendorUpdates.contactEmail;
        vendor.contactPhone = vendorUpdates.contactPhone;
        vendor.booth = vendorUpdates.booth;
        dirty = false;
        Toast("Profile saved!");
        render();
      } catch (e) {
        Toast("Failed to save profile");
      }
    };
    root.querySelector("#previewBtn").onclick = () => {
      window.location.hash = `/vendor/${vendor.id}`;
    };
    // Wire upload handlers
    wireVendorUploads(root, vendor.id);
    // Sync preview thumbnails for links
    syncVendorImagePreviews(root);
  }
  render();
}

function wireVendorUploads(root, vendorId) {
  import('../firebase.js').then(({ uploadImage }) => {
    const bgFile = root.querySelector('#vendorUploadBackground');
    const profileFile = root.querySelector('#vendorUploadProfile');
    const cardFrontFile = root.querySelector('#vendorUploadCardFront');
    const cardBackFile = root.querySelector('#vendorUploadCardBack');
    const bgInput = root.querySelector('input[name="backgroundImage"]');
    const profileInput = root.querySelector('input[name="profileImage"]');
    const cardFrontInput = root.querySelector('input[name="businessCardFront"]');
    const cardBackInput = root.querySelector('input[name="businessCardBack"]');
    const withProgress = (labelEl) => (pct) => {
      if (!labelEl) return;
      const span = labelEl.querySelector('.upload-label-text');
      if (!span) return;
      span.textContent = pct >= 100 ? 'Processing…' : `Uploading ${pct}%`;
      if (pct >= 100) setTimeout(()=>{ span.textContent='Upload'; }, 800);
    };
    const doUpload = async (fileInputEl, targetInputEl) => {
      const file = fileInputEl.files?.[0]; if (!file) return;
      const label = fileInputEl.closest('label');
      try {
        const url = await uploadImage(file, `vendors/${vendorId}`, withProgress(label));
        targetInputEl.value = url;
        // mark form dirty but avoid re-render loop
        targetInputEl.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {
        Toast('Upload failed');
      }
    };
    if (bgFile) bgFile.onchange = () => doUpload(bgFile, bgInput);
    if (profileFile) profileFile.onchange = () => doUpload(profileFile, profileInput);
    if (cardFrontFile) cardFrontFile.onchange = () => doUpload(cardFrontFile, cardFrontInput);
    if (cardBackFile) cardBackFile.onchange = () => doUpload(cardBackFile, cardBackInput);
  });
}

function syncVendorImagePreviews(root) {
  const pairs = [
    ['backgroundImage', '#vendorPreviewBackground', '#vendorLinkBackground'],
    ['profileImage', '#vendorPreviewProfile', '#vendorLinkProfile'],
    ['businessCardFront', '#vendorPreviewCardFront', '#vendorLinkCardFront'],
    ['businessCardBack', '#vendorPreviewCardBack', '#vendorLinkCardBack']
  ];
  const set = (name, imgSel, linkSel) => {
    const input = root.querySelector(`input[name="${name}"]`);
    const img = root.querySelector(imgSel);
    const link = root.querySelector(linkSel);
    const apply = () => {
      const url = (input?.value || '').trim();
      if (img && link) {
        if (url) {
          img.src = url;
          img.style.display = 'block';
          link.href = url;
          link.textContent = url;
          link.style.display = 'inline';
        } else {
          img.style.display = 'none';
          link.style.display = 'none';
        }
      }
    };
    if (input) {
      input.addEventListener('input', apply);
      apply();
    }
  };
  pairs.forEach(([n, i, l]) => set(n, i, l));
}
