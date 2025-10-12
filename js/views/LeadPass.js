import { getState, upsertAttendee, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function MyCard(root) {
  const state = getState();
  if (state.role === "attendee") {
    const attendee = state.attendees[0];
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-4 brand">My Business Card</h2>
        ${attendee?.card ? renderAttendeeCard(attendee) : ""}
        <form id="cardForm" class="card p-4">
          <div class="font-semibold mb-4">Create/Edit Your Business Card</div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Profile Image URL</label>
            <input name="profileImage" placeholder="https://..." value="${attendee?.card?.profileImage || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Background Image URL</label>
            <input name="backgroundImage" placeholder="https://..." value="${attendee?.card?.backgroundImage || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1">Name</label>
              <input name="name" required value="${attendee?.name || ''}" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Family Size</label>
              <input name="familySize" type="number" min="1" max="10" value="${attendee?.card?.familySize || 1}" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Email</label>
            <input name="email" required type="email" value="${attendee?.email || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Phone</label>
            <input name="phone" value="${attendee?.phone || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Location</label>
            <input name="location" placeholder="Nashville, TN" value="${attendee?.card?.location || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Bio</label>
            <textarea name="bio" rows="3" placeholder="Tell vendors about yourself and your home project..." class="w-full px-3 py-2 border rounded">${attendee?.card?.bio || ''}</textarea>
          </div>
          
          <div class="mb-4">
            <div class="mb-2 text-sm font-medium">Reasons for visiting the home show</div>
            <div class="grid grid-cols-2 gap-2">
              ${["Building a home","Renovating","Needing new gutters","Floor plans","Kitchen remodel","Bathroom remodel","Solar installation","Roofing repair","HVAC upgrade","Landscaping","Windows replacement","Just browsing"].map(reason => `
                <label class='inline-flex items-center gap-1 text-sm'>
                  <input type='checkbox' name='visitingReasons' value='${reason}' ${(attendee?.card?.visitingReasons || []).includes(reason) ? 'checked' : ''} class='accent-primary'> 
                  <span>${reason}</span>
                </label>
              `).join("")}
            </div>
          </div>
          
          <div class="mb-4">
            <div class="mb-2 text-sm font-medium">Interests</div>
            <div class="flex flex-wrap gap-2">
              ${["Kitchen","Bath","Landscaping","Windows","Solar","Roofing","Flooring","HVAC","Painting"].map(i => `
                <label class='inline-flex items-center gap-1 text-sm'>
                  <input type='checkbox' name='interests' value='${i}' ${(attendee?.interests || []).includes(i) ? 'checked' : ''} class='accent-primary'> 
                  <span>${i}</span>
                </label>
              `).join("")}
            </div>
          </div>
          
          <button class="brand-bg px-4 py-2 rounded w-full font-semibold text-white mt-4">Save Business Card</button>
        </form>
        
        ${attendee?.card ? `
          <div class="mt-4 text-center">
            <button class="px-4 py-2 bg-gray-100 rounded" onclick="window.location.hash='/saved-vendors'">My Saved Vendors</button>
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
          backgroundImage: fd.get("backgroundImage"),
          familySize: parseInt(fd.get("familySize")) || 1,
          visitingReasons: fd.getAll("visitingReasons"),
          bio: fd.get("bio"),
          location: fd.get("location")
        }
      };
      upsertAttendee(payload);
      Toast("Business card saved!");
      setTimeout(() => window.location.reload(), 800);
    };
    
  } else if (state.role === "vendor") {
    const vendor = currentVendor();
    root.innerHTML = `
      <div class="p-6 fade-in">
        <h2 class="text-xl font-bold mb-2 brand">My Business Cards</h2>
        <div class="mb-4 text-gray-600">View attendee cards that have been shared with you</div>
        
        <div class="grid gap-3 mb-6">
          ${state.leads.filter(l => l.vendor_id === vendor?.id && l.cardShared).map(lead => {
            const attendee = state.attendees.find(a => a.id === lead.attendee_id);
            return attendee?.card ? `
              <div class="card p-4">
                ${renderAttendeeCard(attendee, true)}
                <div class="mt-2 text-xs text-gray-500">Shared: ${new Date(lead.timestamp).toLocaleDateString()}</div>
              </div>
            ` : `
              <div class="card p-4 text-gray-400">
                <div class="font-semibold">${attendee?.name || 'Unknown'}</div>
                <div class="text-xs">No business card available</div>
              </div>
            `;
          }).join("") || `<div class='text-gray-400 text-center py-8'>No business cards shared yet.<br><span class='text-xs'>Attendees can share their cards with you at your booth.</span></div>`}
        </div>
        
        <div class="font-semibold mb-2">Quick Actions</div>
        <div class="flex gap-2">
          <button class="px-3 py-1 bg-gray-100 rounded" onclick="window.location.hash='/vendor-leads'">View All Leads</button>
          <button class="px-3 py-1 bg-gray-100 rounded" onclick="window.location.hash='/edit-vendor'">Edit My Profile</button>
        </div>
      </div>
    `;
    
  } else if (state.role === "organizer") {
    root.innerHTML = `
      <div class='p-8 text-center text-gray-400'>
        <h2 class="text-xl font-bold mb-4">Business Card System</h2>
        <p>View attendee and vendor card sharing statistics.</p>
        <button class="brand-bg px-4 py-2 rounded mt-4" onclick="window.location.hash='/admin'">Go to Admin Dashboard</button>
      </div>
    `;
  }
}

function renderAttendeeCard(attendee, compact = false) {
  if (!attendee.card) return "";
  
  const card = attendee.card;
  return `
    <div class="card overflow-hidden mb-4 max-w-sm mx-auto">
      ${card.backgroundImage ? `
        <div class="h-32 bg-cover bg-center relative" style="background-image: url('${card.backgroundImage}')">
          <div class="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>
      ` : `<div class="h-32 bg-gradient-to-br from-primary to-dark"></div>`}
      
      <div class="p-4 relative">
        ${card.profileImage ? `
          <img src="${card.profileImage}" class="w-16 h-16 rounded-full border-4 border-white absolute -top-8 left-4" onerror="this.style.display='none'">
        ` : `
          <div class="w-16 h-16 rounded-full border-4 border-white absolute -top-8 left-4 bg-gray-300 flex items-center justify-center">
            <span class="text-white font-bold">${attendee.name.charAt(0)}</span>
          </div>
        `}
        
        <div class="mt-8">
          <div class="font-bold text-lg">${attendee.name}</div>
          ${card.location ? `<div class="text-xs text-gray-500 mb-2">${card.location}</div>` : ""}
          ${card.familySize ? `<div class="text-xs text-gray-600 mb-2">Family of ${card.familySize}</div>` : ""}
          
          ${card.bio && !compact ? `<div class="text-sm text-gray-700 mb-3">${card.bio}</div>` : ""}
          
          ${card.visitingReasons?.length ? `
            <div class="mb-3">
              <div class="text-xs text-gray-500 mb-1">Visiting for:</div>
              <div class="flex flex-wrap gap-1">
                ${card.visitingReasons.slice(0, compact ? 2 : 4).map(reason => `
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${reason}</span>
                `).join("")}
                ${compact && card.visitingReasons.length > 2 ? `<span class="text-xs text-gray-400">+${card.visitingReasons.length - 2} more</span>` : ""}
              </div>
            </div>
          ` : ""}
          
          ${!compact ? `
            <div class="flex gap-2 text-xs text-gray-500">
              <span>${attendee.email}</span>
              ${attendee.phone ? `<span>•</span><span>${attendee.phone}</span>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}
