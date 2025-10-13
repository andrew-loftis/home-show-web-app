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
        <h2 class="text-xl font-bold mb-4">Edit Booth Profile</h2>
        ${dirty?'<div class="mb-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">You have unsaved changes</div>':''}
        <form id="profileForm" class="card p-4">
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
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Bio</label>
            <textarea name="bio" placeholder="Company description and expertise..." class="w-full px-3 py-2 border rounded" rows="3">${profile.bio||''}</textarea>
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
      Object.assign(profile, formData);
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
        await updateDoc(doc(db, 'vendors', vendor.id), { profile: { ...profile }, updatedAt: serverTimestamp() });
        vendor.profile = { ...profile };
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
