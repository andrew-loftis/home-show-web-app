import { getState, upsertAttendee, currentVendor } from "../store.js";
import { Toast } from "../utils/ui.js";

export default function MyCard(root) {
  const state = getState();
  if (state.role === "attendee") {
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
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2 text-glass">My Business Card</h1>
          <p class="text-glass-secondary">Create and customize your digital business card</p>
        </div>
        
        ${attendee?.card ? renderAttendeeCard(attendee) : ""}
        
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
                <label class="block text-sm font-medium text-glass">Profile Image URL</label>
                <input name="profileImage" placeholder="https://your-image-url.com" value="${attendee?.card?.profileImage || ''}" class="w-full">
              </div>
              
              <div class="space-y-2">
                <label class="block text-sm font-medium text-glass">Background Image URL</label>
                <input name="backgroundImage" placeholder="https://your-background.com" value="${attendee?.card?.backgroundImage || ''}" class="w-full">
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
            <span class="text-white font-bold text-xl">${attendee.name.charAt(0)}</span>
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
