import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function EditVendorProfile(root) {
  const { vendorLoginId, vendors } = getState();
  const vendor = vendors.find(v => v.id === vendorLoginId);
  if (!vendor) {
    root.innerHTML = `<div class='p-8 text-center text-glass-secondary'>Vendor not found.</div>`;
    return;
  }
  let profile = { ...vendor.profile };
  let dirty = false;
  function render() {
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-4 text-glass">Edit Booth Profile</h2>
        ${dirty?'<div class="mb-2 px-2 py-1 glass-card border border-yellow-400/30 text-glass rounded text-xs">You have unsaved changes</div>':''}
        <form id="profileForm" class="card p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Home Show Video URL</label>
            <input name="homeShowVideo" placeholder="https://youtube.com/..." value="${profile.homeShowVideo||''}" class="w-full">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Background Image URL</label>
            <input name="backgroundImage" placeholder="https://..." value="${profile.backgroundImage||''}" class="w-full">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Profile Image URL</label>
            <input name="profileImage" placeholder="https://..." value="${profile.profileImage||''}" class="w-full">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Bio</label>
            <textarea name="bio" placeholder="Company description and expertise..." class="w-full" rows="3">${profile.bio||''}</textarea>
          </div>
          
          <input name="introVideo" placeholder="Intro Video URL" value="${profile.introVideo||''}" class="w-full mb-2">
          <textarea name="description" placeholder="Description" maxlength="200" class="w-full mb-2">${profile.description||''}</textarea>
          <input name="specialOffer" placeholder="Special Offer" value="${profile.specialOffer||''}" class="w-full mb-2">
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Business Card Front URL</label>
            <input name="businessCardFront" placeholder="https://..." value="${profile.businessCardFront||''}" class="w-full">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-glass">Business Card Back URL</label>
            <input name="businessCardBack" placeholder="https://..." value="${profile.businessCardBack||''}" class="w-full">
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
          
          <div class="mb-2 text-glass">Social Media Links (only selected ones will show)</div>
          <input name="website" placeholder="Website" value="${profile.website||''}" class="w-full mb-2">
          <input name="facebook" placeholder="Facebook" value="${profile.facebook||''}" class="w-full mb-2">
          <input name="instagram" placeholder="Instagram" value="${profile.instagram||''}" class="w-full mb-2">
          <input name="twitter" placeholder="Twitter" value="${profile.twitter||''}" class="w-full mb-2">
          <input name="linkedin" placeholder="LinkedIn" value="${profile.linkedin||''}" class="w-full mb-2">
          <input name="tiktok" placeholder="TikTok" value="${profile.tiktok||''}" class="w-full mb-2">
          <input name="youtube" placeholder="YouTube" value="${profile.youtube||''}" class="w-full mb-2">
          <div class="flex gap-2 mt-2">
            <button class="brand-bg px-4 py-1 rounded flex-1">Save</button>
            <button type="button" class="px-3 py-1 glass-button rounded" id="previewBtn">Preview</button>
          </div>
        </form>
      </div>
    `;
    root.querySelector("#profileForm").oninput = () => { dirty = true; render(); };
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
  }
  render();
}
